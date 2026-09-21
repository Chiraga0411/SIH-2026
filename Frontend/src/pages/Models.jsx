import React, { useState } from "react";
import { Panel, Badge, Gauge } from "../components/Hud";
import { PageHead, Button } from "../components/Chrome";
import { MODELS, ROUTING_LOG } from "../data/mock";

/* Registry + router. New models are added by editing the registry file;
   the UI picks them up without a restart. Every routing decision is
   logged with the reason it was made. */

const STATE_TONE = { active:"green", idle:"dim", resident:"cyan" };

export default function Models() {
  const [models, setModels] = useState(MODELS);
  const [added, setAdded] = useState(false);

  const hotAdd = () => {
    if (added) return;
    setAdded(true);
    setModels([...models, {
      id:"gemma-vision", name:"Gemma-3-12B-Vision", caps:["vision","reasoning"],
      ctx:32768, vram:"8.2 GB", tps:22, load:"5.1s", state:"idle", enabled:true,
    }]);
  };

  return (
    <div className="p-4 sm:p-5">
      <PageHead
        title="Models and routing"
        sub="Every call goes through one OpenAI-compatible client, so Ollama, vLLM and llama.cpp are interchangeable"
        actions={<Button variant="primary" onClick={hotAdd}>{added ? "Registry reloaded" : "Reload registry"}</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-3.5 items-start">
        <div className="space-y-3.5">
          <Panel title="Model registry" meta={models.length + " entries · registry.yaml"}>
            <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11.5px] min-w-[720px]">
              <thead>
                <tr className="text-[9.5px] text-hud-faint tracking-wide">
                  {["Model","Capabilities","Context","VRAM","Tok/s","Load","State"].map(h => (
                    <th key={h} className="text-left font-normal pb-2 border-b border-hud-edge/60">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {models.map(m => (
                  <tr key={m.id} className={m.id === "gemma-vision" ? "bg-hud-cyan/[0.07]" : ""}>
                    <td className="py-2.5 border-b border-white/[0.05] pr-3 text-hud-text">{m.name}</td>
                    <td className="py-2.5 border-b border-white/[0.05] pr-3">
                      <span className="flex gap-1 flex-wrap">{m.caps.map(c => <Badge key={c}>{c}</Badge>)}</span>
                    </td>
                    <td className="py-2.5 border-b border-white/[0.05] pr-3 text-hud-dim">{(m.ctx/1024)}k</td>
                    <td className="py-2.5 border-b border-white/[0.05] pr-3 text-hud-dim">{m.vram}</td>
                    <td className="py-2.5 border-b border-white/[0.05] pr-3 text-hud-dim">{m.tps}</td>
                    <td className="py-2.5 border-b border-white/[0.05] pr-3 text-hud-dim">{m.load}</td>
                    <td className="py-2.5 border-b border-white/[0.05]"><Badge tone={STATE_TONE[m.state]}>{m.state}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <p className="text-[10.5px] text-hud-faint mt-3 leading-relaxed">
              {added
                ? "Gemma-3-12B-Vision was added by dropping an entry into registry.yaml. No code change, no restart, and it is routable immediately."
                : "Add a model by appending an entry to registry.yaml. Reload picks it up live."}
            </p>
          </Panel>

          <Panel title="Routing decisions" meta="every choice is logged with its reason">
            {ROUTING_LOG.map((r, i) => (
              <div key={i} className="flex gap-2 sm:gap-3 py-2.5 border-b border-white/[0.05] last:border-0">
                <span className="text-[9.5px] text-hud-faint w-14 shrink-0 pt-0.5">{r.t}</span>
                <span className="flex-1 min-w-0">
                  <b className="block text-[11.5px] text-hud-text font-medium">{r.task}</b>
                  <i className="block text-[10.5px] text-hud-dim not-italic mt-0.5">{r.why}</i>
                </span>
                <span className="text-[10.5px] text-hud-cyan shrink-0 pt-0.5 text-right">{r.picked}</span>
              </div>
            ))}
          </Panel>
        </div>

        <div className="space-y-3.5">
          <Panel title="VRAM budget" meta="RTX 4050 · 6 GB">
            <Gauge value={61} unit="% USED" />
            <p className="text-[10.5px] text-hud-faint leading-relaxed mt-2">
              One 7–8B model fits in VRAM at a time on this machine. Ollama swaps on demand;
              the production target is a GPU server that holds several at once.
            </p>
          </Panel>

          <Panel title="Router rules" meta="stage 1 · fast">
            {[["image or scanned PDF input","vision"],["stack trace or run code","code"],["summarise, draft, note","reasoning"],["ambiguous","tiny LLM classifier"]].map(([cond, out]) => (
              <div key={cond} className="flex items-center gap-2 py-2 text-[11px] border-b border-white/[0.05] last:border-0">
                <span className="text-hud-dim flex-1">{cond}</span>
                <span className="text-hud-faint">to</span>
                <Badge tone="cyan">{out}</Badge>
              </div>
            ))}
          </Panel>

          <Panel title="Escalation">
            <p className="text-[11.5px] text-hud-dim leading-relaxed">
              If a small model fails verification twice, the router escalates to the strongest
              enabled model with the same capability and records why.
            </p>
            <div className="mt-3 text-[10.5px] text-hud-amber">1 escalation today · 08:51</div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
