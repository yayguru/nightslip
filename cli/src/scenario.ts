// SPDX-License-Identifier: Apache-2.0
// End-to-end Nightslip scenario against a real Midnight network (local devnet
// or preprod): admin registers an employer, employer issues a private payslip,
// employee proves "income >= threshold" in zero knowledge, then we show that a
// replayed proof and an over-threshold claim are both rejected.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type { NightslipPrivateState, Slip } from '@nightslip/contract';

const hex = (b: Uint8Array) => Buffer.from(b).toString('hex');
const rnd = () => new Uint8Array(randomBytes(32));

type Ctx = {
  deployed: any;
  providers: any;
  Nightslip: any;
  privateStateId: string;
  contractAddress: string;
  network: string;
  deployTx?: any;
};

export async function runScenario(ctx: Ctx) {
  const { deployed, providers, Nightslip, privateStateId, contractAddress } = ctx;
  const ps = providers.privateStateProvider;
  ps.setContractAddress?.(contractAddress);
  const publicKey = (sk: Uint8Array): Uint8Array => Nightslip.pureCircuits.publicKey(sk);
  const asRole = (state: NightslipPrivateState) => ps.set(privateStateId, state);
  const txs: Record<string, unknown> = {};
  const log = (k: string, tx: any) => {
    const p = tx?.public ?? {};
    txs[k] = { txId: String(p.txId ?? ''), txHash: String(p.txHash ?? ''), blockHeight: p.blockHeight ?? null, status: String(p.status ?? '') };
    console.log(`  ✓ ${k}: tx ${txs[k] && (txs[k] as any).txId} @ block ${(txs[k] as any).blockHeight}`);
  };

  console.log('\n─── Nightslip scenario ─────────────────────────────────────────\n');
  const employerSk = rnd();
  const employeeSk = rnd();
  const employerPk = publicKey(employerSk);
  const employeePk = publicKey(employeeSk);

  // 1. admin (current private state = admin key) registers the employer
  log('registerIssuer', await deployed.callTx.registerIssuer(employerPk));

  // 2. employer issues a payslip; only its hash commitment lands on chain
  const slip: Slip = { amount: 4200n, period: 202611n, salt: rnd(), issuerPk: employerPk };
  await asRole({ secretKey: employerSk, pendingSlip: slip });
  log('issueSlip', await deployed.callTx.issueSlip(employeePk));

  // 3. employee proves amount >= 3000 for period >= 202610 to a landlord challenge
  const challenge = rnd();
  await asRole({ secretKey: employeeSk, selectedSlip: slip });
  log('proveIncome', await deployed.callTx.proveIncome(3000n, 202610n, challenge));

  // 4. negative checks — must be rejected before reaching the chain
  const expectFail = async (name: string, f: () => Promise<unknown>) => {
    try {
      await f();
      console.log(`  ✗ ${name}: unexpectedly accepted`);
      return false;
    } catch (e: any) {
      console.log(`  ✓ ${name}: rejected (${String(e?.message ?? e).split('\n')[0].slice(0, 90)})`);
      return true;
    }
  };
  const replayRejected = await expectFail('replay same challenge', () => deployed.callTx.proveIncome(3000n, 202610n, challenge));
  const overRejected = await expectFail('claim above real income', () => deployed.callTx.proveIncome(5000n, 202610n, rnd()));

  // 5. read the public ledger: no amount, no employee identity — just hashes
  const state = await providers.publicDataProvider.queryContractState(contractAddress);
  const L = Nightslip.ledger(state.data);
  const attestations = [...L.attestations].map(([k, v]: [Uint8Array, any]) => ({
    challenge: hex(k),
    threshold: String(v.threshold),
    minPeriod: String(v.minPeriod),
  }));
  const summary = {
    network: ctx.network,
    contractAddress,
    deployTx: ctx.deployTx ? { txId: String(ctx.deployTx.txId ?? ''), blockHeight: ctx.deployTx.blockHeight ?? null } : null,
    txs,
    negativeChecks: { replayRejected, overRejected },
    publicLedger: {
      admin: hex(L.admin),
      issuers: L.issuers.size().toString(),
      slipCount: L.slipCount.toString(),
      nullifiers: L.nullifiers.size().toString(),
      attestations,
    },
    at: new Date().toISOString(),
  };
  console.log('\n  Public ledger after scenario:');
  console.log(JSON.stringify(summary.publicLedger, null, 2).replace(/^/gm, '    '));
  const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'deployments', `${ctx.network}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(summary, null, 2) + '\n');
  console.log(`\n  Saved ${path.relative(process.cwd(), out)}\n`);
  return summary;
}
