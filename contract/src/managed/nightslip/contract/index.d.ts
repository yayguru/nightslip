import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Slip = { amount: bigint;
                     period: bigint;
                     salt: Uint8Array;
                     issuerPk: Uint8Array
                   };

export type Attestation = { threshold: bigint; minPeriod: bigint };

export type Witnesses<PS> = {
  secretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  newSlip(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Slip];
  heldSlip(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Slip];
  slipPath(context: __compactRuntime.WitnessContext<Ledger, PS>,
           commitment_0: Uint8Array): [PS, { leaf: Uint8Array,
                                             path: { sibling: { field: bigint },
                                                     goes_left: boolean
                                                   }[]
                                           }];
}

export type ImpureCircuits<PS> = {
  registerIssuer(context: __compactRuntime.CircuitContext<PS>,
                 issuerPk_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  issueSlip(context: __compactRuntime.CircuitContext<PS>,
            employeePk_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  proveIncome(context: __compactRuntime.CircuitContext<PS>,
              threshold_0: bigint,
              minPeriod_0: bigint,
              challenge_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  registerIssuer(context: __compactRuntime.CircuitContext<PS>,
                 issuerPk_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  issueSlip(context: __compactRuntime.CircuitContext<PS>,
            employeePk_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  proveIncome(context: __compactRuntime.CircuitContext<PS>,
              threshold_0: bigint,
              minPeriod_0: bigint,
              challenge_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  publicKey(sk_0: Uint8Array): Uint8Array;
  slipCommitment(employeePk_0: Uint8Array, s_0: Slip): Uint8Array;
}

export type Circuits<PS> = {
  publicKey(context: __compactRuntime.CircuitContext<PS>, sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  slipCommitment(context: __compactRuntime.CircuitContext<PS>,
                 employeePk_0: Uint8Array,
                 s_0: Slip): __compactRuntime.CircuitResults<PS, Uint8Array>;
  registerIssuer(context: __compactRuntime.CircuitContext<PS>,
                 issuerPk_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  issueSlip(context: __compactRuntime.CircuitContext<PS>,
            employeePk_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  proveIncome(context: __compactRuntime.CircuitContext<PS>,
              threshold_0: bigint,
              minPeriod_0: bigint,
              challenge_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly admin: Uint8Array;
  issuers: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  slips: {
    isFull(): boolean;
    checkRoot(rt_0: { field: bigint }): boolean;
    root(): __compactRuntime.MerkleTreeDigest;
    firstFree(): bigint;
    pathForLeaf(index_0: bigint, leaf_0: Uint8Array): __compactRuntime.MerkleTreePath<Uint8Array>;
    findPathForLeaf(leaf_0: Uint8Array): __compactRuntime.MerkleTreePath<Uint8Array> | undefined;
    history(): Iterator<__compactRuntime.MerkleTreeDigest>
  };
  readonly slipCount: bigint;
  nullifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  attestations: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Attestation;
    [Symbol.iterator](): Iterator<[Uint8Array, Attestation]>
  };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
