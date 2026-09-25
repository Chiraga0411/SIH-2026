import React, { useState } from "react";
import { Panel, Badge, Icon } from "../components/Hud";
import { PageHead, Button } from "../components/Chrome";
import { useApi } from "../api/useApi";
import { api } from "../api/client";
import { RBAC } from "../data/mock";

/* Tamper-evident audit chain, the access matrix, and the
   prompt-injection screen. Each entry stores the hash of the one before
   it, so any edit breaks the chain — recomputed live on this page. */

const t = iso => String(iso || "").slice(11, 19);
const short = h => (h || "").slice(0, 6);

export default function Audit({ fx }) {
  const { data: entries } = useApi("/api/audit", { poll: 4000 });
  const { data: files } = useApi("/api/files");
  const [check, setCheck] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const verify = async () => {
    if (verifying) return;
    setVerifying(true);
    fx?.busy("tower", 900);
    try {
      setCheck(await api("/api/audit/verify"));
    } catch (e) {
      setCheck({ ok: false, error: e.message });
    } finally {
      setVerifying(false);
    }
  };

  const list = entries || [];
  const uploads = files || [];
  const injection = uploads.filter(f => f.injection);
  const encryptedCount = uploads.filter(f => f.encrypted).length;

  return (
    <div>
      <PageHead
        sub="Hash-chained log of every model call, tool call, file access and approval"
        actions={<Button variant="primary" onClick={verify} disabled={verifying}>
          {verifying ? "Recomputing…" : "Verify chain integrity"}
        </Button>}
      />

      {check && (
        <div className={`flex items-center gap-2.5 border px-4 py-2.5 mb-3.5 ${check.ok
          ? "border-hud-green/50 bg-hud-green/[0.07]" : "border-hud-red/50 bg-hud-red/[0.07]"}`}>
          <Icon name={check.ok ? "check" : "x"} className={`w-4 h-4 ${check.ok ? "text-hud-green" : "text-hud-red"}`} />
          <span className="text-[14px] text-hud-text">
            {check.ok
              ? `${check.checked} entries recomputed. Every hash matches its predecessor. No tampering detected. Head: ${short(check.head)}…`
              : `Chain broken at entry ${check.brokenAt} (${check.checked} checked). ${check.error || "Recompute mismatch — investigate storage."}`}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3.5 items-start">
        <div className="space-y-3.5">
          <Panel title="Audit chain" meta={list.length ? `${list.length} entr${list.length === 1 ? "y" : "ies"} · newest first` : "empty"}>
            {list.length === 0 && <p className="text-[13px] text-hud-faint">No entries yet — run a task or upload a file and it lands here instantly.</p>}
            {list.slice(0, 8).map((a, i) => (
              <div key={a.id || i} className="flex gap-2 sm:gap-3 py-3 border-b border-white/[0.05] last:border-0">
                <span className="text-[12px] text-hud-faint w-[68px] shrink-0 pt-0.5">{t(a.time)}</span>
                <span className="flex-1 min-w-0">
                  <b className="block text-[13px] text-hud-text font-medium break-words">
                    {a.action} → <span className="font-mono">{a.resource}</span>
                  </b>
                  <i className="block text-[12px] text-hud-faint not-italic font-mono mt-1 break-all">
                    prev {short(a.prevHash)} → hash {short(a.hash)} · {a.model} · {a.result}
                    {a.note ? ` · ${a.note}` : ""}
                  </i>
                </span>
                <span className="text-[13px] text-hud-dim shrink-0">{a.user}</span>
                <Icon name="check" className="w-3.5 h-3.5 text-hud-green shrink-0 mt-0.5" />
              </div>
            ))}
          </Panel>

          <Panel title="Prompt injection screen" meta={`${injection.length} file${injection.length === 1 ? "" : "s"} scanned`}>
            {injection.length === 0 && (
              <p className="text-[13px] text-hud-faint">
                No uploads yet. Attach a document in the Agent or Multimodal panel — every upload is
                scanned for hidden instructions and listed here with the verdict.
              </p>
            )}
            {injection.map(f => {
              const found = f.injection.found;
              return (
                <div key={f.id} className="py-2.5 border-b border-white/[0.05] last:border-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] text-hud-text break-words">{f.originalName}</span>
                    <Badge tone={found ? "red" : "green"}>{found ? "injection found" : "clean"}</Badge>
                  </div>
                  <div className="text-[13px] text-hud-dim mt-1.5 font-mono break-words">
                    {found || "— none —"}
                  </div>
                  <div className="text-[13px] text-hud-faint mt-1">{f.injection.action}</div>
                </div>
              );
            })}
            <p className="text-[12px] text-hud-faint leading-relaxed mt-3">
              Tools run from an allow-list and any write action needs human approval, so an
              instruction hidden in a document has nothing to call.
            </p>
          </Panel>
        </div>

        <div className="space-y-3.5">
          <Panel title="Access matrix">
            <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px] min-w-[420px]">
              <thead>
                <tr className="text-[12px] text-hud-faint">
                  {["Role", "Public", "Internal", "Restricted", "Approve"].map(h => (
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
            </div>
            <p className="text-[12px] text-hud-faint leading-relaxed mt-3">
              Clearance is applied inside the retrieval query. A user without clearance cannot
              retrieve the chunk at all, so it never reaches the model.
            </p>
          </Panel>

          <Panel title="Encryption at rest">
            {[["Algorithm", "AES-256-GCM"], ["Key location", "storage/secret.key (local)"],
              ["Files encrypted", encryptedCount === 0 ? "0 — waiting for uploads" : `${encryptedCount} / ${uploads.length}`],
              ["Key escrow", "none — stays on site"]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 py-2 text-[13px] border-b border-white/[0.05] last:border-0">
                <span className="text-hud-faint">{k}</span><span className="text-hud-dim text-right break-words">{v}</span>
              </div>
            ))}
            <p className="text-[12px] text-hud-faint leading-relaxed mt-2.5">
              Uploads are encrypted before they touch disk; extraction decrypts to a temp file that
              is deleted immediately afterwards.
            </p>
          </Panel>

          <Panel title="Same question, two users">
            <p className="text-[13px] text-hud-dim leading-relaxed">
              Ask the Knowledge panel about the restricted correspondence as an Engineer: you get
              “not found in the knowledge base”, because for you the chunks were never scored. Sign
              in as a Manager and the cited answer comes back. Try it.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
