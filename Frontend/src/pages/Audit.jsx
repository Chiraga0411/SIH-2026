import React, { useState } from "react";
import { Panel, Badge, Icon } from "../components/Hud";
import { PageHead, Button } from "../components/Chrome";
import { AUDIT, RBAC, INJECTION } from "../data/mock";

/* Tamper-evident audit chain, the access matrix, and the
   prompt-injection screen. Each entry stores the hash of the one
   before it, so any edit breaks the chain and shows up here. */

export default function Audit() {
  const [verified, setVerified] = useState(false);

  return (
    <div className="p-5">
      <PageHead
        title="Audit and access"
        sub="Hash-chained log of every model call, tool call and file access"
        actions={<Button variant="primary" onClick={() => setVerified(true)}>Verify chain integrity</Button>}
      />

      {verified && (
        <div className="flex items-center gap-2.5 border border-hud-green/50 bg-hud-green/[0.07] px-4 py-2.5 mb-3.5">
          <Icon name="check" className="w-4 h-4 text-hud-green" />
          <span className="text-[12px] text-hud-text">
            2,342 entries recomputed. Every hash matches its predecessor. No tampering detected.
          </span>
        </div>
      )}

      <div className="grid grid-cols-[1fr_320px] gap-3.5 items-start">
        <div className="space-y-3.5">
          <Panel title="Audit chain" meta="4 most recent of 2,342">
            {AUDIT.map((a, i) => (
              <div key={i} className="flex gap-3 py-3 border-b border-white/[0.05] last:border-0">
                <span className="text-[9.5px] text-hud-faint w-14 shrink-0 pt-0.5">{a.t}</span>
                <span className="flex-1">
                  <b className="block text-[11.5px] text-hud-text font-medium">{a.act}</b>
                  <i className="block text-[9.5px] text-hud-faint not-italic font-mono mt-1">
                    prev {a.prev} → hash {a.hash}
                  </i>
                </span>
                <span className="text-[10.5px] text-hud-dim shrink-0">{a.who}</span>
                <Icon name="check" className="w-3.5 h-3.5 text-hud-green shrink-0 mt-0.5" />
              </div>
            ))}
          </Panel>

          <Panel title="Prompt injection screen" meta="documents are data, never instructions">
            {INJECTION.map(x => (
              <div key={x.file} className="py-2.5 border-b border-white/[0.05] last:border-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[11.5px] text-hud-text">{x.file}</span>
                  <Badge tone={x.found === "— none —" ? "green" : "red"}>
                    {x.found === "— none —" ? "clean" : "injection found"}
                  </Badge>
                </div>
                <div className="text-[10.5px] text-hud-dim mt-1.5 font-mono">{x.found}</div>
                <div className="text-[10.5px] text-hud-faint mt-1">{x.action}</div>
              </div>
            ))}
            <p className="text-[10px] text-hud-faint leading-relaxed mt-3">
              Tools run from an allow-list and any write action needs human approval, so an
              instruction hidden in a document has nothing to call.
            </p>
          </Panel>
        </div>

        <div className="space-y-3.5">
          <Panel title="Access matrix">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="text-[9.5px] text-hud-faint tracking-wide">
                  {["Role","Public","Internal","Restricted","Approve"].map(h => (
                    <th key={h} className="text-left font-normal pb-2 border-b border-hud-edge/60">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RBAC.map(r => (
                  <tr key={r.role}>
                    <td className="py-2.5 border-b border-white/[0.05] text-hud-text">{r.role}</td>
                    {[r.pub, r.internal, r.restricted, r.approve].map((v, i) => (
                      <td key={i} className={`py-2.5 border-b border-white/[0.05] ${v === "—" ? "text-hud-faint" : "text-hud-green"}`}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[10px] text-hud-faint leading-relaxed mt-3">
              Clearance is applied inside the vector query. A user without clearance cannot
              retrieve the chunk at all, so it never reaches the model.
            </p>
          </Panel>

          <Panel title="Encryption at rest">
            {[["Algorithm","AES-256-GCM"],["Key location","local keystore"],["Files encrypted","1,204"],["Key escrow","none — stays on site"]].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 text-[10.5px] border-b border-white/[0.05] last:border-0">
                <span className="text-hud-faint">{k}</span><span className="text-hud-dim">{v}</span>
              </div>
            ))}
          </Panel>

          <Panel title="Same question, two users">
            <p className="text-[11.5px] text-hud-dim leading-relaxed">
              Asked about the 2023 incident, a Manager gets the cited answer. An Engineer gets
              "not found in the knowledge base" — because for them, it is not.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
