# Nightslip — private proof of income on Midnight

> "I earn at least €2,500/month" — proven in zero knowledge, without showing the salary, the employer, or the payslip.

Renters, borrowers and visa applicants are routinely asked to hand over full payslips and bank statements just to show that their income clears a bar. That leaks salary, employer, address and more, to people who only needed a yes/no.

**Nightslip** turns a payslip into a private credential on Midnight:

| Role | What they do | What becomes public |
|---|---|---|
| **Payroll admin** (payroll provider / registry) | registers employer keys | the employer's public key hash |
| **Employer** | issues a payslip to an employee | **only a hiding commitment** (Merkle leaf) — no amount, no employee, no period |
| **Employee** | proves `amount ≥ threshold` and `period ≥ minPeriod` against a verifier's challenge | a one-time nullifier + `{threshold, minPeriod}` under the challenge |
| **Verifier** (landlord, lender, consulate) | picks a threshold + fresh challenge, reads the attestation | nothing else |

Which slip, which employer, which employee and the actual salary never leave the employee's device.

## Status

- ✅ Compact contract (`contract/src/nightslip.compact`) compiles with **compactc 0.31.1** (runtime 0.16 / ledger v8 — the version deployed on Midnight Preprod).
- ✅ 12 unit tests against the contract simulator (`npm test`).
- ✅ **Real end-to-end run on a Midnight network** (local devnet: node 1.0.0, indexer 4.3.3, proof-server 8.1.0) with genuine ZK proofs: deploy → `registerIssuer` → `issueSlip` → `proveIncome`, plus replay and over-claim rejected. Transcript: [`deployments/undeployed.json`](deployments/undeployed.json), [`deployments/undeployed-run.txt`](deployments/undeployed-run.txt).
- ✅ Browser demo (React + the compiled contract running in-browser on the Compact runtime) — see the live link in the repo description. Headless e2e: `ui/e2e/ui_e2e.py`.
- ⏳ Preprod: the same script runs with `--network preprod`; it needs tNIGHT from the faucet (captcha-protected, so it's a manual step).

## How it works

```
 Employer (registered issuer)          Public ledger (Midnight)                 Employee
 ───────────────────────────           ────────────────────────                 ────────
 slip = {amount, period, salt, issuerPk}
 c = H("slip", issuerPk, employeePk,
       amount, period, salt)  ───────▶  slips: HistoricMerkleTree<16> += c
                                        slipCount++
                               (slip sent privately to employee) ─────────────▶ keeps slip + secret key

 Verifier: "prove ≥ 3000, period ≥ 202610, challenge r"  ──────────────────────▶
                                                                                proveIncome(3000, 202610, r):
                                                                                 - c from slip + own pk
                                                                                 - Merkle path c ∈ slips
                                                                                 - amount ≥ 3000, period ≥ 202610
                                                                                 - n = H("null", sk, c, r) unused
                                        nullifiers += n                ◀──────── ZK proof
                                        attestations[r] = {3000, 202610}
 Verifier reads attestations[r] ✓
```

Key design points:

- **Commitments, not data.** `slipCommitment` is a `persistentHash` over issuer, employee key, amount, period and a 32-byte salt, so the leaf is hiding and binding.
- **Anonymity set.** Slips live in a `HistoricMerkleTree`; a proof shows membership in the tree (against any historic root) without revealing *which* leaf.
- **Issuer authenticity.** `issueSlip` requires the caller to own a registered issuer key and the slip to name that issuer, so an employer cannot mint slips in another employer's name.
- **Bound to the holder.** The commitment includes the employee's public key; proving requires the matching secret key, so a leaked slip is useless to someone else.
- **No replay.** Each proof answers a verifier-chosen challenge and burns a nullifier `H(sk, c, challenge)`; the same challenge cannot be answered twice.
- **Minimal disclosure.** Only `threshold` and `minPeriod`, chosen by the verifier, are disclosed.

More detail: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Repo layout

```
contract/   Compact contract, witnesses (private state), simulator, unit tests
cli/        Wallet + deploy + end-to-end scenario on a real Midnight network (midnight-js 4.1.1, wallet-sdk 1.2.0)
ui/         React demo that runs the compiled contract in the browser (four role cards + public ledger view)
deployments/  Results of real network runs
docs/       Architecture, demo script, pitch deck
```

## Quick start

Prereqs: Node 22+, Docker (for the devnet), compactc 0.31.1 only if you want to recompile (compiled output is committed).

```bash
npm install
npm test                 # 12 contract tests
npm run build            # contract + UI
npm run dev              # UI on http://localhost:5173

# Real network, local devnet (node + indexer + proof server in Docker):
npm run devnet:up
npm run e2e:devnet       # deploy + registerIssuer + issueSlip + proveIncome + negative checks

# Preprod (fund the printed address at https://midnight-tmnight-preprod.nethermind.dev first):
npm run e2e:preprod
```

## Recompiling the contract

```bash
compact update 0.31.1    # pin the compiler
npm run compact          # compact compile contract/src/nightslip.compact contract/src/managed/nightslip
```

compactc 0.31.1 targets compact-runtime 0.16.0 / ledger v8, which is what Preprod runs today. Newer compilers (0.34+) target ledger v9 and won't deploy there yet.

## Use cases

- Rental applications ("income ≥ 3× rent")
- Consumer lending / BNPL pre-checks
- Digital-nomad and work visas (income floors)
- Payroll providers and EOR platforms offering "proof of employment & income" as a privacy-preserving API

## License

Apache-2.0. Built for the Midnight Network wave hackathon (AKINDO).
