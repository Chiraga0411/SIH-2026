import React, { useEffect, useMemo, useRef, useState } from "react";
import { createCampus } from "./campus/scene";
import { AGENT_DEFS, OVERVIEW, PAGE_LABEL } from "./campus/agents";
import { USER, LOCAL_CONNS, EGRESS } from "./data/mock";
import { api } from "./api";
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
  const [signedIn, setSignedIn] = useState(false);
  const [focus, setFocus] = useState(null);          // null = whole campus
  const [tab, setTab] = useState("sovereignty");     // control tower has two pages
  const [lite, setLite] = useState(false);
  const [blocked, setBlocked] = useState(EGRESS.length);
  const [jobs, setJobs] = useState(0);
  const [toast, setToast] = useState("");
  const [live, setLive] = useState(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const toastTimer = useRef(0);

  const open = (id, page) => { if (page) setTab(page); setFocus(id); };
  const goPage = pid => open(PAGE_HOME[pid], pid);

  useEffect(() => {
    if (!signedIn) return;
    api.dashboard().then(setLive).catch(() => {});
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
        setBlocked(b => b + 1);
        const s = scene(); if (!s) return;
        if (id === "code") s.flashSandbox(); else s.ping(id);
        say("Blocked. External connections stay at 0.");
      },
      approved: () => { say("Note approved and recorded."); scene() && scene().pulseBetween("tower", "studio"); },
    };
  }, []);

  if (!signedIn) return <Login onEnter={() => setSignedIn(true)} />;

  const b = focus && BY_ID[focus];
  const pageId = b ? (b.pages.length > 1 ? tab : b.pages[0]) : null;
  const Page = pageId ? PAGES[pageId] : null;
  const gpu = jobs > 0 ? 5.1 : 3.7;

  return (
    <>
      <canvas id="scene" ref={canvasRef}
        aria-label="3D campus. Each building is one area of the workbench. Use the list to open one." />

      <header className="brand">
        <h1>Sovereign Workbench</h1>
        <p>Runs on this server. Nothing leaves the building.</p>
      </header>

      <section className="monitor" aria-label="Sovereignty monitor">
        <div className="m ext"><b>0</b><span>External connections</span></div>
        <div className="m"><b>{LOCAL_CONNS.length + jobs}</b><span>Local connections</span></div>
        <div className="m"><b>{blocked}</b><span>Blocked attempts</span></div>
        <div className="m gpu">
          <div className="bar"><i style={{ width: `${(gpu / 6) * 100}%` }} /></div>
          <span>GPU {gpu.toFixed(1)} / 6.0 GB</span>
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
              <Page setPage={goPage} fx={fx} live={live} />
            </div>
          </>
        )}
      </aside>

      <div className="ticker">
        <b>offline</b> · node-01 · egress 0 bytes · model qwen2.5-14b-instruct · audit chain verified · queue 1 running, 2 waiting · {USER.name}, {USER.role}, {USER.clearance}
      </div>
      <div id="toast" role="status" className={toast ? "show" : ""}>{toast}</div>
    </>
  );
}
