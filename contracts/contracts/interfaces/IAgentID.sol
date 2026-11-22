// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal view of the SPACE ID Agent ID contract on BNB Chain
///         (0x60b9262456de011f7d15a54cdd8c48baaa8b022f, ERC-721, non-transferable).
///         An address holds an Agent ID when balanceOf(addr) > 0.
interface IAgentID {
    function balanceOf(address owner) external view returns (uint256);
}
