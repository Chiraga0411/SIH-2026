import React from "react";
import { Panel, Stat, Bar, Gauge, Donut, Sparkline, Badge } from "../components/Hud";
import { TASK_MIX, TREND } from "../data/mock";
import { useApi } from "../api/useApi";

/* Plant summary: instrument panels built from live gateway reads. The 3D
   campus behind it is the visual twin. */

export default function Overview({ setPage }) {
  const { data: models } = useApi("/api/models");
  const { data: tasks } = useApi("/api/tasks", { poll: 4000 });
  const { data: docs } = useApi("/api/knowledge/docs");
  const { data: queue } = useApi("/api/tasks/queue", { poll: 4000 });
  const { data: sov } = useApi("/api/sovereignty/status", { poll: 5000 });
  const { data: verify } = useApi("/api/audit/verify");
  const { data: runs } = useApi("/api/sandbox/runs");

  const taskList = tasks || [];
  const open = taskList.find(t => ["running", "queued"].includes(t.status))
    || taskList.find(t => t.status === "awaiting_approval")
    || taskList[0];

  const enabled = (models || []).filter(m => m.enabled).length;
  const running = (queue || []).filter(q => q.state === "running").length;
  const waiting = (queue || []).filter(q => q.state === "queued").length;
  const approved = taskList.filter(t => t.status === "approved").length;
  const awaiting = taskList.filter(t => t.status === "awaiting_approval").length;
  const flagged = taskList.filter(t => t.injection).length;

  const sandboxRuns = runs || [];
  const passRate = sandboxRuns.length
    ? Math.round((sandboxRuns.filter(r => r.status === "pass").length / sandboxRuns.length) * 100)
    : null;
  const egressOk = (sov?.externalConnections ?? 1) === 0;
  const chainOk = verify?.ok;

  const gpu = sov?.gpu?.present
    ? Math.round((sov.gpu.usedMB / sov.gpu.totalMB) * 100)
    : null;

  return (
    <div className="space-y-3.5">
      {open && (
        <button onClick={() => setPage("agent")}
          className="w-full flex items-center gap-3 bg-hud-panel border border-hud-edge border-l-4 border-l-hud-amber px-4 py-2.5 text-left hover:border-hud-cyan">
          <span className="w-2 h-2 bg-hud-amber animate-pulse shrink-0" />
          <span className="min-w-0">
            <b className="block font-display font-semibold text-[18px] leading-none text-hud-text truncate">{open.title}</b>
            <i className="block text-[13px] text-hud-dim not-italic mt-1 truncate">
              {open.routing?.model?.name} · stage {open.stage} · {open.status.replace("_", " ")}
            </i>
          </span>
          <span className="ml-auto"><Badge tone="amber">open</Badge></span>
        </button>
      )}

      <Panel title="Overview" meta="live from the gateway">
        <div className="grid grid-cols-2 gap-y-4 gap-x-3">
          <Stat value={enabled} label="Models enabled" />
          <Stat value="9" label="Tools registered" />
          <Stat value={taskList.length} label="Tasks run" />
          <Stat value={(docs || []).length} label="KB documents" />
        </div>
      </Panel>

      <Panel title="Task status" meta="this gateway">
        <div className="flex text-center">
          {[[running, "Running", "text-hud-cyan"], [awaiting, "Awaiting", "text-hud-amber"],
            [approved, "Approved", "text-hud-green"], [flagged, "Flagged", "text-hud-red"]].map(([n, l, c]) => (
            <span key={l} className="flex-1">
              <b className={`block font-display font-bold text-[28px] leading-none ${c}`}>{n}</b>
              <i className="text-[12px] text-hud-dim not-italic">{l}</i>
            </span>
          ))}
        </div>
      </Panel>

      <Panel title="Task classification" meta="baseline mix">
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

      <Panel title="System health" meta="computed live">
        <Bar label="Egress integrity" value={egressOk ? 100 : 0} />
        <Bar label="Audit chain" value={chainOk ? 100 : chainOk === false ? 0 : 100} />
        <Bar label="Sandbox test pass rate" value={passRate ?? 0} suffix={passRate === null ? "%" : "%"} />
        {passRate === null && <p className="text-[12px] text-hud-faint -mt-2">No sandbox runs yet — run one in the Code lab.</p>}
      </Panel>

      <Panel title="Compute" meta={sov?.gpu?.present ? "nvidia-smi" : "no GPU telemetry"}>
        <Gauge value={gpu ?? 0} />
        <div className="flex justify-around text-center mt-1">
          <span><b className="block font-display font-bold text-[24px] text-hud-cyan">{running}</b><i className="text-[12px] text-hud-dim not-italic">Running</i></span>
          <span><b className="block font-display font-bold text-[24px] text-hud-amber">{waiting}</b><i className="text-[12px] text-hud-dim not-italic">Queued</i></span>
          <span><b className="block font-display font-bold text-[24px] text-hud-text">{sov?.gpu?.present ? (sov.gpu.usedMB / 1024).toFixed(1) : "—"}</b><i className="text-[12px] text-hud-dim not-italic">GB VRAM</i></span>
        </div>
        {gpu === null && <p className="text-[12px] text-hud-faint text-center mt-2">No nvidia-smi on this host — figures appear on GPU machines.</p>}
      </Panel>

      <Panel title="Tasks per day" meta="baseline trend">
        <Sparkline points={TREND} />
        <div className="flex justify-between text-[12px] text-hud-dim mt-1">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => <span key={d}>{d}</span>)}
        </div>
      </Panel>
    </div>
  );
}
