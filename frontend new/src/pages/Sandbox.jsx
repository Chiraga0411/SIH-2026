import React, { useState } from "react";
import { Panel, Badge, Icon } from "../components/Hud";
import { PageHead, Button } from "../components/Chrome";
import { SANDBOX_RUNS, SANDBOX_CODE, SANDBOX_OUT } from "../data/mock";

/* Sandboxed execution. Agent-written code and engineering calculations
   run in a throwaway container with no network. The egress probe is the
   demo that proves isolation rather than claiming it. */

const TONE = { pass:"green", fail:"red", blocked:"amber" };

export default function Sandbox({ fx }) {
  const [probe, setProbe] = useState(false);
  const [networkBlocked, setNetworkBlocked] = useState(true);

  return (
    <div>
      <PageHead
        sub="docker run --network none --read-only --cap-drop ALL --memory 512m --pids-limit 128"
        actions={<div className="flex flex-wrap gap-2"><Button variant="primary" onClick={() => { setProbe(true); fx?.blocked("code"); }}>Run egress probe</Button><Button onClick={() => setNetworkBlocked(v => !v)}>{networkBlocked ? "Network: DENIED" : "Network: ALLOWED"}</Button></div>}
      />

      <div className="grid grid-cols-1 gap-3.5 items-start">
        <Panel title="Generated code" meta="thickness_margin.py">
          <pre className="text-[13px] leading-relaxed text-hud-dim bg-black/30 border border-hud-edge p-3 overflow-x-auto whitespace-pre">{SANDBOX_CODE}</pre>
          <div className="flex gap-2 mt-3">
            <Button className="flex-1">Edit</Button>
            <Button variant="primary" className="flex-1">Run again</Button>
          </div>
        </Panel>

          <Panel title="Container output" meta="exit 0 · 1.84s">
          <pre className="text-[13px] leading-relaxed text-hud-green bg-black/30 border border-hud-edge p-3 overflow-x-auto whitespace-pre">{SANDBOX_OUT}</pre>

          {probe && (
            <div className="mt-3 border border-hud-amber/50 bg-hud-amber/[0.07] p-3">
              <div className="flex items-center gap-2 text-[15px] text-white font-display font-bold">
                <Icon name="x" className="w-3.5 h-3.5 text-hud-red" />
                Outbound call blocked
              </div>
              <pre className="text-[13px] text-hud-dim mt-2 whitespace-pre-wrap">{`urllib.error.URLError: <urlopen error [Errno -3] Temporary failure in name resolution>
container network: none
audit: EGRESS_DENIED written to chain`}</pre>
            </div>
          )}
          <div className="mt-3 border border-hud-edge bg-black/20 p-3">
            <div className="flex items-center justify-between text-[12px] text-hud-faint">
              <span>Network policy</span>
              <Badge tone={networkBlocked ? "red" : "amber"}>{networkBlocked ? "DENY ALL" : "ALLOW"}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 text-[13px] text-hud-dim">
              <span>External APIs</span><b className={networkBlocked ? "text-hud-red" : "text-hud-amber"}>{networkBlocked ? "blocked" : "enabled"}</b>
              <span>Local model / KB</span><b className="text-hud-green">allowed</b>
            </div>
          </div>
        </Panel>

        <div className="space-y-3.5">
          <Panel title="Calculation trace" meta="pint + sympy">
            {[["formula","t_margin = t_meas − t_min"],["substituted","8.1 mm − 8.5 mm"],["result","−0.40 mm"],["verdict","below tolerance"]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 py-2 text-[13px] border-b border-white/[0.05] last:border-0">
                <span className="text-hud-faint">{k}</span>
                <span className="text-hud-text text-right">{v}</span>
              </div>
            ))}
          </Panel>

          <Panel title="Recent runs">
            {SANDBOX_RUNS.map(r => (
              <div key={r.id} className="flex items-center gap-2 py-2 border-b border-white/[0.05] last:border-0">
                <span className="leading-tight flex-1">
                  <b className="block text-[13px] text-hud-text font-medium">{r.label}</b>
                  <i className="block text-[12px] text-hud-faint not-italic">{r.tests} tests · {r.ms}ms</i>
                </span>
                <Badge tone={TONE[r.status]}>{r.status}</Badge>
              </div>
            ))}
          </Panel>

          <Panel title="Container limits">
            {[["network","none"],["filesystem","read-only + /workspace"],["memory","512 MB"],["cpus","1"],["timeout","20s"],["user","1000:1000"]].map(([k,v]) => (
              <div key={k} className="flex justify-between py-1.5 text-[13px] border-b border-white/[0.05] last:border-0">
                <span className="text-hud-faint">{k}</span><span className="text-hud-dim font-mono">{v}</span>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </div>
  );
}
