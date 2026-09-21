import React, { useState } from "react";
import { Topbar, StatusStrip, NavRail } from "./components/Chrome";
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

export default function App() {
  const [signedIn, setSignedIn] = useState(false);
  const [page, setPage] = useState("overview");

  if (!signedIn) return <Login onEnter={() => setSignedIn(true)} />;

  const Page = PAGES[page];
  return (
    <div className="min-h-screen min-w-0">
      <Topbar />
      <StatusStrip />
      <div className="flex items-stretch">
        <NavRail page={page} setPage={setPage} />
        <main className="hud-main flex-1 min-w-0">
          <Page setPage={setPage} />
        </main>
      </div>
    </div>
  );
}
