// Addresses and defaults used by the deploy and fork scripts.
const BSC = {
  // SPACE ID Agent ID (ERC-721, non-transferable, one per Binance user)
  agentId: "0x60b9262456de011f7d15a54cdd8c48baaa8b022f",
};

// Demo service: a research note costs 0.00001 BNB and the payment is burned, so nobody profits from demos.
const DEMO = {
  price: "0.00001",
  beneficiary: "0x000000000000000000000000000000000000dEaD",
};

module.exports = { BSC, DEMO };
