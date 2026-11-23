// SPDX-License-Identifier: Apache-2.0
// In-process Nightslip ledger: runs the compiled Compact circuits against a
// local copy of the public state. Used by the tests and by the browser demo.
import {
  createCircuitContext,
  createConstructorContext,
  sampleContractAddress,
  type ChargedState,
  type CircuitContext,
  type CircuitResults,
} from "@midnight-ntwrk/compact-runtime";
import { Contract, ledger, pureCircuits, type Ledger, type Slip } from "./managed/nightslip/contract/index.js";
import { witnesses, type NightslipPrivateState } from "./witnesses.js";

const COIN_PK = "0".repeat(64);

export const randomBytes32 = (): Uint8Array => {
  const b = new Uint8Array(32);
  globalThis.crypto.getRandomValues(b);
  return b;
};

export const publicKeyOf = (sk: Uint8Array): Uint8Array => pureCircuits.publicKey(sk);
export const commitmentOf = (employeePk: Uint8Array, s: Slip): Uint8Array => pureCircuits.slipCommitment(employeePk, s);
export const toHex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

export class NightslipSimulator {
  readonly contract = new Contract<NightslipPrivateState>(witnesses);
  readonly address = sampleContractAddress();
  state!: ChargedState;
  /** Gas used by the last circuit call (for display). */
  lastCost: unknown;

  private constructor() {}

  static async deploy(adminSecretKey: Uint8Array): Promise<NightslipSimulator> {
    const sim = new NightslipSimulator();
    const init = sim.contract.initialState(createConstructorContext({ secretKey: adminSecretKey }, COIN_PK));
    sim.state = init.currentContractState.data as unknown as ChargedState;
    return sim;
  }

  get ledger(): Ledger {
    return ledger(this.state);
  }

  // Async so callers don't change when the runtime's circuits become async (runtime >= 0.21).
  private async run(
    ps: NightslipPrivateState,
    _circuitId: "registerIssuer" | "issueSlip" | "proveIncome",
    call: (ctx: CircuitContext<NightslipPrivateState>) => CircuitResults<NightslipPrivateState, []>,
  ): Promise<Ledger> {
    const ctx = createCircuitContext<NightslipPrivateState>(this.address, COIN_PK, this.state, ps);
    const res = call(ctx);
    this.state = res.context.currentQueryContext.state;
    this.lastCost = (res as { gasCost?: unknown }).gasCost;
    return this.ledger;
  }

  registerIssuer(adminSk: Uint8Array, issuerPk: Uint8Array): Promise<Ledger> {
    return this.run({ secretKey: adminSk }, "registerIssuer", (ctx) =>
      this.contract.impureCircuits.registerIssuer(ctx, issuerPk)
    );
  }

  issueSlip(issuerSk: Uint8Array, employeePk: Uint8Array, slip: Slip): Promise<Ledger> {
    return this.run({ secretKey: issuerSk, pendingSlip: slip }, "issueSlip", (ctx) =>
      this.contract.impureCircuits.issueSlip(ctx, employeePk)
    );
  }

  proveIncome(
    employeeSk: Uint8Array,
    slip: Slip,
    threshold: bigint,
    minPeriod: bigint,
    challenge: Uint8Array,
  ): Promise<Ledger> {
    return this.run({ secretKey: employeeSk, selectedSlip: slip }, "proveIncome", (ctx) =>
      this.contract.impureCircuits.proveIncome(ctx, threshold, minPeriod, challenge)
    );
  }
}
