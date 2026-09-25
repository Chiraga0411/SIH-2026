import React, { useEffect, useMemo, useRef, useState } from "react";
import { createCampus } from "./campus/scene";
import { AGENT_DEFS, OVERVIEW, PAGE_LABEL } from "./campus/agents";
import { getUser, logout } from "./api/client";
import { useApi } from "./api/useApi";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import Agent from "./pages/Agent";
import Knowledge from "./pages/Knowledge";
import Models from "./pages/Models";
import Sandbox from "./pages/Sandbox";
import Multimodal from "./pages/Multimodal";
import Sovereignty from "./pages/Sovereignty";
import Audit from "./pages/Audit";
import Projects from "./pages/Projects";
import Evaluation from "./pages/Evaluation";

const PAGES = {
  overview: Overview, agent: Agent, knowledge: Knowledge, models: Models,
  sandbox: Sandbox, multimodal: Multimodal, sovereignty: Sovereignty,
  audit: Audit, projects: Projects, evaluation: Evaluation,
};
const BUILDINGS = [OVERVIEW, ...AGENT_DEFS];
const BY_ID = Object.fromEntries(BUILDINGS.map(b => [b.id, b]));
// which building shows which page
const PAGE_HOME = Object.fromEntries(BUILDINGS.flatMap(b => b.pages.map(p => [p, b.id])));

