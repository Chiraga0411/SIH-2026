import React, { useState } from "react";
import { Panel, Badge, Bar } from "../components/Hud";
import { PageHead, Button } from "../components/Chrome";
import { PID_TAGS } from "../data/mock";

/* Scans, handwriting, photographs and P&IDs. The claim here is
   deliberately narrow: tag extraction, description, and cross-checking
   against the knowledge base, with confidence shown on every line. */

const TABS = [
  { id:"scan", label:"Scanned report" },
  { id:"hand", label:"Handwritten note" },
  { id:"pid",  label:"P&ID drawing" },
];

const KB_TONE = { match:"green", missing:"amber", mismatch:"red" };

export default function Multimodal() {
  const [tab, setTab] = useState("pid");

  return (
    <div className="p-5">
      <PageHead
        title="Multimodal ingestion"
        sub="Deskew and denoise, then OCR for print and the vision model for handwriting and drawings"
        actions={<Button variant="primary">Upload file</Button>}
      />

      <div className="flex gap-1.5 mb-3.5">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-[12px] font-display font-semibold border
              ${tab === t.id ? "border-hud-cyan text-hud-cyan bg-hud-cyan/10" : "border-hud-edge text-hud-dim hover:text-hud-text"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_1fr] gap-3.5 items-start">
        <Panel title="Source" meta={tab === "pid" ? "PID_101_rev3.png" : tab === "hand" ? "shift_note_0312.jpg" : "scan_P101_report.pdf"}>
          <div className="aspect-[4/3] border border-hud-edge bg-black/30 relative overflow-hidden">
            <svg viewBox="0 0 400 300" className="w-full h-full">
              <defs>
                <pattern id="pgrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M20 0H0V20" fill="none" stroke="#1E6E8C" strokeWidth=".5" opacity=".35" />
                </pattern>
              </defs>
              <rect width="400" height="300" fill="url(#pgrid)" />
              <rect x="60" y="90" width="80" height="50" fill="none" stroke="#45D8FF" strokeWidth="1.5" />
              <circle cx="220" cy="115" r="22" fill="none" stroke="#45D8FF" strokeWidth="1.5" />
              <path d="M140 115h58M242 115h70M312 115v70h-90" fill="none" stroke="#45D8FF" strokeWidth="1.2" />
              <path d="M290 100l14 15-14 15z" fill="none" stroke="#FF9A4D" strokeWidth="1.5" />
              <rect x="44" y="76" width="112" height="78" fill="none" stroke="#FF9A4D" strokeWidth="1" strokeDasharray="4 3" />
              <text x="66" y="70" fill="#FF9A4D" fontSize="11" fontFamily="monospace">PT-101</text>
              <text x="204" y="152" fill="#45D8FF" fontSize="11" fontFamily="monospace">FV-2203</text>
              <text x="320" y="200" fill="#FF5C5C" fontSize="11" fontFamily="monospace">PSV-140</text>
            </svg>
            <span className="absolute bottom-2 right-2 text-[9.5px] text-hud-faint">detected regions highlighted</span>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3.5">
            {[["Deskew","+2.4°"],["Denoise","applied"],["DPI","300"]].map(([k, v]) => (
              <span key={k} className="text-center">
                <b className="block font-display font-bold text-[14px] text-hud-cyan">{v}</b>
                <i className="text-[9px] text-hud-faint not-italic">{k}</i>
              </span>
            ))}
          </div>
        </Panel>

        <div className="space-y-3.5">
          <Panel title="Extracted tags" meta="OCR + regex, cross-checked against the KB">
            <table className="w-full border-collapse text-[11.5px]">
              <thead>
                <tr className="text-[9.5px] text-hud-faint tracking-wide">
                  {["Tag","Type","Line","Confidence","Knowledge base"].map(h => (
                    <th key={h} className="text-left font-normal pb-2 border-b border-hud-edge/60">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PID_TAGS.map(t => (
                  <tr key={t.tag}>
                    <td className="py-2.5 border-b border-white/[0.05] pr-3 font-mono text-hud-cyan">{t.tag}</td>
                    <td className="py-2.5 border-b border-white/[0.05] pr-3 text-hud-dim">{t.type}</td>
                    <td className="py-2.5 border-b border-white/[0.05] pr-3 text-hud-dim font-mono">{t.line}</td>
                    <td className="py-2.5 border-b border-white/[0.05] pr-3">
                      <span className={t.conf < 0.8 ? "text-hud-amber" : "text-hud-text"}>{t.conf}</span>
                    </td>
                    <td className="py-2.5 border-b border-white/[0.05]"><Badge tone={KB_TONE[t.kb]}>{t.kb}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex gap-2 mt-3.5">
              <Button className="flex-1">Send to Excel</Button>
              <Button className="flex-1">Flag for review</Button>
            </div>
          </Panel>

          <Panel title="What the vision model says">
            <p className="text-[12px] text-hud-dim leading-relaxed">
              A pressure transmitter feeds a flow control valve on line L-2201, with a relief path
              to a safety valve on L-2204. The legend block in the lower right was partly cut off
              in the scan and was not read.
            </p>
            <div className="mt-3">
              <Bar label="Tag extraction accuracy (measured)" value={91} />
              <Bar label="Line association accuracy" value={78} />
            </div>
            <p className="text-[10px] text-hud-faint leading-relaxed mt-3">
              This pipeline extracts and cross-checks tags. It does not claim to interpret the
              full drawing, and every low-confidence line is flagged for a human.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
