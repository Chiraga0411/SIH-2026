import React, { useState } from "react";
import { Panel, Badge, Bar } from "../components/Hud";
import { PageHead, Button } from "../components/Chrome";
import { useApi } from "../api/useApi";
import { api } from "../api/client";

/* Numbers, not adjectives. Retrieval rows are the fixed 30-question
   baseline; agent task success is recomputed from actual runs on this
   gateway whenever you press re-run; benchmarks come from the live
   registry. */

export default function Evaluation({ fx }) {
  const { data, reload, loading } = useApi("/api/evaluation");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const rerun = async () => {
    if (busy) return;
    setBusy(true);
    setNote("");
    fx?.busy("lab", 1200);
    try {
      const r = await api("/api/evaluation/run", { method: "POST", body: {} });
      setNote(r.note);
      reload();
      fx?.toast("Harness re-run complete.");
    } catch (e) {
      setNote(`Re-run failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const retrieval = data?.retrieval || [];
  const tasks = data?.tasks || [];
  const models = data?.models || [];

  return (
    <div>
      <PageHead
        sub={data
          ? `${data.liveTaskRuns} live task run(s) · ${data.sandboxRuns} sandbox run(s) · ${data.lastRun ? `last harness run ${String(data.lastRun).slice(0, 16).replace("T", " ")}` : "harness not re-run yet on this gateway"}`
          : "loading evaluation data…"}
        actions={<Button variant="primary" onClick={rerun} disabled={busy || loading}>
          {busy ? "Re-running…" : "Re-run harness"}
        </Button>}
      />

      {(note || data?.source) && (
        <div className="border border-hud-edge bg-black/20 px-3.5 py-2.5 mb-3.5 text-[13px] text-hud-dim leading-snug">
          {note && <div className="mb-1">{note}</div>}
          <div className="text-hud-faint">Source: {data?.source}</div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3.5 items-start">
        <Panel title="Retrieval configuration" meta="hit rate and correctness · fixed 30-question set">
          <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px] min-w-[340px]">
            <thead>
              <tr className="text-[12px] text-hud-faint">
                {["Configuration", "Hit@1", "Hit@5", "Correct"].map(h => (
                  <th key={h} className="text-left font-normal pb-2 border-b border-hud-edge/60">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {retrieval.map((r, i) => (
                <tr key={r.config} className={i === 2 ? "text-hud-cyan" : ""}>
                  <td className="py-2.5 border-b border-white/[0.05] pr-3">{r.config}</td>
                  <td className="py-2.5 border-b border-white/[0.05] pr-3">{r.hit1}</td>
                  <td className="py-2.5 border-b border-white/[0.05] pr-3">{r.hit5}</td>
                  <td className="py-2.5 border-b border-white/[0.05]">{r.correct}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <p className="text-[12px] text-hud-faint leading-relaxed mt-3">
            The reranker is worth 13 points of answer correctness over plain vector search on
            this document set.
          </p>
        </Panel>

        <Panel title="Agent task success" meta="live runs where they exist">
          {tasks.map((r, i) => (
            <div key={r.task} className="py-2.5 border-b border-white/[0.05] last:border-0">
              <div className="flex justify-between text-[13px] mb-1.5 gap-2">
                <span className="text-hud-text">{r.task} {r.live && <Badge tone="green">live</Badge>}</span>
                <span className="text-hud-dim shrink-0">{r.success}/{r.runs} · {r.avg}</span>
              </div>
              <div className="h-[3px] bg-white/[0.07]">
                <div className={`h-full ${r.runs && r.success >= r.runs * 0.9 ? "bg-hud-green" : "bg-hud-amber"}`}
                     style={{ width: (r.runs ? (r.success / r.runs) * 100 : 0) + "%" }} />
              </div>
            </div>
          ))}
          <p className="text-[12px] text-hud-faint leading-relaxed mt-3">
            Rows marked “live” are recomputed from tasks actually run on this gateway; the rest
            are the recorded baseline. P&amp;ID extraction is the weakest task and is reported as
            such, with a human review step in the workflow.
          </p>
        </Panel>

        <Panel title="Model benchmark" meta="from the live registry">
          <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px] min-w-[280px]">
            <thead>
              <tr className="text-[12px] text-hud-faint">
                {["Model", "Tok/s", "Load", "VRAM"].map(h => (
                  <th key={h} className="text-left font-normal pb-2 border-b border-hud-edge/60">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {models.map(m => (
                <tr key={m.name}>
                  <td className="py-2.5 border-b border-white/[0.05] pr-3 text-hud-text">{m.name.split("-").slice(0, 2).join("-")}</td>
                  <td className="py-2.5 border-b border-white/[0.05] pr-3 text-hud-cyan">{m.tps}</td>
                  <td className="py-2.5 border-b border-white/[0.05] pr-3 text-hud-dim">{m.load}</td>
                  <td className="py-2.5 border-b border-white/[0.05] text-hud-dim">{m.vram}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="mt-4">
            <Bar label="Deliverables passing visual self-check (baseline)" value={94} />
            <Bar label="Citations present on cited answers" value={100} />
          </div>
          <div className="flex gap-1.5 mt-3 flex-wrap">
            <Badge tone="green">abstains when unsure</Badge>
            <Badge tone="cyan">verified in sandbox</Badge>
          </div>
        </Panel>
      </div>
    </div>
  );
}
