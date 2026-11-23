import { useEffect, useMemo, useState } from "react";
import { NightslipSimulator, publicKeyOf, randomBytes32, toHex, commitmentOf, type Slip } from "@nightslip/contract";

type Party = { name: string; sk: Uint8Array };
type HeldSlip = { slip: Slip; employer: string; employee: string };
type LogLine = { t: string; circuit: string; ok: boolean; publicData: string };

const fmt = (cents: bigint) => "€" + (Number(cents) / 100).toLocaleString("en-GB", { minimumFractionDigits: 0 });
const short = (b: Uint8Array) => toHex(b).slice(0, 10) + "…";
const periodNow = () => {
  const d = new Date();
  return BigInt(d.getFullYear() * 100 + d.getMonth() + 1);
};
// previous calendar month as YYYYMM (202601 -> 202512)
const prevPeriod = (p: bigint) => (p % 100n === 1n ? (p / 100n - 1n) * 100n + 12n : p - 1n);

export function App() {
  const admin = useMemo<Party>(() => ({ name: "Keel payroll desk (admin)", sk: randomBytes32() }), []);
  const employers = useMemo<Party[]>(() => [
    { name: "Acme Robotics", sk: randomBytes32() },
    { name: "Blue Fern Studio", sk: randomBytes32() },
  ], []);
  const employees = useMemo<Party[]>(() => [
    { name: "Alice", sk: randomBytes32() },
    { name: "Bogdan", sk: randomBytes32() },
  ], []);

  const [sim, setSim] = useState<NightslipSimulator>();
  const [tick, setTick] = useState(0);
  const [log, setLog] = useState<LogLine[]>([]);
  const [wallet, setWallet] = useState<Record<string, HeldSlip[]>>({ Alice: [], Bogdan: [] });
  const [registered, setRegistered] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState<string>("");

  // employer form
  const [empIdx, setEmpIdx] = useState(0);
  const [eeIdx, setEeIdx] = useState(0);
  const [amount, setAmount] = useState(3200);
  // employee/verifier form
  const [proverIdx, setProverIdx] = useState(0);
  const [slipIdx, setSlipIdx] = useState(0);
  const [threshold, setThreshold] = useState(2500);
  const [challenge, setChallenge] = useState<Uint8Array>(() => randomBytes32());
  const [verdict, setVerdict] = useState<null | { ok: boolean; text: string }>(null);

  useEffect(() => {
    NightslipSimulator.deploy(admin.sk).then((s) => {
      setSim(s);
      push("constructor", true, `admin = ${short(publicKeyOf(admin.sk))}`);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const push = (circuit: string, ok: boolean, publicData: string) =>
    setLog((l) => [{ t: new Date().toLocaleTimeString(), circuit, ok, publicData }, ...l].slice(0, 30));

  const run = async (circuit: string, f: () => Promise<unknown>, publicData: string) => {
    setErr("");
    try {
      await f();
      push(circuit, true, publicData);
      setTick((x) => x + 1);
      return true;
    } catch (e) {
      const m = (e as Error).message.replace(/^.*failed assert: /, "");
      push(circuit, false, m);
      setErr(m);
      return false;
    }
  };

  if (!sim) return <div className="loading">Loading Compact runtime…</div>;
  const L = sim.ledger;
  const prover = employees[proverIdx];
  const proverSlips = wallet[prover.name] ?? [];

  const register = async (p: Party) => {
    const ok = await run("registerIssuer", () => sim.registerIssuer(admin.sk, publicKeyOf(p.sk)), `issuers += ${short(publicKeyOf(p.sk))}`);
    if (ok) setRegistered((r) => ({ ...r, [p.name]: true }));
  };

  const issue = async () => {
    const er = employers[empIdx];
    const ee = employees[eeIdx];
    const slip: Slip = { amount: BigInt(Math.round(amount * 100)), period: periodNow(), salt: randomBytes32(), issuerPk: publicKeyOf(er.sk) };
    const c = commitmentOf(publicKeyOf(ee.sk), slip);
    const ok = await run("issueSlip", () => sim.issueSlip(er.sk, publicKeyOf(ee.sk), slip), `slips += ${short(c)} (amount, employee, salt hidden)`);
    if (ok) setWallet((w) => ({ ...w, [ee.name]: [...(w[ee.name] ?? []), { slip, employer: er.name, employee: ee.name }] }));
  };

  const prove = async () => {
    const held = proverSlips[slipIdx];
    if (!held) { setErr("This employee holds no payslip yet"); return; }
    const t = BigInt(Math.round(threshold * 100));
    const minP = prevPeriod(periodNow());
    const ok = await run("proveIncome", () => sim.proveIncome(prover.sk, held.slip, t, minP, challenge),
      `attestations[${short(challenge)}] = { threshold: ${fmt(t)}, minPeriod: ${minP} }`);
    setVerdict(ok
      ? { ok: true, text: `Verified on ledger: holder of a payslip from a registered employer earns ≥ ${fmt(t)}/month (period ≥ ${minP}). Salary and employer stay private.` }
      : { ok: false, text: "No valid proof: the circuit refused to produce one." });
  };

  const newChallenge = () => { setChallenge(randomBytes32()); setVerdict(null); };
  const att = L.attestations.member(challenge) ? L.attestations.lookup(challenge) : undefined;

  return (
    <div className="page" data-tick={tick}>
      <header>
        <h1>🌙 Nightslip</h1>
        <p className="tag">Prove “I earn at least €X” to a landlord or lender — without showing your salary, your employer, or which payslip. Built on <b>Midnight</b> with a Compact zero-knowledge contract.</p>
        <p className="mode">Mode: <b>local ledger</b> — the real compiled Compact circuits run in your browser against an in-memory copy of the public ledger. <a href="https://github.com/yayguru/nightslip#run-on-midnight-preprod">Preprod deploy →</a></p>
      </header>

      <section className="grid">
        <div className="card">
          <h2>1 · Payroll admin</h2>
          <p className="hint">Whitelists real employers (KYB done off-chain).</p>
          {employers.map((p) => (
            <div className="row" key={p.name}>
              <span>{p.name}</span>
              <button disabled={!!registered[p.name]} onClick={() => register(p)}>{registered[p.name] ? "Registered ✓" : "Register issuer"}</button>
            </div>
          ))}
        </div>

        <div className="card">
          <h2>2 · Employer issues payslip</h2>
          <label>Employer
            <select value={empIdx} onChange={(e) => setEmpIdx(+e.target.value)}>{employers.map((p, i) => <option key={p.name} value={i}>{p.name}</option>)}</select>
          </label>
          <label>Employee
            <select value={eeIdx} onChange={(e) => setEeIdx(+e.target.value)}>{employees.map((p, i) => <option key={p.name} value={i}>{p.name}</option>)}</select>
          </label>
          <label>Net monthly pay (€) — private
            <input type="number" value={amount} onChange={(e) => setAmount(+e.target.value)} />
          </label>
          <button className="primary" onClick={issue}>Issue payslip</button>
        </div>

        <div className="card">
          <h2>3 · Employee wallet (private)</h2>
          <label>Employee
            <select value={proverIdx} onChange={(e) => { setProverIdx(+e.target.value); setSlipIdx(0); }}>{employees.map((p, i) => <option key={p.name} value={i}>{p.name}</option>)}</select>
          </label>
          {proverSlips.length === 0 ? <p className="hint">No payslips yet.</p> : (
            <ul className="slips">
              {proverSlips.map((h, i) => (
                <li key={i} className={i === slipIdx ? "sel" : ""} onClick={() => setSlipIdx(i)}>
                  🔒 {h.employer} · {fmt(h.slip.amount)} · {String(h.slip.period)}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card verifier">
          <h2>4 · Landlord asks for proof</h2>
          <p className="hint">Challenge <code>{short(challenge)}</code> <button className="link" onClick={newChallenge}>new</button></p>
          <label>Minimum net income (€/month)
            <input type="number" value={threshold} onChange={(e) => setThreshold(+e.target.value)} />
          </label>
          <button className="primary" onClick={prove}>{prover.name}: prove income</button>
          {verdict && <div className={verdict.ok ? "ok" : "bad"}>{verdict.text}</div>}
          {att && <p className="hint">Ledger check by landlord: attestation found ✓ threshold {fmt(att.threshold)}</p>}
        </div>
      </section>

      {err && <div className="bad">Circuit refused: {err}</div>}

      <section className="grid two">
        <div className="card">
          <h2>Public ledger (what everyone sees)</h2>
          <table><tbody>
            <tr><td>admin</td><td><code>{short(L.admin)}</code></td></tr>
            <tr><td>issuers</td><td>{L.issuers.size().toString()} keys</td></tr>
            <tr><td>slips (Merkle tree)</td><td>{L.slipCount.toString()} commitments · root <code>{String(L.slips.root().field).slice(0, 12)}…</code></td></tr>
            <tr><td>nullifiers</td><td>{L.nullifiers.size().toString()}</td></tr>
            <tr><td>attestations</td><td>{L.attestations.size().toString()}</td></tr>
          </tbody></table>
          <p className="hint">No salary, no employee, no employer link ever appears here.</p>
        </div>
        <div className="card">
          <h2>Transaction log</h2>
          <ul className="log">
            {log.map((l, i) => <li key={i} className={l.ok ? "" : "fail"}><span>{l.t}</span> <b>{l.circuit}</b> {l.ok ? "✓" : "✗"} <code>{l.publicData}</code></li>)}
          </ul>
        </div>
      </section>
      <footer>Apache-2.0 · <a href="https://github.com/yayguru/nightslip">github.com/yayguru/nightslip</a> · Midnight Buildathon wave 3</footer>
    </div>
  );
}
