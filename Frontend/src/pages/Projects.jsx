import React, { useState } from "react";
import { Panel, Badge, Icon } from "../components/Hud";
import { PageHead, Button } from "../components/Chrome";
import { useApi } from "../api/useApi";
import { api } from "../api/client";

/* One server, many employees. Projects hold the work, and a single GPU
   is fair-queued with the position shown. Everything is read from the
   gateway: projects, live queue, and the activity feed off the audit log. */

const STATE_TONE = { running: "green", queued: "amber" };
const t = iso => String(iso || "").slice(11, 16);

const FEED = {
  task_created: "started a task",
  file_upload: "uploaded",
  approval_note_generated: "generated the approval note",
  approval_note_approved: "approved",
  project_created: "created the project",
  prompt_injection_flagged: "flagged an injection in",
  sandbox_run: "ran code in the sandbox",
  pid_tags_extracted: "extracted P&ID tags from",
  deliverable_generated: "generated a deliverable",
};

export default function Projects({ fx }) {
  const { data: projects, reload } = useApi("/api/projects");
  const { data: queue } = useApi("/api/tasks/queue", { poll: 3000 });
  const { data: audit } = useApi("/api/audit", { poll: 5000 });
  const [busy, setBusy] = useState(false);

  const newProject = async () => {
    const name = window.prompt("Project name:");
    if (!name?.trim() || busy) return;
    setBusy(true);
    try {
      await api("/api/projects", { method: "POST", body: { name: name.trim(), visibility: "Private" } });
      fx?.toast(`Project “${name.trim()}” created.`);
      reload();
    } catch (e) {
      fx?.toast(`Could not create project: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const list = projects || [];
  const q = queue || [];
  const feed = (audit || []).filter(a => FEED[a.action]).slice(0, 8);
  const activityProject = list.find(p => p.id === "prj_p101")?.name || list[0]?.name || "P-101 Inspection Review";

  return (
    <div>
      <PageHead
        sub="ai.mrpl.local · employees on the internal network, one GPU server"
        actions={<Button variant="primary" onClick={newProject} disabled={busy}>
          {busy ? "Creating…" : "New project"}
        </Button>}
      />

      <div className="grid grid-cols-1 gap-3.5 items-start">
        <div className="space-y-3.5">
          <Panel title="Projects" meta={`${list.length} on this gateway`}>
            <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px] min-w-[520px]">
              <thead>
                <tr className="text-[12px] text-hud-faint">
                  {["Project", "Lead", "Members", "Tasks", "Visibility"].map(h => (
                    <th key={h} className="text-left font-normal pb-2 border-b border-hud-edge/60">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map(p => (
                  <tr key={p.id}>
                    <td className="py-3 border-b border-white/[0.05] pr-3 text-hud-text">{p.name}</td>
                    <td className="py-3 border-b border-white/[0.05] pr-3 text-hud-dim">{p.lead}</td>
                    <td className="py-3 border-b border-white/[0.05] pr-3 text-hud-dim">{p.memberCount}</td>
                    <td className="py-3 border-b border-white/[0.05] pr-3 text-hud-dim">{p.taskCount}</td>
                    <td className="py-3 border-b border-white/[0.05]">
                      <Badge tone={p.visibility === "Shared" ? "cyan" : "dim"}>{p.visibility}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </Panel>

          <Panel title="Activity feed" meta={activityProject}>
            {feed.length === 0 && <p className="text-[13px] text-hud-faint">Nothing yet — activity appears as people work.</p>}
            {feed.map((a, i) => (
              <div key={a.id || i} className="flex flex-col sm:flex-row gap-1 sm:gap-3 py-2.5 text-[13px] border-b border-white/[0.05] last:border-0">
                <span className="flex gap-3">
                  <span className="text-hud-faint w-12 shrink-0">{t(a.time)}</span>
                  <span className="text-hud-text shrink-0">{a.user}</span>
                </span>
                <span className="text-hud-dim break-words">{FEED[a.action]} <span className="font-mono">{a.resource}</span></span>
              </div>
            ))}
          </Panel>
        </div>

        <div className="space-y-3.5">
          <Panel title="GPU queue" meta={q.length ? `${q.length} job${q.length === 1 ? "" : "s"}` : "idle"}>
            {q.length === 0 && <p className="text-[13px] text-hud-faint">Queue empty — the GPU is free.</p>}
            {q.map(x => (
              <div key={x.id} className="flex items-center gap-3 py-2.5 border-b border-white/[0.05] last:border-0">
                <span className="w-6 h-6 border border-hud-edge grid place-items-center text-[13px] text-hud-cyan shrink-0">{x.pos}</span>
                <span className="flex-1 leading-tight min-w-0">
                  <b className="block text-[13px] text-hud-text font-medium truncate">{x.task}</b>
                  <i className="block text-[12px] text-hud-faint not-italic truncate">{x.user} · {x.model}</i>
                </span>
                <Badge tone={STATE_TONE[x.state]}>{x.state}</Badge>
              </div>
            ))}
            <p className="text-[12px] text-hud-faint leading-relaxed mt-3">
              One GPU processes jobs in order and the UI shows your position. The production path
              is vLLM batching behind a Redis queue, which serves several requests at once.
            </p>
          </Panel>

          <Panel title="Approval flow">
            {[["Engineer drafts", "run the task"], ["Manager reviews", "sign-off in the Agent panel"], ["File is versioned and hashed", "sha-256 in the audit chain"]].map(([step, who], i) => (
              <div key={step} className="flex gap-2.5 py-2 border-b border-white/[0.05] last:border-0">
                <span className="w-4 h-4 border border-hud-cyan text-hud-cyan grid place-items-center text-[12px] shrink-0 mt-0.5">{i + 1}</span>
                <span className="leading-tight">
                  <b className="block text-[13px] text-hud-text font-medium">{step}</b>
                  <i className="block text-[12px] text-hud-faint not-italic">{who}</i>
                </span>
              </div>
            ))}
          </Panel>

          <Panel title="Identity">
            <p className="text-[13px] text-hud-dim leading-relaxed">
              Demo accounts are local. In production the gateway authenticates against the
              company directory, so nobody manages a second set of passwords.
            </p>
            <div className="flex items-center gap-2 mt-3 text-[13px] text-hud-faint">
              <Icon name="lock" className="w-3.5 h-3.5 text-hud-green" /> LDAP / Active Directory ready
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
