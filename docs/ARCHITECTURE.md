# Nightslip architecture

## Components

| Layer | Tech | Path |
|---|---|---|
| Contract | Compact (compactc 0.31.1, language ≥ 0.20) | `contract/src/nightslip.compact` |
| Private state + witnesses | TypeScript, compact-runtime 0.16.0 | `contract/src/witnesses.ts` |
| Simulator / tests | vitest, in-process circuit execution | `contract/src/simulator.ts`, `contract/src/test/` |
| Network client | midnight-js 4.1.1, wallet-sdk 1.2.0, HTTP proof server | `cli/src/deploy.ts`, `cli/src/scenario.ts` |
| Demo UI | React + Vite, contract executed in the browser | `ui/src/App.tsx` |

## Public ledger state

```
admin:        Bytes<32>                       publicKey(admin secret)
issuers:      Set<Bytes<32>>                  registered employer keys
slips:        HistoricMerkleTree<16, Bytes<32>>  slip commitments (65,536 capacity)
slipCount:    Counter
nullifiers:   Set<Bytes<32>>                  one per (holder, slip, challenge)
attestations: Map<Bytes<32>, {threshold, minPeriod}>  keyed by verifier challenge
```

## Private state (per device, encrypted LevelDB in the CLI / memory in the UI)

```
secretKey:     Bytes<32>
pendingSlip?:  Slip   (employer, before issueSlip)
selectedSlip?: Slip   (employee, before proveIncome)
```

Witnesses: `secretKey()`, `newSlip()`, `heldSlip()`, `slipPath(commitment)` (Merkle path looked up in the public tree, computed locally).

## Circuits

| Circuit | Checks | Discloses |
|---|---|---|
| `constructor` | — | `admin = H(pk, sk)` |
| `registerIssuer(pk)` | caller is admin | issuer pk |
| `issueSlip(employeePk)` | caller is a registered issuer; slip names caller; amount > 0 | slip commitment only |
| `proveIncome(threshold, minPeriod, challenge)` | Merkle membership (historic root); amount ≥ threshold; period ≥ minPeriod; fresh nullifier; fresh challenge | nullifier, `{threshold, minPeriod}` under the challenge |

Hashes are domain-separated with `pad(32, "nightslip:<domain>:")` and use `persistentHash` (stable across versions, safe to store on the ledger).

## Threat model notes

- **Forged slip**: changing the amount after issuance changes the commitment, so the Merkle check fails (unit test "rejects a forged slip").
- **Stolen slip**: the commitment binds the employee's public key; the thief lacks the secret key.
- **Replay / proof reuse**: nullifier + challenge uniqueness.
- **Rogue employer**: only admin-registered issuers can add slips; issuer key is inside the commitment.
- **Linkability**: two proofs from the same slip to different challenges produce unrelated nullifiers; the tree membership proof hides the leaf index.
- **Out of scope (v1)**: issuer revocation, slip expiry beyond `minPeriod`, selective "employer category" disclosure — natural next steps (see roadmap in the deck).

## Version pinning

Preprod runs ledger v8. compactc 0.31.1 → compact-runtime 0.16.0 → onchain-runtime-v3 3.0.0, which matches midnight-js 4.1.1. The root `package.json` pins `onchain-runtime-v3` with an `overrides` entry, because two copies of the WASM runtime break `instanceof StateValue` checks inside midnight-js (we hit this; the override fixes it).

## Local devnet

`cli/docker-compose.yml` runs node 1.0.0, indexer-standalone 4.3.3 and proof-server 8.1.0 with host networking (bridge networking could not reach the SRS parameter host or keep the indexer's node subscription alive on our Linux box).
