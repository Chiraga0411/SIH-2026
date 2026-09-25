import React from "react";
import { Panel, Badge, Icon } from "../components/Hud";
import { PageHead, Button } from "../components/Chrome";
import { PROJECTS, QUEUE } from "../data/mock";

/* One server, many employees. Projects hold the work, tasks are private
   until shared, and a single GPU is fair-queued with the position shown. */

const STATE_TONE = { running:"green", queued:"amber" };

export default function Projects({ live }) {
  return (
    <div>
      <PageHead
        sub="ai.mrpl.local · 14 employees on the internal network, one GPU server"
        actions={<Button variant="primary">New project</Button>}
      />

      <div className="grid grid-cols-1 gap-3.5 items-start">
        <div className="space-y-3.5">
          <Panel title="Projects">
            <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px] min-w-[520px]">
              <thead>
                <tr className="text-[12px] text-hud-faint">
                  {["Project","Lead","Members","Tasks","Visibility"].map(h => (
                    <th key={h} className="text-left font-normal pb-2 border-b border-hud-edge/60">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(live?.projects?.length ? live.projects : PROJECTS).map(p => (
                  <tr key={p.name}>
                    <td className="py-3 border-b border-white/[0.05] pr-3 text-hud-text">{p.name}</td>
                    <td className="py-3 border-b border-white/[0.05] pr-3 text-hud-dim">{p.lead}</td>
                    <td className="py-3 border-b border-white/[0.05] pr-3 text-hud-dim">{p.members}</td>
                    <td className="py-3 border-b border-white/[0.05] pr-3 text-hud-dim">{p.tasks}</td>
                    <td className="py-3 border-b border-white/[0.05]">
                      <Badge tone={p.visibility === "Shared" ? "cyan" : "dim"}>{p.visibility}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </Panel>

          <Panel title="Activity feed" meta="P-101 Inspection Review">
            {[
              ["09:22","M. Rao","approved Approval_Note_P101_v1.docx"],
              ["09:17","R. Shetty","shared the draft note to the project"],
              ["09:14","R. Shetty","started a task from scan_P101_report.pdf"],
              ["08:51","S. Kamath","ran a pump curve calculation"],
            ].map(([t, who, what]) => (
              <div key={t} className="flex flex-col sm:flex-row gap-1 sm:gap-3 py-2.5 text-[13px] border-b border-white/[0.05] last:border-0">
                <span className="flex gap-3"><span className="text-hud-faint w-12 shrink-0">{t}</span><span className="text-hud-text shrink-0">{who}</span></span>
                <span className="text-hud-dim">{what}</span>
              </div>
            ))}
          </Panel>
        </div>

        <div className="space-y-3.5">
          <Panel title="GPU queue" meta="fair order">
            {(live?.queue?.length ? live.queue : QUEUE).map(q => (
              <div key={q.pos} className="flex items-center gap-3 py-2.5 border-b border-white/[0.05] last:border-0">
                <span className="w-6 h-6 border border-hud-edge grid place-items-center text-[13px] text-hud-cyan shrink-0">{q.pos}</span>
                <span className="flex-1 leading-tight">
                  <b className="block text-[13px] text-hud-text font-medium">{q.task}</b>
                  <i className="block text-[12px] text-hud-faint not-italic">{q.user} · {q.model}</i>
                </span>
                <Badge tone={STATE_TONE[q.state]}>{q.state}</Badge>
              </div>
            ))}
            <p className="text-[12px] text-hud-faint leading-relaxed mt-3">
              One GPU processes jobs in order. The production path is vLLM batching behind a
              Redis queue, which serves several requests at once.
            </p>
          </Panel>

          <Panel title="Approval flow">
            {[["Engineer drafts","R. Shetty"],["Manager reviews","M. Rao"],["File is versioned and hashed","automatic"]].map(([step, who], i) => (
              <div key={step} className="flex gap-2.5 py-2 border-b border-white/[0.05] last:border-0">
                <span className="w-4 h-4 border border-hud-cyan text-hud-cyan grid place-items-center text-[12px] shrink-0 mt-0.5">{i+1}</span>
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
