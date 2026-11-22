const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

const E = (x) => ethers.parseEther(x);

describe("StarterFaucet", function () {
  async function deploy() {
    const [sponsor, agent, agent2, outsider, attacker] = await ethers.getSigners();
    const agentId = await ethers.deployContract("MockAgentID");
    for (const s of [agent, agent2]) await agentId.setHolder(s.address, true);
    const mandate = await ethers.deployContract("AgentMandate", [await agentId.getAddress()]);
    const desk = await ethers.deployContract("DemoResearchDesk", [E("0.00001"), "0x000000000000000000000000000000000000dEaD"]);
    const sel = desk.interface.getFunction("buyNote").selector;
    const faucet = await ethers.deployContract("StarterFaucet", [
      await mandate.getAddress(), await agentId.getAddress(), await desk.getAddress(), sel, sponsor.address,
    ]);
    await faucet.connect(sponsor).fund({ value: E("0.00008") }); // enough for one starter, not two
    return { sponsor, agent, agent2, outsider, attacker, agentId, mandate, desk, faucet };
  }

  it("an Agent ID wallet claims a funded starter mandate in one transaction", async function () {
    const f = await loadFixture(deploy);
    await expect(f.faucet.connect(f.agent).claim()).to.emit(f.faucet, "Claimed").withArgs(f.agent.address, 1);
    const [principal, operator, , holds, active] = await f.mandate.accountableFor(1);
    expect([principal, operator, holds, active]).to.deep.equal([await f.faucet.getAddress(), f.agent.address, true, true]);
    expect((await f.mandate.getMandate(1)).balance).to.equal(E("0.00005"));
    expect(await f.faucet.starterOf(f.agent.address)).to.equal(1);
    expect(await f.faucet.claimantCount()).to.equal(1);

    // the agent can buy notes, cannot pay anyone else, cannot withdraw
    const buy = f.desk.interface.encodeFunctionData("buyNote", [3]);
    await expect(f.mandate.connect(f.agent).execute(1, await f.desk.getAddress(), E("0.00001"), buy)).to.emit(f.desk, "NotePurchased");
    await expect(f.mandate.connect(f.agent).execute(1, f.attacker.address, E("0.00001"), "0x")).to.emit(f.mandate, "Blocked");
    await expect(f.mandate.connect(f.agent).withdraw(1, 1)).to.be.revertedWithCustomError(f.mandate, "NotPrincipal");
  });

  it("one claim per Agent ID wallet, holders only, and only while the pool lasts", async function () {
    const f = await loadFixture(deploy);
    await expect(f.faucet.connect(f.outsider).claim()).to.be.revertedWithCustomError(f.faucet, "NoAgentID");
    await f.faucet.connect(f.agent).claim();
    await expect(f.faucet.connect(f.agent).claim()).to.be.revertedWithCustomError(f.faucet, "AlreadyClaimed");
    await expect(f.faucet.connect(f.agent2).claim()).to.be.revertedWithCustomError(f.faucet, "PoolEmpty");
  });

  it("only the sponsor can withdraw the pool, revoke a starter or pull its budget back", async function () {
    const f = await loadFixture(deploy);
    await f.faucet.connect(f.agent).claim();
    await expect(f.faucet.connect(f.agent).withdrawPool(1)).to.be.revertedWithCustomError(f.faucet, "NotSponsor");
    await expect(f.faucet.connect(f.agent).revokeStarter(1)).to.be.revertedWithCustomError(f.faucet, "NotSponsor");
    await expect(f.faucet.connect(f.agent).reclaim(1, 1)).to.be.revertedWithCustomError(f.faucet, "NotSponsor");
    await f.faucet.connect(f.sponsor).revokeStarter(1);
    expect(await f.mandate.isActive(1)).to.equal(false);
    await f.faucet.connect(f.sponsor).reclaim(1, E("0.00005"));
    expect(await f.faucet.poolBalance()).to.equal(E("0.00008"));
    await expect(f.faucet.connect(f.sponsor).withdrawPool(E("0.00008"))).to.changeEtherBalance(f.sponsor, E("0.00008"));
  });
});
