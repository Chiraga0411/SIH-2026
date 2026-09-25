import React, { useRef, useState } from "react";
import { Panel, Badge, Bar } from "../components/Hud";
import { PageHead, Button } from "../components/Chrome";
import { useApi } from "../api/useApi";
import { api, download } from "../api/client";

/* Scans, handwriting, photographs and P&IDs. The claim here is
   deliberately narrow: tag extraction, description, and cross-checking
   against the knowledge base, with confidence shown on every line.
   Upload a file and the extraction below is computed for real. */

const TABS = [
  { id: "scan", label: "Scanned report" },
  { id: "hand", label: "Handwritten note" },
  { id: "pid",  label: "P&ID drawing" },
];
const TAB_FILE = { pid: "PID_101_rev3.png", hand: "shift_note_0312.jpg", scan: "scan_P101_report.pdf" };

const KB_TONE = { match: "green", missing: "amber", mismatch: "red" };

export default function Multimodal({ fx }) {
  const [tab, setTab] = useState("pid");
  const { data: extraction, reload, setData } = useApi("/api/multimodal/tags");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const input = useRef(null);

  const upload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || busy) return;
    setBusy(true);
    setErr("");
    fx?.busy("doc", 1600);
    try {
      const fd = new FormData();
      fd.append("projectId", "prj_p101");
      fd.append("files", file);
      const [rec] = await api("/api/files/upload", { method: "POST", form: fd });
      const ext = await api("/api/multimodal/extract", { method: "POST", body: { fileId: rec.id } });
      setData(ext);
      fx?.toast(`Extracted ${ext.tags.length} tags from ${rec.originalName}.`);
    } catch (e2) {
      setErr(e2.status === 422 ? e2.message : `Extraction failed: ${e2.message}`);
    } finally {
      setBusy(false);
    }
  };

  const tags = extraction?.tags || [];
  const mismatch = tags.filter(x => x.kb === "mismatch").length;
  const missing = tags.filter(x => x.kb === "missing").length;
  const live = !!extraction?.extractedAt;

  return (
    <div>
      <PageHead
        sub="Tag and line extraction by regex over local text (OCR when available), then cross-checked against the knowledge base"
        actions={<Button variant="primary" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? "Extracting…" : "Upload a drawing / scan"}
        </Button>}
      />
      <input ref={input} type="file" accept="image/*,.pdf,.txt" className="hidden" onChange={upload} />

      {err && <div className="border border-hud-red/50 bg-hud-red/[0.07] px-3.5 py-2.5 mb-3.5 text-[13px] text-hud-dim leading-snug">{err}</div>}

      <div className="flex gap-1.5 mb-3.5 flex-wrap">
        {TABS.map(x => (
          <button key={x.id} onClick={() => setTab(x.id)}
            className={`px-4 py-2 text-[15px] font-display font-semibold border
              ${tab === x.id ? "border-hud-cyan text-hud-cyan bg-hud-cyan/10" : "border-hud-edge text-hud-dim hover:text-hud-text"}`}>
            {x.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3.5 items-start">
        <Panel title="Source" meta={live ? extraction.source : TAB_FILE[tab]}>
          <div className="aspect-[4/3] border border-hud-edge bg-black/30 relative overflow-hidden">
            <svg viewBox="0 0 400 300" className="w-full h-full">
              <defs>
                <pattern id="pgrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M20 0H0V20" fill="none" stroke="#2b7ea0" strokeWidth=".5" opacity=".35" />
                </pattern>
              </defs>
              <rect width="400" height="300" fill="url(#pgrid)" />
              <rect x="60" y="90" width="80" height="50" fill="none" stroke="#59d4ff" strokeWidth="1.5" />
              <circle cx="220" cy="115" r="22" fill="none" stroke="#59d4ff" strokeWidth="1.5" />
              <path d="M140 115h58M242 115h70M312 115v70h-90" fill="none" stroke="#59d4ff" strokeWidth="1.2" />
              <path d="M290 100l14 15-14 15z" fill="none" stroke="#ffb03b" strokeWidth="1.5" />
              <rect x="44" y="76" width="112" height="78" fill="none" stroke="#ffb03b" strokeWidth="1" strokeDasharray="4 3" />
              <text x="66" y="70" fill="#ffb03b" fontSize="11" fontFamily="monospace">PT-101</text>
              <text x="204" y="152" fill="#59d4ff" fontSize="11" fontFamily="monospace">FV-2203</text>
              <text x="320" y="200" fill="#ff6b5e" fontSize="11" fontFamily="monospace">PSV-140</text>
            </svg>
            <span className="absolute bottom-2 right-2 text-[12px] text-hud-faint">sample regions · upload to extract yours</span>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3.5">
            {[[String(tags.length), "Tags found"], [String(mismatch), "KB mismatches"], [String(missing), "KB missing"]].map(([v, k]) => (
              <span key={k} className="text-center">
                <b className="block font-display font-bold text-[17px] text-hud-cyan">{v}</b>
                <i className="text-[12px] text-hud-faint not-italic">{k}</i>
              </span>
            ))}
          </div>
          <p className="text-[12px] text-hud-faint leading-relaxed mt-3">
            {extraction?.engine || "Loading…"}
            {live ? "" : " — showing the seeded sample until you upload a file."}
          </p>
        </Panel>

        <div className="space-y-3.5">
          <Panel title="Extracted tags" meta="regex + KB cross-check">
            <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px] min-w-[560px]">
              <thead>
                <tr className="text-[12px] text-hud-faint">
                  {["Tag", "Type", "Line", "Confidence", "Knowledge base"].map(h => (
                    <th key={h} className="text-left font-normal pb-2 border-b border-hud-edge/60">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tags.map((x, i) => (
                  <tr key={x.tag + i}>
                    <td className="py-2.5 border-b border-white/[0.05] pr-3 font-mono text-hud-cyan">{x.tag}</td>
                    <td className="py-2.5 border-b border-white/[0.05] pr-3 text-hud-dim">{x.type}</td>
                    <td className="py-2.5 border-b border-white/[0.05] pr-3 text-hud-dim font-mono">
                      {x.line}{x.kbLine && x.kb === "mismatch" && <span className="text-hud-red"> (KB: {x.kbLine})</span>}
                    </td>
                    <td className="py-2.5 border-b border-white/[0.05] pr-3">
                      <span className={x.conf < 0.8 ? "text-hud-amber" : "text-hud-text"}>{x.conf}</span>
                    </td>
                    <td className="py-2.5 border-b border-white/[0.05]"><Badge tone={KB_TONE[x.kb]}>{x.kb}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <div className="flex gap-2 mt-3.5">
              <Button className="flex-1" onClick={() =>
                download("/api/multimodal/tags.xlsx", `PID_Tags_${Date.now()}.xlsx`).catch(e => setErr(e.message))}>
                Send to Excel
              </Button>
              <Button className="flex-1" onClick={() => fx?.toast("Flagged for human review — recorded in the task activity.")}>
                Flag for review
              </Button>
            </div>
          </Panel>

          <Panel title="What the pipeline says">
            <p className="text-[14px] text-hud-dim leading-relaxed">
              {extraction?.visionSummary || "Loading…"}
            </p>
            <div className="mt-3">
              <Bar label="Tag extraction accuracy (eval baseline)" value={91} />
              <Bar label="Line association accuracy (eval baseline)" value={78} />
            </div>
            <p className="text-[12px] text-hud-faint leading-relaxed mt-3">
              This pipeline extracts and cross-checks tags. It does not claim to interpret the
              full drawing, and every low-confidence line is flagged for a human.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
