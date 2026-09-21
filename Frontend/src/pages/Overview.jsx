import React from "react";
import TwinScene from "../components/TwinScene";
import { Panel, Stat, Bar, Gauge, Donut, Sparkline, Badge } from "../components/Hud";
import { TASK_MIX, TREND } from "../data/mock";

/* Landing view: a live plant twin framed by HUD instrument panels. */

export default function Overview({ setPage }) {
  return (
    <div className="relative min-h-[calc(100vh-118px)]">
      <div className="hud-twin absolute inset-0">
        <TwinScene hotspotLabel="P-101 · active task" />
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row justify-between gap-5 p-4 sm:p-5 pointer-events-none">
        <div className="w-full lg:w-[262px] space-y-3.5 pointer-events-auto">
          <Panel title="Overview" meta="live">
            <div className="grid grid-cols-2 gap-y-4 gap-x-3">
              <Stat value="3" label="MODELS LOADED" />
              <Stat value="6" label="TOOLS REGISTERED" />
              <Stat value="2,342" label="TASKS RUN" />
              <Stat value="342" label="KB DOCUMENTS" />
            </div>
          </Panel>

          <Panel title="Task classification">
            <div className="flex items-center gap-4">
              <Donut slices={TASK_MIX} />
              <div className="flex flex-col gap-1.5 text-[10px] w-full">
                {TASK_MIX.slice(0, 5).map(s => (
                  <span key={s.label} className="flex items-center gap-2 text-hud-dim">
                    <i className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.color }} />
                    {s.label}
                    <b className="ml-auto text-hud-text font-medium">{s.value}%</b>
                  </span>
                ))}
              </div>
            </div>
          </Panel>

          <Panel title="System health">
            <Bar label="Knowledge base coverage" value={84} />
            <Bar label="Sandbox test pass rate" value={92} />
            <Bar label="Egress integrity" value={100} />
          </Panel>
        </div>

        <div className="w-full lg:w-[262px] space-y-3.5 pointer-events-auto">
          <Panel title="Compute" meta="node-01">
            <Gauge value={61} />
            <div className="flex justify-around text-center mt-1">
              <span><b className="block font-display font-bold text-lg text-hud-cyan">1</b><i className="text-[9px] text-hud-faint not-italic">RUNNING</i></span>
              <span><b className="block font-display font-bold text-lg text-hud-amber">2</b><i className="text-[9px] text-hud-faint not-italic">QUEUED</i></span>
              <span><b className="block font-display font-bold text-lg text-white">9.1</b><i className="text-[9px] text-hud-faint not-italic">GB VRAM</i></span>
            </div>
          </Panel>

          <Panel title="Findings today">
            <div className="flex text-center">
              {[["1","Critical","text-hud-red"],["2","High","text-hud-amber"],["4","Medium","text-hud-cyan"],["9","Low","text-hud-faint"]].map(([n,l,c]) => (
                <span key={l} className="flex-1">
                  <b className={`block font-display font-bold text-[22px] ${c}`}>{n}</b>
                  <i className="text-[9px] text-hud-dim not-italic">{l}</i>
                </span>
              ))}
            </div>
          </Panel>

          <Panel title="Tasks per day">
            <Sparkline points={TREND} />
            <div className="flex justify-between text-[8px] text-hud-faint mt-1">
              {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => <span key={d}>{d}</span>)}
            </div>
          </Panel>
        </div>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 top-4 z-10 px-4 w-full max-w-[420px] lg:w-auto lg:max-w-none">
        <button onClick={() => setPage("agent")}
          className="w-full flex items-center gap-3 sm:gap-4 bg-hud-panel border border-hud-edge backdrop-blur-sm px-4 sm:px-5 py-2.5 text-left hover:border-hud-cyan/60">
          <span className="w-2 h-2 rounded-full bg-hud-amber shadow-[0_0_8px_#FF9A4D] animate-pulse shrink-0" />
          <span>
            <b className="block font-display font-bold text-[15px] text-white">P-101 Inspection Review</b>
            <i className="block text-[9.5px] text-hud-faint not-italic mt-0.5">qwen2.5-14b-instruct · stage VERIFY · 3 sources</i>
          </span>
          <Badge tone="amber">open</Badge>
        </button>
      </div>
    </div>
  );
}
