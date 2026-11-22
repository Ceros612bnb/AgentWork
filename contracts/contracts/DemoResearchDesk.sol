// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title DemoResearchDesk
/// @notice A tiny pay-per-use service for demos: an agent buys a research note for a fixed price.
///         Payments are forwarded immediately to an immutable beneficiary. No owner, no admin, holds no funds.
contract DemoResearchDesk {
    uint256 public immutable price;
    address payable public immutable beneficiary;
    uint256 public sold;

    event NotePurchased(address indexed buyer, uint256 indexed topic, uint256 paid);

    error WrongPrice();
    error ForwardFailed();

    constructor(uint256 price_, address payable beneficiary_) {
        price = price_;
        beneficiary = beneficiary_;
    }

    function buyNote(uint256 topic) external payable {
        if (msg.value != price) revert WrongPrice();
        sold += 1;
        emit NotePurchased(msg.sender, topic, msg.value);
        (bool ok,) = beneficiary.call{value: msg.value}("");
        if (!ok) revert ForwardFailed();
    }
}
