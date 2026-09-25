import React from "react";
import { Panel, Stat, Bar, Gauge, Donut, Sparkline, Badge } from "../components/Hud";
import { TASK_MIX, TREND } from "../data/mock";

/* Plant summary: the instrument panels, stacked for the side panel.
   The 3D campus behind it is the live twin. */

export default function Overview({ setPage }) {
  return (
    <div className="space-y-3.5">
      <button onClick={() => setPage("agent")}
        className="w-full flex items-center gap-3 bg-hud-panel border border-hud-edge border-l-4 border-l-hud-amber px-4 py-2.5 text-left hover:border-hud-cyan">
        <span className="w-2 h-2 bg-hud-amber animate-pulse shrink-0" />
        <span className="min-w-0">
          <b className="block font-display font-semibold text-[18px] leading-none text-hud-text">P-101 Inspection Review</b>
          <i className="block text-[13px] text-hud-dim not-italic mt-1">qwen2.5-14b-instruct · stage VERIFY · 3 sources</i>
        </span>
        <span className="ml-auto"><Badge tone="amber">open</Badge></span>
      </button>

      <Panel title="Overview" meta="live">
        <div className="grid grid-cols-2 gap-y-4 gap-x-3">
          <Stat value="3" label="Models loaded" />
          <Stat value="6" label="Tools registered" />
          <Stat value="2,342" label="Tasks run" />
          <Stat value="342" label="KB documents" />
        </div>
      </Panel>

      <Panel title="Task classification">
        <div className="flex items-center gap-4">
          <Donut slices={TASK_MIX} />
          <div className="flex flex-col gap-1.5 text-[13px] w-full">
            {TASK_MIX.slice(0, 5).map(s => (
              <span key={s.label} className="flex items-center gap-2 text-hud-dim">
                <i className="w-2 h-2 shrink-0" style={{ background: s.color }} />
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

      <Panel title="Compute" meta="node-01">
        <Gauge value={61} />
        <div className="flex justify-around text-center mt-1">
          <span><b className="block font-display font-bold text-[24px] text-hud-cyan">1</b><i className="text-[12px] text-hud-dim not-italic">Running</i></span>
          <span><b className="block font-display font-bold text-[24px] text-hud-amber">2</b><i className="text-[12px] text-hud-dim not-italic">Queued</i></span>
          <span><b className="block font-display font-bold text-[24px] text-hud-text">9.1</b><i className="text-[12px] text-hud-dim not-italic">GB VRAM</i></span>
        </div>
      </Panel>

      <Panel title="Findings today">
        <div className="flex text-center">
          {[["1", "Critical", "text-hud-red"], ["2", "High", "text-hud-amber"], ["4", "Medium", "text-hud-cyan"], ["9", "Low", "text-hud-dim"]].map(([n, l, c]) => (
            <span key={l} className="flex-1">
              <b className={`block font-display font-bold text-[28px] leading-none ${c}`}>{n}</b>
              <i className="text-[12px] text-hud-dim not-italic">{l}</i>
            </span>
          ))}
        </div>
      </Panel>

      <Panel title="Tasks per day">
        <Sparkline points={TREND} />
        <div className="flex justify-between text-[12px] text-hud-dim mt-1">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => <span key={d}>{d}</span>)}
        </div>
      </Panel>
    </div>
  );
}
