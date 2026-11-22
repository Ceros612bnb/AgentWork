// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAgentID} from "./interfaces/IAgentID.sol";
import {AgentMandate} from "./AgentMandate.sol";

/// @title StarterFaucet
/// @notice Lets any Binance Agent ID holder try Agent Mandate in one transaction: calling claim() from the
///         agent's wallet creates a small, pre-funded "starter" mandate for it, with this contract as the
///         principal. The budget can only buy demo research notes (whose payments are burned), so nobody
///         profits from it and nothing can be withdrawn by the agent. One claim per Agent ID wallet.
///
///         Admin permissions (disclosed): the immutable `sponsor` may withdraw the unused pool, revoke a
///         starter mandate, and pull its unused budget back into the pool. It cannot move anyone else's funds.
contract StarterFaucet {
    AgentMandate public immutable mandate;
    IAgentID public immutable agentIdNft;
    address public immutable desk;
    bytes4 public immutable deskSelector;
    address public immutable sponsor;

    uint128 public constant BUDGET = 0.00005 ether; // five demo notes
    uint128 public constant PER_TX_CAP = 0.00001 ether;
    uint128 public constant DAILY_CAP = 0.00005 ether;
    uint32 public constant MAX_VIOLATIONS = 3;
    uint64 public constant DURATION = 14 days;

    mapping(address => uint256) public starterOf; // agent wallet => mandate id (0 = none)
    address[] private _claimants;

    event Claimed(address indexed agent, uint256 indexed mandateId);
    event Funded(address indexed from, uint256 amount);

    error NoAgentID();
    error AlreadyClaimed();
    error PoolEmpty();
    error NotSponsor();
    error TransferFailed();

    constructor(AgentMandate mandate_, IAgentID agentIdNft_, address desk_, bytes4 deskSelector_, address sponsor_) {
        mandate = mandate_;
        agentIdNft = agentIdNft_;
        desk = desk_;
        deskSelector = deskSelector_;
        sponsor = sponsor_;
    }

    /// @notice Called from the agent's own Agentic Wallet. Creates its starter mandate.
    function claim() external returns (uint256 id) {
        if (agentIdNft.balanceOf(msg.sender) == 0) revert NoAgentID();
        if (starterOf[msg.sender] != 0) revert AlreadyClaimed();
        if (address(this).balance < BUDGET) revert PoolEmpty();
        AgentMandate.Terms memory t = AgentMandate.Terms({
            perTxCap: PER_TX_CAP,
            dailyCap: DAILY_CAP,
            coSignAbove: type(uint128).max,
            expiry: uint64(block.timestamp + DURATION),
            maxViolations: MAX_VIOLATIONS
        });
        AgentMandate.Permission[] memory p = new AgentMandate.Permission[](1);
        p[0] = AgentMandate.Permission({target: desk, selector: deskSelector});
        id = mandate.create{value: BUDGET}(msg.sender, t, p);
        starterOf[msg.sender] = id;
        _claimants.push(msg.sender);
        emit Claimed(msg.sender, id);
    }

    function fund() external payable {
        emit Funded(msg.sender, msg.value);
    }

    /// @dev Receives budgets pulled back from starter mandates.
    receive() external payable {}

    function claimantCount() external view returns (uint256) {
        return _claimants.length;
    }

    function claimants(uint256 offset, uint256 limit) external view returns (address[] memory page) {
        uint256 total = _claimants.length;
        if (offset >= total) return new address[](0);
        uint256 end = offset + limit > total ? total : offset + limit;
        page = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) page[i - offset] = _claimants[i];
    }

    function poolBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // ----------------------------------------------------------- sponsor

    function withdrawPool(uint256 amount) external {
        if (msg.sender != sponsor) revert NotSponsor();
        (bool ok,) = payable(sponsor).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    function revokeStarter(uint256 id) external {
        if (msg.sender != sponsor) revert NotSponsor();
        mandate.revoke(id);
    }

    /// @notice Pull a starter mandate's unused budget back into the pool (e.g. after it expired).
    function reclaim(uint256 id, uint256 amount) external {
        if (msg.sender != sponsor) revert NotSponsor();
        mandate.withdraw(id, amount);
    }
}
