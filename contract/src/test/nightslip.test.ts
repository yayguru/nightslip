// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, beforeEach } from "vitest";
import { NightslipSimulator, publicKeyOf, randomBytes32, commitmentOf, toHex } from "../simulator.js";
import type { Slip } from "../witnesses.js";

const admin = randomBytes32();
const acme = randomBytes32(); // employer
const rogue = randomBytes32(); // unregistered employer
const alice = randomBytes32(); // employee
const mallory = randomBytes32(); // another employee

const slip = (issuerSk: Uint8Array, amount: bigint, period = 202611n): Slip => ({
  amount,
  period,
  salt: randomBytes32(),
  issuerPk: publicKeyOf(issuerSk),
});

describe("Nightslip contract", () => {
  let sim: NightslipSimulator;
  let aliceSlip: Slip;

  beforeEach(async () => {
    sim = await NightslipSimulator.deploy(admin);
    await sim.registerIssuer(admin, publicKeyOf(acme));
    aliceSlip = slip(acme, 320_000n); // €3,200.00 net
    await sim.issueSlip(acme, publicKeyOf(alice), aliceSlip);
  });

  it("stores the admin key and a registered issuer", () => {
    expect(toHex(sim.ledger.admin)).toBe(toHex(publicKeyOf(admin)));
    expect(sim.ledger.issuers.member(publicKeyOf(acme))).toBe(true);
    expect(sim.ledger.slipCount).toBe(1n);
  });

  it("puts only a hiding commitment on the public ledger", () => {
    const c = commitmentOf(publicKeyOf(alice), aliceSlip);
    expect(sim.ledger.slips.findPathForLeaf(c)).toBeDefined();
    // the same amount with a different salt gives a different commitment
    const other = commitmentOf(publicKeyOf(alice), { ...aliceSlip, salt: randomBytes32() });
    expect(toHex(other)).not.toBe(toHex(c));
    expect(sim.ledger.slips.findPathForLeaf(other)).toBeUndefined();
  });

  it("only the admin can register issuers", async () => {
    await expect(sim.registerIssuer(rogue, publicKeyOf(rogue))).rejects.toThrow(/Only the admin/);
  });

  it("unregistered employers cannot issue slips", async () => {
    await expect(sim.issueSlip(rogue, publicKeyOf(alice), slip(rogue, 900_000n))).rejects.toThrow(/not registered/);
  });

  it("an employer cannot issue a slip in another employer's name", async () => {
    await expect(sim.issueSlip(acme, publicKeyOf(alice), slip(rogue, 900_000n))).rejects.toThrow(/name the issuing/);
  });

  it("employee proves income >= threshold; only threshold and period floor are public", async () => {
    const challenge = randomBytes32();
    const l = await sim.proveIncome(alice, aliceSlip, 250_000n, 202610n, challenge);
    expect(l.attestations.member(challenge)).toBe(true);
    expect(l.attestations.lookup(challenge)).toEqual({ threshold: 250_000n, minPeriod: 202610n });
    expect(l.nullifiers.size()).toBe(1n);
  });

  it("rejects a proof above the real salary", async () => {
    await expect(sim.proveIncome(alice, aliceSlip, 400_000n, 202610n, randomBytes32())).rejects.toThrow(/below threshold/);
  });

  it("rejects an outdated payslip", async () => {
    await expect(sim.proveIncome(alice, aliceSlip, 100_000n, 202612n, randomBytes32())).rejects.toThrow(/too old/);
  });

  it("rejects a forged slip (amount inflated after issuance)", async () => {
    const forged = { ...aliceSlip, amount: 999_999n };
    await expect(sim.proveIncome(alice, forged, 500_000n, 202610n, randomBytes32())).rejects.toThrow(/not found/);
  });

  it("someone else cannot use Alice's slip", async () => {
    await expect(sim.proveIncome(mallory, aliceSlip, 100_000n, 202610n, randomBytes32())).rejects.toThrow(/not found/);
  });

  it("a challenge can only be answered once (no replay)", async () => {
    const challenge = randomBytes32();
    await sim.proveIncome(alice, aliceSlip, 100_000n, 202610n, challenge);
    await expect(sim.proveIncome(alice, aliceSlip, 100_000n, 202610n, challenge)).rejects.toThrow(/already/);
  });

  it("supports many employees and employers in one tree", async () => {
    const beta = randomBytes32();
    await sim.registerIssuer(admin, publicKeyOf(beta));
    const malSlip = slip(beta, 180_000n);
    await sim.issueSlip(beta, publicKeyOf(mallory), malSlip);
    expect(sim.ledger.slipCount).toBe(2n);
    await sim.proveIncome(mallory, malSlip, 150_000n, 202611n, randomBytes32());
    await sim.proveIncome(alice, aliceSlip, 300_000n, 202611n, randomBytes32());
    expect(sim.ledger.attestations.size()).toBe(2n);
  });
});
