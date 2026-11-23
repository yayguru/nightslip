// SPDX-License-Identifier: Apache-2.0
// Private-state side of Nightslip (Midnight's "private ledger" half).
// Everything here lives only on the user's device; the contract sees it only
// through zero-knowledge witnesses and never stores it on chain.
import type { WitnessContext } from "@midnight-ntwrk/compact-runtime";
import type { Ledger, Slip } from "./managed/nightslip/contract/index.js";

export type { Slip };

export type NightslipPrivateState = {
  /** 32-byte secret key of this party (admin, employer or employee). */
  readonly secretKey: Uint8Array;
  /** Employer only: the slip to issue on the next `issueSlip` call. */
  readonly pendingSlip?: Slip;
  /** Employee only: the slip to prove on the next `proveIncome` call. */
  readonly selectedSlip?: Slip;
};

export const createPrivateState = (secretKey: Uint8Array): NightslipPrivateState => ({ secretKey });

const need = <T>(v: T | undefined, what: string): T => {
  if (v === undefined) throw new Error(`Nightslip witness: missing ${what} in private state`);
  return v;
};

export const witnesses = {
  secretKey: ({ privateState }: WitnessContext<Ledger, NightslipPrivateState>): [NightslipPrivateState, Uint8Array] => [
    privateState,
    privateState.secretKey,
  ],
  newSlip: ({ privateState }: WitnessContext<Ledger, NightslipPrivateState>): [NightslipPrivateState, Slip] => [
    privateState,
    need(privateState.pendingSlip, "pendingSlip"),
  ],
  heldSlip: ({ privateState }: WitnessContext<Ledger, NightslipPrivateState>): [NightslipPrivateState, Slip] => [
    privateState,
    need(privateState.selectedSlip, "selectedSlip"),
  ],
  slipPath: (
    { privateState, ledger }: WitnessContext<Ledger, NightslipPrivateState>,
    commitment: Uint8Array,
  ) => {
    const path = ledger.slips.findPathForLeaf(commitment);
    if (!path) throw new Error("Nightslip witness: payslip commitment not found in the on-chain tree");
    return [privateState, path] as [NightslipPrivateState, typeof path];
  },
};
