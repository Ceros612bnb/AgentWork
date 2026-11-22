import { parseAbi } from "viem";

export const mandateAbi = parseAbi([
  "struct Terms { uint128 perTxCap; uint128 dailyCap; uint128 coSignAbove; uint64 expiry; uint32 maxViolations; }",
  "struct Permission { address target; bytes4 selector; }",
  "struct Mandate { address principal; address operator; uint256 parent; Terms terms; uint8 depth; bool revoked; uint32 violations; uint64 day; uint128 spentToday; uint256 balance; uint64 createdBlock; }",
  "struct Record { uint64 executed; uint64 blocked; uint32 autoRevoked; uint256 spent; }",
  "function isAgent(address a) view returns (bool)",
  "function mandateCount() view returns (uint256)",
  "function getMandate(uint256 id) view returns (Mandate)",
  "function permissionsOf(uint256 id) view returns (Permission[])",
  "function isActive(uint256 id) view returns (bool)",
  "function remainingToday(uint256 id) view returns (uint256)",
  "function check(uint256 id,address target,uint256 value,bytes data) view returns (uint8 status,uint8 reason)",
  "function accountableFor(uint256 id) view returns (address principal,address operator,uint256 root,bool operatorHoldsAgentID,bool active)",
  "function recordOf(address operator) view returns (Record)",
  "function mandatesOf(address operator) view returns (uint256[])",
  "function execute(uint256 id,address target,uint256 value,bytes data) returns (uint8 status,uint256 proposalId)",
  "function delegate(uint256 parentId,address subOperator,Terms terms,Permission[] perms) returns (uint256)",
  "function revoke(uint256 id)",
]);

export const deskAbi = parseAbi([
  "function price() view returns (uint256)",
  "function buyNote(uint256 topic) payable",
]);

export const faucetAbi = parseAbi([
  "function claim() returns (uint256)",
  "function starterOf(address agent) view returns (uint256)",
  "function poolBalance() view returns (uint256)",
  "function BUDGET() view returns (uint128)",
]);

export const STATUS = ["Executed", "Blocked", "Proposed"];
export const REASON = ["None", "NoAgentID", "Inactive", "NotAllowed", "OverPerTxCap", "OverDailyCap", "InsufficientFunds"];
export const REASON_TEXT = {
  NoAgentID: "the operator wallet no longer holds an Agent ID",
  Inactive: "the mandate (or one it was delegated from) is revoked or expired",
  NotAllowed: "this contract/function is not in the mandate's permissions",
  OverPerTxCap: "the value is above the per-action cap",
  OverDailyCap: "the value would exceed today's cap",
  InsufficientFunds: "the mandate does not hold enough BNB",
};
