import React, { useState } from "react";
import { Panel, Badge, Gauge } from "../components/Hud";
import { PageHead, Button } from "../components/Chrome";
import { useApi } from "../api/useApi";
import { api } from "../api/client";

/* Registry + router, live. New models are added by posting an entry to the
   registry; selection is capability-based, so a hot-added model is
   routable with no code change and no restart. Every routing decision is
   logged with the reason it was made. */

const STATE_TONE = { active: "green", idle: "dim", resident: "cyan", new: "cyan" };

const HOT_ADD = {
  name: "Gemma-3-12B-Vision", capabilities: ["vision", "reasoning"],
  ctx: 32768, vram: "8.2 GB", tps: 22, load: "5.1s", source: "ollama (local, pre-pulled)",
};

export default function Models({ fx }) {
  const { data: models, reload } = useApi("/api/models");
  const { data: log } = useApi("/api/models/routing-log", { poll: 5000 });
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [err, setErr] = useState("");

  const list = models || [];

  const hotAdd = async () => {
    if (added || adding) return;
    setAdding(true);
    setErr("");
    try {
      await api("/api/models", { method: "POST", body: HOT_ADD });
      setAdded(true);
      fx?.pulse("router");
      fx?.toast("Model added to the registry. No restart needed.");
      reload();
    } catch (e) {
      setErr(e.message);
      fx?.toast(`Hot-add failed: ${e.message}`);
    } finally {
      setAdding(false);
    }
  };

  const toggle = async (m) => {
    try {
      await api(`/api/models/${m.id}`, { method: "PATCH", body: { enabled: !m.enabled } });
      fx?.toast(`${m.name} ${m.enabled ? "disabled" : "enabled"} — router sees it immediately.`);
      reload();
    } catch (e) { setErr(e.message); }
  };

  return (
    <div>
      <PageHead
        sub="Every call goes through one OpenAI-compatible client, so Ollama, vLLM and llama.cpp are interchangeable"
        actions={<Button variant="primary" onClick={hotAdd} disabled={added || adding}>
          {adding ? "Writing registry…" : added ? "Registry reloaded" : "Hot-add a model"}
        </Button>}
      />

      {err && <div className="border border-hud-red/50 bg-hud-red/[0.07] px-3.5 py-2.5 mb-3.5 text-[13px] text-hud-dim">{err}</div>}

      <div className="grid grid-cols-1 gap-3.5 items-start">
        <div className="space-y-3.5">
          <Panel title="Model registry" meta={`${list.length} entries · live`}>
            <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px] min-w-[720px]">
              <thead>
                <tr className="text-[12px] text-hud-faint">
                  {["Model", "Capabilities", "Context", "VRAM", "Tok/s", "Load", "State"].map(h => (
                    <th key={h} className="text-left font-normal pb-2 border-b border-hud-edge/60">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map(m => (
                  <tr key={m.id} className={m.addedAt ? "bg-hud-cyan/[0.07]" : ""}>
                    <td className="py-2.5 border-b border-white/[0.05] pr-3 text-hud-text">{m.name}</td>
                    <td className="py-2.5 border-b border-white/[0.05] pr-3">
                      <span className="flex gap-1 flex-wrap">{(m.capabilities || []).map(c => <Badge key={c}>{c}</Badge>)}</span>
                    </td>
                    <td className="py-2.5 border-b border-white/[0.05] pr-3 text-hud-dim">{Math.round((m.ctx || 0) / 1024)}k</td>
                    <td className="py-2.5 border-b border-white/[0.05] pr-3 text-hud-dim">{m.vram}</td>
                    <td className="py-2.5 border-b border-white/[0.05] pr-3 text-hud-dim">{m.tps}</td>
                    <td className="py-2.5 border-b border-white/[0.05] pr-3 text-hud-dim">{m.load}</td>
                    <td className="py-2.5 border-b border-white/[0.05]">
                      <button onClick={() => toggle(m)} title="Click to enable/disable for routing">
                        <Badge tone={m.enabled ? (STATE_TONE[m.state] || "cyan") : "red"}>
                          {m.enabled ? (m.state || "enabled") : "disabled"}
                        </Badge>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <p className="text-[13px] text-hud-faint mt-3 leading-relaxed">
              {added
                ? `${HOT_ADD.name} was added by posting an entry to the registry. No code change, no restart — it is routable immediately. Click a state badge to disable a model and watch the router avoid it.`
                : "Add a model with “Hot-add a model” (or append to the registry file). Routing picks by capability, not by name, so nothing restarts."}
            </p>
          </Panel>

          <Panel title="Routing decisions" meta="every choice is logged with its reason">
            {(log || []).length === 0 && (
              <p className="text-[13px] text-hud-faint">No routing decisions yet on this gateway — run a task in the Agent panel and it appears here live.</p>
            )}
            {(log || []).map((r, i) => (
              <div key={i} className="flex gap-2 sm:gap-3 py-2.5 border-b border-white/[0.05] last:border-0">
                <span className="text-[12px] text-hud-faint w-[68px] shrink-0 pt-0.5">{String(r.t).slice(11, 19)}</span>
                <span className="flex-1 min-w-0">
                  <b className="block text-[13px] text-hud-text font-medium">{r.task}</b>
                  <i className="block text-[13px] text-hud-dim not-italic mt-0.5 break-words">{r.why}</i>
                </span>
                <span className="text-[13px] text-hud-cyan shrink-0 pt-0.5 text-right">{r.picked}</span>
              </div>
            ))}
          </Panel>
        </div>

        <div className="space-y-3.5">
          <Panel title="VRAM budget" meta="live via nvidia-smi">
            <VramGauge />
            <p className="text-[13px] text-hud-faint leading-relaxed mt-2">
              On a 6 GB card one 7–8B model fits at a time; Ollama swaps on demand. The production
              target is a GPU server that holds several at once.
            </p>
          </Panel>

          <Panel title="Router rules" meta="stage 1 · fast">
            {[["image or scanned PDF input", "vision"], ["stack trace or run code", "code"], ["summarise, draft, note", "reasoning"], ["ambiguous", "tiny LLM classifier"]].map(([cond, out]) => (
              <div key={cond} className="flex items-center gap-2 py-2 text-[13px] border-b border-white/[0.05] last:border-0">
                <span className="text-hud-dim flex-1">{cond}</span>
                <span className="text-hud-faint">to</span>
                <Badge tone="cyan">{out}</Badge>
              </div>
            ))}
          </Panel>

          <Panel title="Escalation">
            <p className="text-[13px] text-hud-dim leading-relaxed">
              If a small model fails verification twice, the router escalates to the strongest
              enabled model with the same capability and records why. Stage-2 classification (the
              tiny LLM call) sits behind the same rules interface.
            </p>
            <div className="mt-3 text-[13px] text-hud-faint">Rule stage active · LLM classifier: designed, not built</div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function VramGauge() {
  const { data: sov } = useApi("/api/sovereignty/status", { poll: 5000 });
  if (!sov?.gpu?.present) {
    return (
      <div className="text-center py-5">
        <div className="font-display font-bold text-[28px] leading-none text-hud-dim">n/a</div>
        <div className="text-[12px] text-hud-faint mt-2">No nvidia-smi on this host</div>
      </div>
    );
  }
  const used = sov.gpu.usedMB / 1024, total = sov.gpu.totalMB / 1024;
  const pct = Math.round((sov.gpu.usedMB / sov.gpu.totalMB) * 100);
  return (
    <>
      <Gauge value={pct} />
      <div className="text-center text-[13px] text-hud-dim mt-1">
        {used.toFixed(1)} / {total.toFixed(1)} GB · {sov.gpu.utilPercent}% util
      </div>
    </>
  );
}
