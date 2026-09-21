import React, { useRef, useState } from "react";
import { Panel, Badge, Icon } from "../components/Hud";
import { PageHead, Button } from "../components/Chrome";
import { TRACE, PLAN } from "../data/mock";

/* Core workspace: conversation, live plan checklist, agent trace,
   the human approval gate, and the generated deliverable. */

const STAGE_TONE = { PLAN:"cyan", ACT:"cyan", OBSERVE:"amber", VERIFY:"green", REVISE:"amber", DELIVER:"green" };

export default function Agent() {
  const [approved, setApproved] = useState(false);
  const [taskText, setTaskText] = useState("Read the P-101 scanned inspection report, pull out the key findings, and draft an approval note.");
  const [draft, setDraft] = useState("");
  const [attached, setAttached] = useState([]);
  const [running, setRunning] = useState(false);
  const fileInput = useRef(null);

  const handleFiles = (e) => {
    const names = Array.from(e.target.files || []).map(f => f.name);
    if (names.length) setAttached(prev => [...prev, ...names]);
    e.target.value = "";
  };

  const runTask = () => {
    if (!draft.trim() || running) return;
    setTaskText(draft.trim());
    setDraft("");
    setApproved(false);
    setRunning(true);
    window.setTimeout(() => setRunning(false), 1800);
  };

  return (
    <div className="p-4 sm:p-5">
      <PageHead
        title="Agent workspace"
        sub={`TASK-0042 · ${running ? "executing locally" : "scanned inspection report to approval note"} · iteration 2 of 6`}
        actions={<div className="flex gap-2"><Button>Checkpoint</Button><Button>Stop run</Button></div>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[230px_1fr_290px] gap-3.5 items-start">
        <div className="space-y-3.5">
          <Panel title="Plan" meta={PLAN.filter(p=>p.done).length + "/" + PLAN.length}>
            <ol className="space-y-2.5">
              {PLAN.map((p, i) => (
                <li key={i} className="flex gap-2.5 text-[11.5px] leading-snug">
                  <span className={`w-3.5 h-3.5 border shrink-0 mt-px grid place-items-center
                    ${p.done ? "border-hud-green text-hud-green" : "border-hud-edge text-transparent"}`}>
                    <Icon name="check" className="w-2.5 h-2.5" />
                  </span>
                  <span className={p.done ? "text-hud-dim" : "text-hud-text"}>{p.text}</span>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="Inputs">
            {["scan_P101_report.pdf", "PID_101_rev3.png", ...attached].map(f => (
              <div key={f} className="flex items-center gap-2 py-1.5 text-[11px] text-hud-text border-b border-white/[0.05] last:border-0">
                <Icon name="doc" className="w-3.5 h-3.5 text-hud-cyandim shrink-0" />{f}
              </div>
            ))}
            <button onClick={() => fileInput.current?.click()} className="mt-3 w-full border border-dashed border-hud-edge text-hud-dim text-[10.5px] py-2.5 hover:border-hud-cyan/50">
              + attach local file
            </button>
            <input ref={fileInput} type="file" multiple className="hidden" onChange={handleFiles} />
          </Panel>
        </div>

        <Panel pad={false} className="min-h-[560px] flex flex-col">
          <div className="flex-1 p-4 space-y-3.5">
            <div className="ml-auto max-w-full sm:max-w-[78%] bg-white/[0.05] border border-hud-edge px-3.5 py-2.5 text-[12.5px] leading-relaxed">
              {taskText}
            </div>

            <div className="border border-hud-edge bg-black/20">
              <div className="flex items-center gap-2 px-3.5 py-2 border-b border-white/[0.06] text-[9.5px] text-hud-faint tracking-widest">
                AGENT TRACE
                <span className="ml-auto text-hud-amber">router to qwen2.5-14b-instruct</span>
              </div>
              {TRACE.map((s, i) => (
                <div key={i} className="flex gap-2 sm:gap-3 px-3.5 py-2.5 border-b border-white/[0.05] last:border-0">
                  <span className="w-[58px] shrink-0 pt-px">
                    <Badge tone={s.status === "running" ? "amber" : STAGE_TONE[s.stage]}>{s.stage}</Badge>
                  </span>
                  <span className="flex-1 text-[12px] text-hud-dim leading-relaxed">
                    {s.tool
                      ? <><b className="text-hud-text font-medium">{s.tool}</b>{s.text.replace(s.tool, "")}</>
                      : s.text}
                    {s.cites && s.cites.map(c => (
                      <span key={c} className="ml-1.5 text-[9.5px] text-hud-amber border border-hud-amber/40 px-1 whitespace-nowrap">{c}</span>
                    ))}
                  </span>
                  <span className="text-[9.5px] text-hud-faint shrink-0 pt-0.5">
                    {s.ms ? (s.ms/1000).toFixed(1) + "s" : "..."}
                  </span>
                </div>
              ))}
            </div>

            <div className={`border p-4 ${approved ? "border-hud-green/50 bg-hud-green/[0.06]" : "border-hud-amber/50 bg-hud-amber/[0.06]"}`}>
              <div className="flex items-center gap-2 font-display font-bold text-[13px] text-white">
                <span className={`w-1.5 h-1.5 rounded-full ${approved ? "bg-hud-green" : "bg-hud-amber"}`} />
                {approved ? "Approved by M. Rao at 09:22" : "Approval note ready for review"}
              </div>
              <p className="text-[11.5px] text-hud-dim leading-relaxed mt-1.5 mb-3.5">
                {approved
                  ? "Signed and written to the audit chain. The deliverable is now final and downloadable."
                  : "Recommends a follow-up inspection before P-101 returns to service. Cites SOP-114 section 4.2 and the scanned report. A manager must sign off before the file is final."}
              </p>
              {!approved && (
                <div className="flex gap-2">
                  <Button variant="primary" onClick={() => setApproved(true)}>Approve and sign</Button>
                  <Button variant="quiet">Request changes</Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 p-3.5 border-t border-hud-edge">
            <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && runTask()} placeholder="Ask the agent, or give it the next task..."
              className="flex-1 bg-white/[0.04] border border-hud-edge px-3 py-2.5 text-[12.5px] text-hud-text placeholder-hud-faint outline-none focus:border-hud-cyan" />
            <Button variant="primary" onClick={runTask}>{running ? "Running…" : "Run task"}</Button>
          </div>
        </Panel>

        <div className="space-y-3.5">
          <Panel title="Deliverable">
            <div className="aspect-[4/5] border border-hud-edge p-3.5 mb-3"
                 style={{ background:"repeating-linear-gradient(transparent 0 17px, rgba(255,255,255,.05) 17px 18px), rgba(255,255,255,.02)" }}>
              <div className="text-[10.5px] font-semibold text-hud-text mb-2">Approval Note — P-101</div>
              <div className="h-1.5 bg-white/10 mb-1.5" />
              <div className="h-1.5 bg-white/10 mb-1.5" />
              <div className="h-1.5 bg-white/10 w-3/5" />
            </div>
            <div className="font-mono text-[11px] text-hud-text">Approval_Note_P101_v1.docx</div>
            <div className="flex justify-between text-[10px] text-hud-faint mt-2">
              <span>version</span><span className="text-hud-dim">{approved ? "v1 · final" : "v1 · draft"}</span>
            </div>
            <div className="flex justify-between text-[10px] text-hud-faint mt-1.5">
              <span>sha-256</span><span className="text-hud-dim">a3f9...21c0</span>
            </div>
            <div className="flex gap-2 mt-3.5">
              <Button className="flex-1">Preview</Button>
              <Button variant="primary" className="flex-1">Download</Button>
            </div>
          </Panel>

          <Panel title="Activity">
            {[["09:14","Task started by R. Shetty"],["09:15","OCR run on scan_P101_report.pdf"],["09:16","Knowledge search, 2 sources cited"],["09:17","Draft note generated, awaiting approval"]].map(([t, x]) => (
              <div key={t} className="flex gap-2.5 py-1.5 text-[10.5px] text-hud-dim border-b border-white/[0.05] last:border-0 leading-snug">
                <span className="text-hud-faint shrink-0">{t}</span>{x}
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </div>
  );
}
