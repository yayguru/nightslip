# Demo video script (≈2:30)

**0:00 – 0:20 Problem.** "To rent a flat in Madrid I had to send my landlord three payslips: salary, employer, tax ID, address. He only needed to know one thing — do I earn more than three times the rent?"

**0:20 – 0:40 Idea.** "Nightslip turns a payslip into a private credential on Midnight. The employer issues it, the employee proves 'income ≥ X' in zero knowledge, the verifier sees yes/no and nothing else."

**0:40 – 1:40 Live UI** (open the demo link):
1. *Payroll admin* card → **Register issuer** (Acme). Ledger panel: `issuers += …`.
2. *Employer* card → **Issue payslip** for Alice (€4,200, Nov 2026). Ledger panel shows only a commitment hash — point out amount/employee are absent.
3. *Verifier* (landlord) sets threshold €2,500 and a fresh challenge. *Alice* → **prove income** → green "Verified on ledger".
4. Landlord raises the bar to €5,000 → Alice tries again → "Circuit refused: Income below threshold" — no proof exists, so nothing can be faked.

**1:40 – 2:10 Real network.** Terminal: `npm run e2e:devnet` (pre-recorded), showing deploy → registerIssuer → issueSlip → proveIncome tx ids, then replay and over-claim rejected, then the public ledger JSON: one commitment, one nullifier, one attestation `{threshold: 3000, minPeriod: 202610}`.

**2:10 – 2:30 Close.** "Compact contract, 12 tests, real proofs on a Midnight network. Next: issuer revocation, payroll-provider API, and a wallet plug-in for Lace. Nightslip — prove the number, keep the payslip."
