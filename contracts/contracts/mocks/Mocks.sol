// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev Test double for the SPACE ID Agent ID contract: balanceOf > 0 means "holds an Agent ID".
contract MockAgentID {
    mapping(address => uint256) public balanceOf;

    function setHolder(address account, bool holds) external {
        balanceOf[account] = holds ? 1 : 0;
    }
}
