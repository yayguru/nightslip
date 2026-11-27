# AKINDO submission: Midnight Buildathon, wave 3

**Product name:** Nightslip

**Tagline:** Prove "I earn at least X" in zero knowledge, without revealing the salary, the employer or the payslip.

**Repo:** https://github.com/yayguru/nightslip (Apache-2.0, topic `midnightntwrk`)
**Live demo:** https://yayguru.github.io/nightslip/
**Deck:** docs/Nightslip-deck.pdf in the repo
**Video (0:52, 1280×720):** local file `/workspace/night-builds/video/ns.mp4` → OPDE uploads to YouTube (unlisted) and pastes the link here.
**Deadline:** 30 Nov 2026 15:00 UTC = **16:00 Madrid** (page shows 11/30 10:00 ET). Wave 3 pool 5,000 USDT, split by points; 48 submissions on 27 Nov.

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

**Required fields, filled in by the entrant in the form (not stored in this repo):**
- Discord ID: ___
- Telegram ID: ___

## Checklist vs. the official wave rules (checked 27 Nov)
- [x] Public GitHub repo, Apache-2.0
- [x] README: project, setup, architecture, Midnight integration, how judges test (section "Test it in 2 minutes")
- [x] At least one Compact contract that compiles (compactc 0.31.1)
- [x] Slide deck: `docs/Nightslip-deck.pdf`
- [ ] Demo video link (upload `ns.mp4`)
- [x] Progress during this wave: first submission, all built in wave 3 (see README "Wave 3 progress")
