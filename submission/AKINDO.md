# AKINDO submission: Midnight Buildathon, wave 3

**Product name:** Nightslip

**Tagline:** Prove "I earn at least X" in zero knowledge, without revealing the salary, the employer or the payslip.

**Repo:** https://github.com/yayguru/nightslip (Apache-2.0, topic `midnightntwrk`)
**Live demo:** https://yayguru.github.io/nightslip/
**Deck:** docs/Nightslip-deck.pdf in the repo
**Video:** <link after upload>

## Description (paste)

Renters, borrowers and visa applicants hand full payslips to strangers just to show their income clears a bar. Nightslip turns a payslip into a private credential on Midnight.

- A payroll admin registers employer keys.
- An employer issues a payslip. Only a hiding commitment (Merkle leaf) goes on chain.
- The employee proves `amount ≥ threshold` and `period ≥ minPeriod` against a verifier's fresh challenge.
- The verifier reads a single attestation. Salary, employer, employee identity and which slip was used all stay private.

**What's built (wave 3):**
- Compact contract (`contract/src/nightslip.compact`):
  - HistoricMerkleTree of slip commitments;
  - issuer registry;
  - nullifiers keyed by verifier challenge (no replay);
  - holder-bound commitments, so a stolen slip is useless;
  - domain-separated `persistentHash`.
- 12 simulator tests: forgery, theft, replay, stale slip, rogue issuer, multi-employer tree.
- A real end-to-end run on a Midnight network (local devnet: node 1.0.0, indexer 4.3.3, proof-server 8.1.0) with genuine ZK proofs. The chain accepted deploy, registerIssuer, issueSlip and proveIncome (`SucceedEntirely`). A replayed challenge and an over-claim were rejected. Tx IDs are in `deployments/undeployed.json`.
- The same script targets Preprod (`npm run e2e:preprod`).
- A browser demo that runs the compiled contract in-browser: four role cards plus a live public-ledger view.
- Versions are pinned for Preprod: compactc 0.31.1, compact-runtime 0.16, ledger v8, midnight-js 4.1.1.

**What's next:** issuer revocation, proofs over N months, a Lace wallet + verifier QR flow, a payroll-provider SDK.

## Team

Solo builder.

**Required fields, filled in by the entrant:**
- Discord ID: ___
- Telegram ID: ___
