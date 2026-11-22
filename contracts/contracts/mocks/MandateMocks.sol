// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAgentMandateExec {
    function execute(uint256 id, address target, uint256 value, bytes calldata data) external returns (uint8, uint256);
}

/// @dev A target that tries to re-enter AgentMandate.execute when paid.
contract ReentrantTarget {
    IAgentMandateExec public mandate;
    uint256 public id;

    constructor(IAgentMandateExec m) {
        mandate = m;
    }

    function setId(uint256 id_) external {
        id = id_;
    }

    function poke() external payable {
        mandate.execute(id, address(this), 0, abi.encodeWithSelector(this.poke.selector));
    }
}

/// @dev A target that always reverts.
contract RevertingTarget {
    function fail() external payable {
        revert("nope");
    }
}
