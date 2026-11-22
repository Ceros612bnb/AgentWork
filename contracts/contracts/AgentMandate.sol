// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IAgentID} from "./interfaces/IAgentID.sol";

/// @title AgentMandate
/// @notice An on-chain "Know Your Agent" layer for AI agent wallets on BNB Chain.
///
///         A human (the principal) gives an AI agent (the operator, an Agentic Wallet holding a Binance
///         Agent ID) a small budget and a mandate: which contracts and functions it may call, how much per
///         action and per day, until when, and above which amount the human must approve. The contract
///         enforces the mandate, so a hijacked agent (prompt or memory injection) cannot step outside it.
///         Out-of-scope attempts are recorded instead of silently failing, and too many of them revoke the
///         mandate automatically. Agents may delegate to sub-agents, but only with a narrower scope.
///         Anyone can check who is accountable for an agent, what it may do, and what it has done.
///
///         Admin permissions: NONE. No owner, no fee, no pause, no upgrade. Funds belong to principals and
///         can only be withdrawn by them, to themselves. The contract never pulls funds or tokens.
contract AgentMandate is ReentrancyGuard {
    // ------------------------------------------------------------ constants

    /// @notice Selector meaning "plain BNB transfer" (empty calldata).
    bytes4 public constant TRANSFER = 0x00000000;
    /// @notice Selector meaning "any function of this target".
    bytes4 public constant ANY = 0xffffffff;
    uint8 public constant MAX_DEPTH = 3;
    uint256 public constant MAX_PERMISSIONS = 16;
    uint256 public constant DAY = 1 days;

    // -------------------------------------------------------------- types

    enum Reason {
        None,
        NoAgentID, // operator no longer holds an Agent ID
        Inactive, // this mandate or an ancestor is revoked or expired
        NotAllowed, // target/function not permitted at some level
        OverPerTxCap,
        OverDailyCap,
        InsufficientFunds
    }

    enum Status {
        Executed,
        Blocked,
        Proposed
    }

    struct Terms {
        uint128 perTxCap; // max BNB (wei) per action
        uint128 dailyCap; // max BNB (wei) per UTC day
        uint128 coSignAbove; // actions above this need the principal's approval (type(uint128).max = never)
        uint64 expiry; // unix time
        uint32 maxViolations; // out-of-scope attempts before automatic revocation (0 = never)
    }

    struct Permission {
        address target;
        bytes4 selector; // TRANSFER, ANY, or a function selector
    }

    struct Mandate {
        address principal; // accountable human wallet (the root's principal for sub-mandates)
        address operator; // Agent ID wallet acting under this mandate
        uint256 parent; // 0 for a root mandate
        Terms terms;
        uint8 depth; // 0 for a root
        bool revoked;
        uint32 violations;
        uint64 day; // UTC day of spentToday
        uint128 spentToday;
        uint256 balance; // BNB held (root mandates only)
        uint64 createdBlock; // lets auditors scan this mandate's events from here
    }

    struct Proposal {
        uint256 mandateId;
        address target;
        uint256 value;
        bytes data;
        bool done;
    }

    struct Record {
        uint64 executed;
        uint64 blocked;
        uint32 autoRevoked; // mandates revoked because of violations
        uint256 spent; // total BNB spent through mandates
    }

    // ------------------------------------------------------------ storage

    IAgentID public immutable agentIdNft;

    uint256 public mandateCount; // ids start at 1
    mapping(uint256 => Mandate) private _mandates;
    mapping(uint256 => Permission[]) private _permissions;
    mapping(uint256 => mapping(bytes32 => bool)) private _allowed;
    mapping(address => uint256[]) private _byOperator;
    mapping(address => uint256[]) private _byPrincipal;
    mapping(address => Record) private _records;

    uint256 public proposalCount; // ids start at 1
    mapping(uint256 => Proposal) private _proposals;

    // ------------------------------------------------------------- events

    event MandateCreated(uint256 indexed id, address indexed principal, address indexed operator, uint256 deposit);
    event Delegated(uint256 indexed id, uint256 indexed parent, address indexed operator);
    event Deposited(uint256 indexed id, uint256 amount);
    event Withdrawn(uint256 indexed id, uint256 amount);
    event Executed(uint256 indexed id, address indexed operator, address indexed target, bytes4 selector, uint256 value);
    event Blocked(
        uint256 indexed id, address indexed operator, address indexed target, bytes4 selector, uint256 value, Reason reason
    );
    event Proposed(uint256 indexed proposalId, uint256 indexed id, address indexed target, uint256 value);
    event Approved(uint256 indexed proposalId);
    event Rejected(uint256 indexed proposalId);
    event Revoked(uint256 indexed id, address indexed by, bool automatic);

    // ------------------------------------------------------------- errors

    error NoAgentID();
    error BadTerms();
    error BadPermissions();
    error NotPrincipal();
    error NotOperator();
    error NotAuthorized();
    error NotRoot();
    error TooDeep();
    error NotNarrower();
    error InactiveMandate();
    error UnknownMandate();
    error UnknownProposal();
    error ProposalClosed();
    error OutOfScope(Reason reason);
    error InsufficientBalance();
    error CallFailed(bytes returndata);
    error TransferFailed();

    constructor(IAgentID agentIdNft_) {
        agentIdNft = agentIdNft_;
    }

    // ------------------------------------------------------- principal API

    /// @notice Create a root mandate for `operator` (an Agent ID wallet), funded with msg.value.
    ///         The caller becomes the accountable principal and must not be the operator itself.
    function create(address operator, Terms calldata terms, Permission[] calldata perms)
        external
        payable
        returns (uint256 id)
    {
        if (operator == address(0) || operator == msg.sender) revert BadTerms();
        if (!isAgent(operator)) revert NoAgentID();
        _validateTerms(terms);
        id = _store(msg.sender, operator, 0, 0, terms, perms);
        _mandates[id].balance = msg.value;
        _byPrincipal[msg.sender].push(id);
        emit MandateCreated(id, msg.sender, operator, msg.value);
    }

    function deposit(uint256 id) external payable {
        Mandate storage m = _root(id);
        if (msg.sender != m.principal) revert NotPrincipal();
        m.balance += msg.value;
        emit Deposited(id, msg.value);
    }

    /// @notice Withdraw from a root mandate, always to the principal. Works even after revocation.
    function withdraw(uint256 id, uint256 amount) external nonReentrant {
        Mandate storage m = _root(id);
        if (msg.sender != m.principal) revert NotPrincipal();
        if (amount > m.balance) revert InsufficientBalance();
        m.balance -= amount;
        (bool ok,) = payable(m.principal).call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Withdrawn(id, amount);
    }

    /// @notice Revoke a mandate and, implicitly, every mandate delegated from it.
    ///         Allowed for the principal, the operator that delegated it, or the operator itself (resign).
    function revoke(uint256 id) external {
        Mandate storage m = _get(id);
        bool parentOperator = m.parent != 0 && _mandates[m.parent].operator == msg.sender;
        if (msg.sender != m.principal && msg.sender != m.operator && !parentOperator) revert NotAuthorized();
        m.revoked = true;
        emit Revoked(id, msg.sender, false);
    }

    /// @notice Approve a proposal (an in-scope action above the co-sign threshold). Re-checked at approval.
    function approve(uint256 proposalId) external nonReentrant {
        Proposal storage p = _proposal(proposalId);
        Mandate storage m = _mandates[p.mandateId];
        if (msg.sender != m.principal) revert NotPrincipal();
        p.done = true;
        Reason r = _check(p.mandateId, p.target, p.value, p.data);
        if (r != Reason.None) revert OutOfScope(r);
        emit Approved(proposalId);
        _perform(p.mandateId, m.operator, p.target, p.value, p.data);
    }

    function reject(uint256 proposalId) external {
        Proposal storage p = _proposal(proposalId);
        Mandate storage m = _mandates[p.mandateId];
        if (msg.sender != m.principal && msg.sender != m.operator) revert NotAuthorized();
        p.done = true;
        emit Rejected(proposalId);
    }

    // -------------------------------------------------------- operator API

    /// @notice Act under a mandate. In scope and under the co-sign threshold: executes. In scope but above
    ///         it: becomes a proposal for the principal. Out of scope: recorded as Blocked (no revert), and
    ///         the mandate is revoked automatically once it reaches maxViolations.
    function execute(uint256 id, address target, uint256 value, bytes calldata data)
        external
        nonReentrant
        returns (Status status, uint256 proposalId)
    {
        Mandate storage m = _get(id);
        if (msg.sender != m.operator) revert NotOperator();

        Reason r = _check(id, target, value, data);
        if (r != Reason.None) {
            _block(id, m, target, _selector(data), value, r);
            return (Status.Blocked, 0);
        }
        if (value > _coSignThreshold(id)) {
            proposalId = ++proposalCount;
            _proposals[proposalId] = Proposal(id, target, value, data, false);
            emit Proposed(proposalId, id, target, value);
            return (Status.Proposed, proposalId);
        }
        _perform(id, msg.sender, target, value, data);
        return (Status.Executed, 0);
    }

    /// @notice Delegate a narrower mandate to a sub-agent: caps, co-sign threshold, expiry and permissions
    ///         may only shrink, and its spending also counts against every ancestor.
    function delegate(uint256 parentId, address subOperator, Terms calldata terms, Permission[] calldata perms)
        external
        returns (uint256 id)
    {
        Mandate storage p = _get(parentId);
        if (msg.sender != p.operator) revert NotOperator();
        if (_inactive(parentId)) revert InactiveMandate();
        if (p.depth + 1 > MAX_DEPTH) revert TooDeep();
        if (subOperator == address(0) || subOperator == p.principal) revert BadTerms();
        if (!isAgent(subOperator)) revert NoAgentID();
        _validateTerms(terms);
        Terms storage pt = p.terms;
        if (
            terms.perTxCap > pt.perTxCap || terms.dailyCap > pt.dailyCap || terms.coSignAbove > pt.coSignAbove
                || terms.expiry > pt.expiry || (pt.maxViolations != 0 && (terms.maxViolations == 0 || terms.maxViolations > pt.maxViolations))
        ) revert NotNarrower();
        for (uint256 i = 0; i < perms.length; i++) {
            Permission calldata q = perms[i];
            bool ok = q.selector == ANY
                ? _allowed[parentId][_key(q.target, ANY)]
                : _allowedAt(parentId, q.target, q.selector);
            if (!ok) revert NotNarrower();
        }
        id = _store(p.principal, subOperator, parentId, p.depth + 1, terms, perms);
        emit Delegated(id, parentId, subOperator);
    }

    // -------------------------------------------------------------- views

    function isAgent(address a) public view returns (bool) {
        return a != address(0) && agentIdNft.balanceOf(a) > 0;
    }

    /// @notice Would this action pass right now? Returns the outcome and, if blocked, why.
    function check(uint256 id, address target, uint256 value, bytes calldata data)
        external
        view
        returns (Status status, Reason reason)
    {
        _get(id);
        reason = _check(id, target, value, data);
        if (reason != Reason.None) return (Status.Blocked, reason);
        return (value > _coSignThreshold(id) ? Status.Proposed : Status.Executed, Reason.None);
    }

    /// @notice Who answers for this agent: the principal, the acting Agent ID wallet, and the root mandate.
    function accountableFor(uint256 id)
        external
        view
        returns (address principal, address operator, uint256 root, bool operatorHoldsAgentID, bool active)
    {
        Mandate storage m = _get(id);
        return (m.principal, m.operator, _rootId(id), isAgent(m.operator), !_inactive(id));
    }

    function getMandate(uint256 id) external view returns (Mandate memory) {
        return _get(id);
    }

    function permissionsOf(uint256 id) external view returns (Permission[] memory) {
        return _permissions[id];
    }

    function isActive(uint256 id) external view returns (bool) {
        _get(id);
        return !_inactive(id);
    }

    /// @notice BNB this mandate can still spend today, the minimum across itself and its ancestors (0 if inactive).
    function remainingToday(uint256 id) public view returns (uint256 left) {
        _get(id);
        if (_inactive(id)) return 0;
        left = type(uint256).max;
        uint256 cur = id;
        while (cur != 0) {
            Mandate storage m = _mandates[cur];
            uint256 room = m.terms.dailyCap - _spent(m);
            if (room < left) left = room;
            cur = m.parent;
        }
        uint256 bal = _mandates[_rootId(id)].balance;
        if (bal < left) left = bal;
    }

    function recordOf(address operator) external view returns (Record memory) {
        return _records[operator];
    }

    function mandatesOf(address operator) external view returns (uint256[] memory) {
        return _byOperator[operator];
    }

    function mandatesByPrincipal(address principal) external view returns (uint256[] memory) {
        return _byPrincipal[principal];
    }

    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return _proposals[proposalId];
    }

    // ----------------------------------------------------------- internal

    function _store(
        address principal,
        address operator,
        uint256 parent,
        uint8 depth,
        Terms calldata terms,
        Permission[] calldata perms
    ) private returns (uint256 id) {
        if (perms.length == 0 || perms.length > MAX_PERMISSIONS) revert BadPermissions();
        id = ++mandateCount;
        Mandate storage m = _mandates[id];
        m.principal = principal;
        m.operator = operator;
        m.parent = parent;
        m.depth = depth;
        m.terms = terms;
        m.createdBlock = uint64(block.number);
        for (uint256 i = 0; i < perms.length; i++) {
            if (perms[i].target == address(0) || perms[i].target == address(this)) revert BadPermissions();
            bytes32 k = _key(perms[i].target, perms[i].selector);
            if (_allowed[id][k]) revert BadPermissions(); // duplicate
            _allowed[id][k] = true;
            _permissions[id].push(perms[i]);
        }
        _byOperator[operator].push(id);
    }

    function _validateTerms(Terms calldata t) private view {
        if (t.expiry <= block.timestamp || t.perTxCap == 0 || t.perTxCap > t.dailyCap) revert BadTerms();
    }

    /// @dev Every level from `id` up to the root must allow the action.
    function _check(uint256 id, address target, uint256 value, bytes memory data) private view returns (Reason) {
        if (!isAgent(_mandates[id].operator)) return Reason.NoAgentID;
        if (target == address(this) || (data.length > 0 && data.length < 4)) return Reason.NotAllowed;
        bytes4 sel = _selector(data);
        Reason worst = Reason.None;
        uint256 cur = id;
        while (cur != 0) {
            Mandate storage m = _mandates[cur];
            if (m.revoked || block.timestamp >= m.terms.expiry) return Reason.Inactive;
            Reason r = Reason.None;
            if (!_allowedAt(cur, target, sel)) r = Reason.NotAllowed;
            else if (value > m.terms.perTxCap) r = Reason.OverPerTxCap;
            else if (_spent(m) + value > m.terms.dailyCap) r = Reason.OverDailyCap;
            if (r != Reason.None && (worst == Reason.None || uint8(r) < uint8(worst))) worst = r;
            cur = m.parent;
        }
        if (worst != Reason.None) return worst;
        if (_mandates[_rootId(id)].balance < value) return Reason.InsufficientFunds;
        return Reason.None;
    }

    function _perform(uint256 id, address operator, address target, uint256 value, bytes memory data) private {
        uint256 cur = id;
        uint64 today = uint64(block.timestamp / DAY);
        while (cur != 0) {
            Mandate storage m = _mandates[cur];
            if (m.day != today) {
                m.day = today;
                m.spentToday = 0;
            }
            m.spentToday += uint128(value);
            if (m.parent == 0) m.balance -= value;
            cur = m.parent;
        }
        Record storage rec = _records[operator];
        rec.executed += 1;
        rec.spent += value;
        emit Executed(id, operator, target, _selector(data), value);
        (bool ok, bytes memory ret) = target.call{value: value}(data);
        if (!ok) revert CallFailed(ret);
    }

    function _block(uint256 id, Mandate storage m, address target, bytes4 sel, uint256 value, Reason r) private {
        _records[m.operator].blocked += 1;
        emit Blocked(id, m.operator, target, sel, value, r);
        if (r == Reason.Inactive || r == Reason.NoAgentID || r == Reason.InsufficientFunds) return;
        m.violations += 1;
        if (m.terms.maxViolations != 0 && m.violations >= m.terms.maxViolations && !m.revoked) {
            m.revoked = true;
            _records[m.operator].autoRevoked += 1;
            emit Revoked(id, address(this), true);
        }
    }

    function _coSignThreshold(uint256 id) private view returns (uint256 t) {
        t = type(uint256).max;
        uint256 cur = id;
        while (cur != 0) {
            uint256 c = _mandates[cur].terms.coSignAbove;
            if (c < t) t = c;
            cur = _mandates[cur].parent;
        }
    }

    function _inactive(uint256 id) private view returns (bool) {
        uint256 cur = id;
        while (cur != 0) {
            Mandate storage m = _mandates[cur];
            if (m.revoked || block.timestamp >= m.terms.expiry) return true;
            cur = m.parent;
        }
        return false;
    }

    function _spent(Mandate storage m) private view returns (uint256) {
        return m.day == uint64(block.timestamp / DAY) ? m.spentToday : 0;
    }

    function _allowedAt(uint256 id, address target, bytes4 sel) private view returns (bool) {
        return _allowed[id][_key(target, sel)] || (sel != TRANSFER && _allowed[id][_key(target, ANY)]);
    }

    function _selector(bytes memory data) private pure returns (bytes4) {
        return data.length < 4 ? TRANSFER : bytes4(data);
    }

    function _key(address target, bytes4 sel) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(target, sel));
    }

    function _rootId(uint256 id) private view returns (uint256) {
        while (_mandates[id].parent != 0) id = _mandates[id].parent;
        return id;
    }

    function _get(uint256 id) private view returns (Mandate storage m) {
        m = _mandates[id];
        if (m.operator == address(0)) revert UnknownMandate();
    }

    function _root(uint256 id) private view returns (Mandate storage m) {
        m = _get(id);
        if (m.parent != 0) revert NotRoot();
    }

    function _proposal(uint256 proposalId) private view returns (Proposal storage p) {
        p = _proposals[proposalId];
        if (p.mandateId == 0) revert UnknownProposal();
        if (p.done) revert ProposalClosed();
    }
}