export default function App() {
  const [user, setUserState] = useState(getUser);
  const signedIn = !!user;
  const [focus, setFocus] = useState(null);          // null = whole campus
  const [tab, setTab] = useState("sovereignty");     // control tower has two pages
  const [lite, setLite] = useState(false);
  const [jobs, setJobs] = useState(0);
  const [toast, setToast] = useState("");
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const toastTimer = useRef(0);

  // live gateway feeds for the always-on header
  const { data: sov } = useApi("/api/sovereignty/status", { poll: 3000, enabled: signedIn });
  const { data: queue } = useApi("/api/tasks/queue", { poll: 4000, enabled: signedIn });

  const open = (id, page) => { if (page) setTab(page); setFocus(id); };
  const goPage = pid => open(PAGE_HOME[pid], pid);

  useEffect(() => {
    if (!signedIn) return;
    document.body.classList.add("campus-on");
    const scene = createCampus(canvasRef.current, { panelWidth: 480, onPick: id => open(id) });
    sceneRef.current = scene;
    return () => { scene.destroy(); sceneRef.current = null; document.body.classList.remove("campus-on"); };
  }, [signedIn]);

  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    if (focus && focus !== "overview") s.focus(focus); else s.home();
  }, [focus, signedIn]);

  useEffect(() => { sceneRef.current && sceneRef.current.setLite(lite); }, [lite, signedIn]);

  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") setFocus(null); };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  // small effects pages can trigger; each one lights up the matching building
  const fx = useMemo(() => {
    const scene = () => sceneRef.current;
    const say = t => { setToast(t); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(""), 2800); };
    return {
      toast: say,
      busy: (id, ms) => {
        const s = scene(); if (!s) return;
        s.setActive(id, true); s.pulseFrom(id); setJobs(j => j + 1);
        setTimeout(() => { s.setActive(id, false); setJobs(j => Math.max(0, j - 1)); }, ms);
      },
      pulse: id => { scene() && scene().pulseFrom(id); },
      blocked: id => {
        const s = scene();
        if (s) { if (id === "code") s.flashSandbox(); else s.ping(id); }
        say("Blocked. External connections stay at 0.");
      },
      approved: () => { say("Note approved and recorded."); scene() && scene().pulseBetween("tower", "studio"); },
    };
  }, []);

  if (!signedIn) return <Login onEnter={u => setUserState(u)} />;

  const b = focus && BY_ID[focus];
  const pageId = b ? (b.pages.length > 1 ? tab : b.pages[0]) : null;
  const Page = pageId ? PAGES[pageId] : null;
  const ext = sov?.externalConnections ?? 0;
  const blocked = sov?.blockedAttempts?.length ?? 0;
  const localCount = (sov?.localServices?.length ?? 0) + jobs;
  const gpu = sov?.gpu?.present
    ? { used: (sov.gpu.usedMB / 1024), total: (sov.gpu.totalMB / 1024), util: sov.gpu.utilPercent }
    : null;
  const running = queue?.filter(q => q.state === "running").length ?? 0;
  const waiting = queue?.filter(q => q.state === "queued").length ?? 0;

  const signOut = () => { logout(); setUserState(null); setFocus(null); };

  return (
    <>
      <canvas id="scene" ref={canvasRef}
        aria-label="3D campus. Each building is one area of the workbench. Use the list to open one." />

      <header className="brand">
        <h1>Sovereign Workbench</h1>
        <p>Runs on this server. Nothing leaves the building.</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[12px] border border-hud-edge px-[7px] leading-[18px] text-hud-dim whitespace-nowrap">
            {user.name} · {user.role} · {user.clearance}
          </span>
          <button onClick={signOut}
            className="text-[12px] border border-hud-edge px-[7px] leading-[18px] text-hud-dim hover:text-hud-text hover:border-hud-cyan whitespace-nowrap">
            Sign out
          </button>
        </div>
      </header>

      <section className="monitor" aria-label="Sovereignty monitor">
        <div className={`m ext ${ext === 0 ? "" : "alert"}`}><b>{ext}</b><span>External connections</span></div>
        <div className="m"><b>{localCount}</b><span>Local connections</span></div>
        <div className="m"><b>{blocked}</b><span>Blocked attempts</span></div>
        <div className="m gpu">
          {gpu
            ? <>
                <div className="bar"><i style={{ width: `${Math.min(100, (gpu.used / gpu.total) * 100)}%` }} /></div>
                <span>GPU {gpu.used.toFixed(1)} / {gpu.total.toFixed(1)} GB · {gpu.util}%</span>
              </>
            : <span className="pt-2">GPU — no nvidia-smi on this host</span>}
        </div>
      </section>

      <nav id="rail" aria-label="Areas">
        <div className="agents">
          {BUILDINGS.map(a => (
            <button key={a.id} className={`ab${focus === a.id ? " on" : ""}`} style={{ "--c": a.color }}
              onClick={() => open(a.id)} aria-current={focus === a.id ? "page" : undefined}>
              <span><b>{a.name}</b><small>{a.short}</small></span>
            </button>
          ))}
        </div>
        <div className="controls">
          <button className="btn ghost" onClick={() => setFocus(null)}>Whole campus</button>
          <label className="chk">
            <input type="checkbox" checked={lite} onChange={e => setLite(e.target.checked)} /> Lite graphics
          </label>
        </div>
      </nav>

      <aside id="panel" className={b ? "open" : ""} style={{ "--agent": b ? b.color : "#59d4ff" }}
        aria-label="Workbench panel" tabIndex={-1}>
        {b && (
          <>
            <div className="phead">
              <div>
                <h2>{b.name}</h2>
                {b.model && <p className="model">Model: <b>{b.model}</b></p>}
              </div>
              <button className="btn ghost" onClick={() => setFocus(null)}>Back to campus</button>
            </div>
            {b.pages.length > 1 && (
              <div className="tabs" role="tablist">
                {b.pages.map(p => (
                  <button key={p} role="tab" aria-selected={tab === p} className={tab === p ? "on" : ""} onClick={() => setTab(p)}>
                    {PAGE_LABEL[p]}
                  </button>
                ))}
              </div>
            )}
            <div className="pbody" key={pageId}>
              <Page setPage={goPage} fx={fx} user={user} />
            </div>
          </>
        )}
      </aside>

      <div className="ticker">
        <b>offline</b> · node-01 · egress {ext === 0 ? "0 bytes" : `${ext} external!`} · queue {running} running, {waiting} waiting · audit chain live · {user.name}, {user.role}, {user.clearance}
      </div>
      <div id="toast" role="status" className={toast ? "show" : ""}>{toast}</div>
    </>
  );
}
