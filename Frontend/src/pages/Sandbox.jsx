import React, { useEffect, useState } from "react";
import { Panel, Badge, Icon } from "../components/Hud";
import { PageHead, Button } from "../components/Chrome";
import { useApi } from "../api/useApi";
import { api } from "../api/client";
import { SAMPLE_CODE } from "../data/mock";

/* Sandboxed execution, live. Agent-written code runs in a throwaway
   container with no network when Docker is up, or an isolated local
   Python process with a hard timeout otherwise — the response says which,
   so the panel never claims isolation it does not have. The egress probe
   is what proves (or honestly scopes) the isolation. */

const TONE = { pass: "green", fail: "red", timeout: "red", blocked: "amber" };

export default function Sandbox({ fx }) {
  const [code, setCode] = useState(SAMPLE_CODE);
  const [run, setRun] = useState(null);
  const [probe, setProbe] = useState(null);
  const [calc, setCalc] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const { data: runs, reload } = useApi("/api/sandbox/runs");

  // Model 2 (coder): describe a task in English, the agent writes the code,
  // runs it in this same sandbox, and fixes it on failure — separate from
  // the "paste your own code" flow above.
  const [aiTask, setAiTask] = useState("Write a function that returns the nth Fibonacci number, with a test.");
  const [aiResult, setAiResult] = useState(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState("");

  useEffect(() => {
    api("/api/sandbox/calc", { method: "POST", body: { measured: 8.1, minimum: 8.5, unit: "mm" } })
      .then(setCalc).catch(() => {});
  }, []);

  const execute = async () => {
    if (busy) return;
    setBusy(true);
    setErr("");
    fx?.busy("code", 1500);
    try {
      const r = await api("/api/sandbox/run", { method: "POST", body: { code } });
      setRun(r);
      reload();
      if (r.status === "pass") fx?.toast(`Passed in ${r.ms}ms (${r.executedIn}).`);
      else fx?.toast(`Run ${r.status} — see the output panel.`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const runProbe = async () => {
    if (busy) return;
    setBusy(true);
    setErr("");
    try {
      const p = await api("/api/sandbox/probe", { method: "POST", body: { target: "api.openai.com:443" } });
      setProbe(p);
      fx?.blocked("code");
      reload();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const solveWithAI = async () => {
    if (!aiTask.trim() || aiBusy) return;
    setAiBusy(true);
    setAiErr("");
    fx?.busy("code", 2500);
    try {
      const r = await api("/api/ai/code/solve", { method: "POST", body: { task: aiTask.trim() } });
      setAiResult(r);
      reload();
    } catch (e) {
      setAiErr(e.message);
    } finally {
      setAiBusy(false);
    }
  };

  const loadAiCode = () => {
    if (aiResult?.solution) setCode(`${aiResult.solution}\n\n${aiResult.tests || ""}`.trim());
  };

  const dockerActive = run ? run.executedIn.startsWith("docker") : null;
  const netPolicy = run?.networkPolicy || "No run yet — press “Run in sandbox” to see which isolation applied.";

  return (
    <div>
      <PageHead
        sub="docker run --network none --read-only --cap-drop ALL --memory 512m --pids-limit 128 (falls back to an isolated local process when Docker is off)"
        actions={<div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={execute} disabled={busy}>{busy ? "Running…" : "Run in sandbox"}</Button>
          <Button onClick={runProbe} disabled={busy}>Run egress probe</Button>
        </div>}
      />

      {err && <div className="border border-hud-red/50 bg-hud-red/[0.07] px-3.5 py-2.5 mb-3.5 text-[13px] text-hud-dim">{err}</div>}

      <div className="grid grid-cols-1 gap-3.5 items-start">
        <Panel title="Generated code" meta={run ? `${run.filename} · ${run.ms}ms` : "thickness_margin.py"}>
          <textarea value={code} onChange={e => setCode(e.target.value)} rows={10} spellCheck={false}
            className="w-full text-[13px] leading-relaxed text-hud-dim bg-black/30 border border-hud-edge p-3 font-mono outline-none focus:border-hud-cyan resize-y whitespace-pre" />
          <div className="flex gap-2 mt-3">
            <Button className="flex-1" onClick={() => setCode(SAMPLE_CODE)}>Restore sample</Button>
            <Button variant="primary" className="flex-1" onClick={execute} disabled={busy}>Run again</Button>
          </div>
        </Panel>

        <Panel title="Container output"
          meta={run ? `${run.status} · exit ${run.exitCode} · ${run.ms}ms · ${run.executedIn}` : "not run yet"}>
          <pre className={`text-[13px] leading-relaxed bg-black/30 border border-hud-edge p-3 overflow-x-auto whitespace-pre-wrap
            ${run ? (run.status === "pass" ? "text-hud-green" : "text-hud-red") : "text-hud-faint"}`}>
{run
  ? [run.stdout, run.stderr].filter(Boolean).join("\n") || "(no output)"
  : "Press “Run in sandbox”. Output, exit code and the isolation actually applied appear here."}
          </pre>

          {probe && (
            <div className="mt-3 border border-hud-amber/50 bg-hud-amber/[0.07] p-3">
              <div className="flex items-center gap-2 text-[15px] text-white font-display font-bold">
                <Icon name="x" className="w-3.5 h-3.5 text-hud-red" />
                Outbound call blocked — {probe.target}
              </div>
              <pre className="text-[13px] text-hud-dim mt-2 whitespace-pre-wrap font-mono break-words">{`method: ${probe.method}
detail: ${probe.detail}
policy: ${probe.policy}
audit: written to chain as ${String(probe.hash || "").slice(0, 12)}…`}</pre>
            </div>
          )}

          <div className="mt-3 border border-hud-edge bg-black/20 p-3">
            <div className="flex items-center justify-between text-[12px] text-hud-faint">
              <span>Network policy (last run)</span>
              <Badge tone={dockerActive === true ? "red" : dockerActive === false ? "amber" : "dim"}>
                {dockerActive === true ? "DENY ALL (--network none)" : dockerActive === false ? "FALLBACK (host network)" : "unknown until run"}
              </Badge>
            </div>
            <div className="text-[13px] text-hud-dim mt-2 leading-snug">{netPolicy}</div>
            <div className="grid grid-cols-2 gap-2 mt-2 text-[13px] text-hud-dim">
              <span>External APIs</span><b className="text-hud-red">{dockerActive ? "blocked by container" : "isolation not claimed"}</b>
              <span>Local model / KB</span><b className="text-hud-green">allowed</b>
            </div>
          </div>
        </Panel>

        <div className="space-y-3.5">
          <Panel title="Calculation trace" meta={calc ? calc.engine?.executedIn : "pint/sympy-style steps"}>
            {(calc?.steps || []).map(s => (
              <div key={s.k} className="flex justify-between gap-3 py-2 text-[13px] border-b border-white/[0.05] last:border-0">
                <span className="text-hud-faint">{s.k}</span>
                <span className="text-hud-text text-right">{s.v}</span>
              </div>
            ))}
            {!calc && <p className="text-[13px] text-hud-faint">Running the margin calculation…</p>}
            <p className="text-[12px] text-hud-faint leading-relaxed mt-2">
              Executed in the sandbox ({calc?.engine?.executedIn || "…"}) as decimal arithmetic;
              assistive only — an engineer verifies every figure.
            </p>
          </Panel>

          <Panel title="Recent runs" meta={`${(runs || []).length} on this gateway`}>
            {(runs || []).length === 0 && <p className="text-[13px] text-hud-faint">No runs yet.</p>}
            {(runs || []).map(r => (
              <div key={r.id} className="flex items-center gap-2 py-2 border-b border-white/[0.05] last:border-0">
                <span className="leading-tight flex-1 min-w-0">
                  <b className="block text-[13px] text-hud-text font-medium truncate">{r.label}</b>
                  <i className="block text-[12px] text-hud-faint not-italic">{r.tests} · {r.ms}ms · {r.executedIn}</i>
                </span>
                <Badge tone={TONE[r.status] || "dim"}>{r.status}</Badge>
              </div>
            ))}
          </Panel>

          <Panel title="AI coder (Model 2)" meta="write → test → fix loop">
            <textarea value={aiTask} onChange={e => setAiTask(e.target.value)} rows={2} spellCheck={false}
              className="w-full text-[13px] leading-relaxed text-hud-dim bg-black/30 border border-hud-edge p-2.5 outline-none focus:border-hud-cyan resize-y" />
            <Button variant="primary" className="w-full mt-2" onClick={solveWithAI} disabled={aiBusy}>
              {aiBusy ? "Writing and testing…" : "Write & test with AI"}
            </Button>
            {aiErr && <div className="border border-hud-red/50 bg-hud-red/[0.07] px-3 py-2 mt-2.5 text-[13px] text-hud-dim">
              {aiErr}
            </div>}
            {aiResult && (
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <Badge tone={aiResult.status === "passed" ? "green" : "red"}>{aiResult.status}</Badge>
                  <span className="text-[12px] text-hud-faint">{(aiResult.attempts || []).length} attempt(s){aiResult.escalated ? " · escalated to a stronger model" : ""}</span>
                </div>
                {aiResult.executed_in && <p className="text-[12px] text-hud-faint mb-2 leading-snug">Ran in: {aiResult.executed_in}</p>}
                {aiResult.status !== "passed" && (
                  <div className="border border-hud-amber/50 bg-hud-amber/[0.07] px-3 py-2 mb-2 text-[13px] text-hud-dim leading-snug">
                    The tests did not pass. Last test output:
                    <pre className="mt-1.5 text-[12px] font-mono whitespace-pre-wrap break-words max-h-[220px] overflow-auto">{(aiResult.attempts || [])[(aiResult.attempts || []).length - 1]?.output_tail || "(no output)"}</pre>
                    <span className="block mt-1.5 text-hud-faint">Small models often get constants wrong. Put the exact formula, constant and expected values in the task.</span>
                  </div>
                )}
                <details className="mb-2">
                  <summary className="text-[13px] text-hud-cyan cursor-pointer">Show generated code and tests</summary>
                  <div className="text-[12px] text-hud-faint mt-2">solution.py</div>
                  <pre className="text-[12px] font-mono text-hud-dim bg-black/30 border border-hud-edge p-2 overflow-auto max-h-[200px] whitespace-pre-wrap">{aiResult.solution}</pre>
                  <div className="text-[12px] text-hud-faint mt-2">test_solution.py</div>
                  <pre className="text-[12px] font-mono text-hud-dim bg-black/30 border border-hud-edge p-2 overflow-auto max-h-[200px] whitespace-pre-wrap">{aiResult.tests}</pre>
                </details>
                <Button className="w-full" onClick={loadAiCode}>Load into editor above</Button>
              </div>
            )}
          </Panel>

          <Panel title="Container limits">
            {[["network", "none"], ["filesystem", "read-only + /workspace"], ["memory", "512 MB"], ["cpus", "1"], ["timeout", "20s"], ["user", "1000:1000"]].map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5 text-[13px] border-b border-white/[0.05] last:border-0">
                <span className="text-hud-faint">{k}</span><span className="text-hud-dim font-mono">{v}</span>
              </div>
            ))}
            <p className="text-[12px] text-hud-faint leading-relaxed mt-2">
              With Docker off, the fallback keeps a scrubbed environment, an isolated temp
              workspace and the 20s timeout — but not network isolation, and the panel says so.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
