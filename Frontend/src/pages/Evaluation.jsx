import React from "react";
import { Panel, Badge, Bar } from "../components/Hud";
import { PageHead, Button } from "../components/Chrome";
import { EVAL_RETRIEVAL, EVAL_TASKS, MODELS } from "../data/mock";

/* Numbers, not adjectives. Retrieval measured against a fixed question
   set, agent tasks measured by success rate, and model throughput
   measured on the actual demo hardware. */

export default function Evaluation() {
  return (
    <div className="p-5">
      <PageHead
        title="Evaluation"
        sub="30 question knowledge set · 40 agent runs · benchmarks taken on the demo machine"
        actions={<Button variant="primary">Re-run harness</Button>}
      />

      <div className="grid grid-cols-3 gap-3.5 items-start">
        <Panel title="Retrieval configuration" meta="hit rate and correctness">
          <table className="w-full border-collapse text-[11.5px]">
            <thead>
              <tr className="text-[9.5px] text-hud-faint tracking-wide">
                {["Configuration","Hit@1","Hit@5","Correct"].map(h => (
                  <th key={h} className="text-left font-normal pb-2 border-b border-hud-edge/60">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {EVAL_RETRIEVAL.map((r, i) => (
                <tr key={r.config} className={i === 2 ? "text-hud-cyan" : ""}>
                  <td className="py-2.5 border-b border-white/[0.05] pr-3">{r.config}</td>
                  <td className="py-2.5 border-b border-white/[0.05] pr-3">{r.hit1}</td>
                  <td className="py-2.5 border-b border-white/[0.05] pr-3">{r.hit5}</td>
                  <td className="py-2.5 border-b border-white/[0.05]">{r.correct}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] text-hud-faint leading-relaxed mt-3">
            The reranker is worth 13 points of answer correctness over plain vector search on
            this document set.
          </p>
        </Panel>

        <Panel title="Agent task success" meta="10 runs each">
          {EVAL_TASKS.map(t => (
            <div key={t.task} className="py-2.5 border-b border-white/[0.05] last:border-0">
              <div className="flex justify-between text-[11.5px] mb-1.5">
                <span className="text-hud-text">{t.task}</span>
                <span className="text-hud-dim">{t.success}/{t.runs} · {t.avg}</span>
              </div>
              <div className="h-[3px] bg-white/[0.07]">
                <div className={`h-full ${t.success >= 9 ? "bg-hud-green" : "bg-hud-amber"}`}
                     style={{ width: (t.success / t.runs * 100) + "%" }} />
              </div>
            </div>
          ))}
          <p className="text-[10px] text-hud-faint leading-relaxed mt-3">
            P&ID extraction is the weakest task and is reported as such, with a human review step
            in the workflow.
          </p>
        </Panel>

        <Panel title="Model benchmark" meta="RTX 4050 · 6 GB">
          <table className="w-full border-collapse text-[11.5px]">
            <thead>
              <tr className="text-[9.5px] text-hud-faint tracking-wide">
                {["Model","Tok/s","Load","VRAM"].map(h => (
                  <th key={h} className="text-left font-normal pb-2 border-b border-hud-edge/60">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODELS.filter(m => m.tps !== "—").map(m => (
                <tr key={m.id}>
                  <td className="py-2.5 border-b border-white/[0.05] pr-3 text-hud-text">{m.name.split("-").slice(0,2).join("-")}</td>
                  <td className="py-2.5 border-b border-white/[0.05] pr-3 text-hud-cyan">{m.tps}</td>
                  <td className="py-2.5 border-b border-white/[0.05] pr-3 text-hud-dim">{m.load}</td>
                  <td className="py-2.5 border-b border-white/[0.05] text-hud-dim">{m.vram}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4">
            <Bar label="Deliverables passing visual self-check" value={94} />
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
