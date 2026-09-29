import React, { useEffect, useRef, useState } from "react";
import { Panel, Badge, Icon } from "../components/Hud";
import { PageHead, Button } from "../components/Chrome";
import { FALLBACK_PLAN } from "../data/mock";
import { api, download, getUser } from "../api/client";

/* Core workspace: conversation, live plan checklist, agent trace, the
   human approval gate, and the generated deliverables. Everything here is
   the real gateway workflow — upload, create task, poll the trace, approve
   as a manager, download the Word/Excel/PPT files it produced. */

const STAGE_TONE = { PLAN: "cyan", ACT: "cyan", OBSERVE: "amber", VERIFY: "green", REVISE: "amber", DELIVER: "green" };
const TERMINAL = ["awaiting_approval", "approved", "failed"];

export default function Agent({ fx }) {
  const user = getUser();
  const [task, setTask] = useState(null);
  const [fileMap, setFileMap] = useState({});
  const [taskText, setTaskText] = useState(
    "Read the P-101 scanned inspection report, pull out the key findings, and draft an approval note.");
  const [draft, setDraft] = useState("");
  const [attached, setAttached] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileInput = useRef(null);

  // Model 7: the full PLAN -> ACT -> OBSERVE -> VERIFY -> DELIVER loop
  // running in agent_service, as an alternative to the Node workflow above.
  const [aiRun, setAiRun] = useState(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState("");

  // Model 8: generate a real docx/pptx/xlsx directly from a request.
  const [docBusy, setDocBusy] = useState(false);
  const [docResult, setDocResult] = useState(null);
  const [docErr, setDocErr] = useState("");

  /* boot: latest task + file names */
  useEffect(() => {
    api("/api/tasks").then(t => setTask(t[0] || null)).catch(() => {});
    api("/api/files").then(fs => setFileMap(Object.fromEntries(fs.map(f => [f.id, f.originalName])))).catch(() => {});
  }, []);

  /* poll while the agent is working */
  useEffect(() => {
    if (!task?.id || TERMINAL.includes(task.status)) return;
    const iv = setInterval(async () => {
      try { setTask(await api(`/api/tasks/${task.id}`)); } catch { /* next tick */ }
    }, 700);
    return () => clearInterval(iv);
  }, [task?.id, task?.status]);

  const handleFiles = (e) => {
    const list = Array.from(e.target.files || []);
    if (list.length) setAttached(prev => [...prev, ...list]);
    e.target.value = "";
  };

  const runTask = async () => {
    if (!draft.trim() || busy) return;
    const prompt = draft.trim();
    setDraft("");
    setTaskText(prompt);
    setBusy(true);
    setErr("");
    fx?.busy("studio", 2000);
    try {
      let fileIds = [];
      if (attached.length) {
        const fd = new FormData();
        fd.append("projectId", "prj_p101");
        attached.forEach(f => fd.append("files", f));
        const up = await api("/api/files/upload", { method: "POST", form: fd });
        setFileMap(m => ({ ...m, ...Object.fromEntries(up.map(f => [f.id, f.originalName])) }));
        fileIds = up.map(f => f.id);
        setAttached([]);
      }
      const t = await api("/api/tasks", { method: "POST", body: { projectId: "prj_p101", prompt, fileIds } });
      setTask(t);
    } catch (e) {
      setErr(`Could not start the task: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const approve = async () => {
    setErr("");
    try {
      const t = await api(`/api/tasks/${task.id}/approve`, { method: "POST", body: {} });
      setTask(t);
      fx?.approved();
    } catch (e) {
      if (e.status === 403) {
        setErr("Manager or Admin sign-off required. Sign out and come back in as Manager to approve.");
      } else setErr(e.message);
    }
  };

  const fetchDeliverable = (fmt, name) =>
    download(`/api/tasks/${task.id}/deliverable?format=${fmt}`, name).catch(e => setErr(e.message));

  const runWithAgentModel = async () => {
    if (aiBusy) return;
    const prompt = (draft.trim() || taskText).trim();
    if (!prompt) return;
    setAiBusy(true);
    setAiErr("");
    fx?.busy("studio", 3000);
    try {
      setAiRun(await api("/api/ai/agent/run", { method: "POST", body: { request: prompt } }));
    } catch (e) {
      setAiErr(e.message);
    } finally {
      setAiBusy(false);
    }
  };

  const approveAiRun = async () => {
    if (!aiRun?.run_id || aiBusy) return;
    setAiBusy(true);
    setAiErr("");
    try {
      setAiRun(await api("/api/ai/agent/approve", { method: "POST", body: { run_id: aiRun.run_id } }));
    } catch (e) {
      setAiErr(e.message);
    } finally {
      setAiBusy(false);
    }
  };

  const generateWithModel8 = async () => {
    if (docBusy) return;
    const prompt = (draft.trim() || taskText).trim();
    if (!prompt) return;
    setDocBusy(true);
    setDocErr("");
    fx?.busy("studio", 2000);
    try {
      setDocResult(await api("/api/ai/doc/generate", { method: "POST", body: { request: prompt } }));
    } catch (e) {
      setDocErr(e.message);
    } finally {
      setDocBusy(false);
    }
  };

  const plan = task?.plan || FALLBACK_PLAN;
  const trace = (task?.trace || []).map(e => ({
    stage: e.stage, tool: e.tool, text: e.message, ms: e.ms, cites: e.citations, at: e.at,
  }));
  const inputNames = [
    ...(task?.fileIds || []).map(id => fileMap[id] || "local file"),
    ...attached.map(f => f.name),
  ];
  const approved = task?.status === "approved";
  const finding = task?.analysis?.findings?.[0];
  const artifact = task?.artifact;
  const sha = artifact?.sha256;
  const shaShort = sha ? `${sha.slice(0, 4)}...${sha.slice(-4)}` : "pending";

  return (
    <div>
      <PageHead
        sub={task
          ? `${task.status.replace("_", " ")} · stage ${task.stage} · ${task.routing?.taskType} task routed to ${task.routing?.model?.name}`
          : "no task yet — write one below to run the scan → findings → approval-note workflow"}
        actions={
          <div className="flex gap-2">
            <Button onClick={() => task && api(`/api/tasks/${task.id}`).then(setTask).catch(e => setErr(e.message))}>Refresh</Button>
            <Button variant="primary" onClick={() => fileInput.current?.click()}>Attach file</Button>
          </div>}
      />

      {err && (
        <div className="border border-hud-red/50 bg-hud-red/[0.07] px-3.5 py-2.5 mb-3.5 text-[13px] text-hud-dim leading-snug">{err}</div>
      )}

      <div className="grid grid-cols-1 gap-3.5 items-start">
        <div className="space-y-3.5">
          <Panel title="Plan" meta={`${plan.filter(p => p.done).length}/${plan.length}`}>
            <ol className="space-y-2.5">
              {plan.map((p, i) => (
                <li key={i} className="flex gap-2.5 text-[13px] leading-snug">
                  <span className={`w-3.5 h-3.5 border shrink-0 mt-px grid place-items-center
                    ${p.done ? "border-hud-green text-hud-green" : "border-hud-edge text-transparent"}`}>
                    <Icon name="check" className="w-2.5 h-2.5" />
                  </span>
                  <span className={p.done ? "text-hud-dim" : "text-hud-text"}>{p.text}</span>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="Inputs" meta={inputNames.length ? `${inputNames.length} local` : "none yet"}>
            {inputNames.length === 0 && (
              <p className="text-[13px] text-hud-faint leading-snug">No files attached. Run with a prompt only, or attach a local report — it is stored encrypted and processed on this server.</p>
            )}
            {inputNames.map(f => (
              <div key={f} className="flex items-center gap-2 py-1.5 text-[13px] text-hud-text border-b border-white/[0.05] last:border-0">
                <Icon name="doc" className="w-3.5 h-3.5 text-hud-cyandim shrink-0" />{f}
              </div>
            ))}
            <button onClick={() => fileInput.current?.click()} className="mt-3 w-full border border-dashed border-hud-edge text-hud-dim text-[13px] py-2.5 hover:border-hud-cyan/50">
              + attach local file
            </button>
            <input ref={fileInput} type="file" multiple className="hidden" onChange={handleFiles} />
          </Panel>
        </div>

        <Panel pad={false} className="min-h-[420px] flex flex-col">
          <div className="flex-1 p-4 space-y-3.5">
            <div className="ml-auto max-w-full sm:max-w-[78%] bg-white/[0.05] border border-hud-edge px-3.5 py-2.5 text-[14px] leading-relaxed">
              {taskText}
            </div>

            <div className="border border-hud-edge bg-black/20">
              <div className="flex items-center gap-2 px-3.5 py-2 border-b border-white/[0.06] text-[12px] text-hud-faint">
                Agent trace
                <span className="ml-auto text-hud-amber text-right">
                  {task?.routing ? `router → ${task.routing.model.name}` : "router idle"}
                </span>
              </div>
              {task?.routing && (
                <div className="px-3.5 py-2 border-b border-white/[0.06] text-[12px] text-hud-dim leading-snug">
                  {task.routing.reason}
                </div>
              )}
              {trace.length === 0 && (
                <div className="px-3.5 py-4 text-[13px] text-hud-faint">Trace appears here as the agent works: plan → extract → knowledge search → verify → deliver.</div>
              )}
              {trace.map((s, i) => (
                <div key={i} className="flex gap-2 sm:gap-3 px-3.5 py-2.5 border-b border-white/[0.05] last:border-0">
                  <span className="w-[80px] shrink-0 pt-px">
                    <Badge tone={s.stage === "REVISE" ? "amber" : STAGE_TONE[s.stage] || "dim"}>{s.stage}</Badge>
                  </span>
                  <span className="flex-1 text-[14px] text-hud-dim leading-relaxed break-words">
                    {s.tool && <><b className="text-hud-text font-medium mr-1.5">{s.tool}</b></>}
                    {s.text}
                    {(s.cites || []).map((c, ci) => (
                      <span key={ci} className="ml-1.5 text-[12px] text-hud-amber border border-hud-amber/40 px-1 whitespace-nowrap inline-block mt-1">{c}</span>
                    ))}
                  </span>
                  <span className="text-[12px] text-hud-faint shrink-0 pt-0.5">
                    {s.ms ? (s.ms / 1000).toFixed(1) + "s" : "..."}
                  </span>
                </div>
              ))}
            </div>

            {task && (
              <div className={`border p-4 ${approved ? "border-hud-green/50 bg-hud-green/[0.06]"
                : task.status === "awaiting_approval" ? "border-hud-amber/50 bg-hud-amber/[0.06]"
                : "border-hud-cyan/40 bg-hud-cyan/[0.05]"}`}>
                <div className="flex items-center gap-2 font-display font-bold text-[16px] text-white">
                  <span className={`w-1.5 h-1.5 rounded-full ${approved ? "bg-hud-green" : task.status === "awaiting_approval" ? "bg-hud-amber" : "bg-hud-cyan animate-pulse"}`} />
                  {approved
                    ? `Approved by ${task.approvedBy} at ${String(task.approvedAt || "").slice(11, 16)}`
                    : task.status === "awaiting_approval"
                      ? "Approval note ready for review"
                      : `Agent working — ${task.stage}`}
                </div>
                <p className="text-[14px] text-hud-dim leading-relaxed mt-1.5 mb-3.5">
                  {finding
                    ? `${finding.finding} ${finding.verdict === "follow-up inspection required"
                        ? "Recommends a follow-up inspection before P-101 returns to service."
                        : "Within tolerance."} ${task.analysis.citations.length} citation(s) attached from the local knowledge base.`
                    : "Findings appear here once the agent finishes extraction and retrieval."}
                  {!approved && " A manager must sign off before the file is final."}
                </p>
                {!approved && task.status === "awaiting_approval" && (
                  <div className="flex gap-2">
                    <Button variant="primary" onClick={approve}>Approve and sign</Button>
                    <Button onClick={() => setErr("Change requests are queued to the drafting engineer in this slice.")}>Request changes</Button>
                  </div>
                )}
                {task.injection && (
                  <div className="mt-3 flex items-start gap-2 text-[13px] text-hud-dim border-t border-white/[0.06] pt-2.5">
                    <Icon name="shield" className="w-3.5 h-3.5 text-hud-amber shrink-0 mt-0.5" />
                    <span>Prompt-injection screen flagged <b className="font-mono text-hud-amber">{task.injection.found}</b> in {task.injection.file} — treated as data, no tool call issued.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2 p-3.5 border-t border-hud-edge">
            <input value={draft} onChange={e => setDraft(e.target.value)}
              onKeyDown={e => e.key === "Enter" && runTask()}
              placeholder="Ask the agent, or give it the next task..."
              className="flex-1 bg-white/[0.04] border border-hud-edge px-3 py-2.5 text-[14px] text-hud-text placeholder-hud-faint outline-none focus:border-hud-cyan" />
            <Button variant="primary" onClick={runTask}>{busy ? "Starting…" : "Run task"}</Button>
            <Button onClick={runWithAgentModel} disabled={aiBusy} title="Run the full agent loop in agent_service (Model 7) instead">
              {aiBusy ? "Running (Model 7)…" : "Run with Model 7"}
            </Button>
          </div>

          {(aiErr || aiRun) && (
            <div className="p-3.5 border-t border-hud-edge">
              {aiErr && <div className="border border-hud-red/50 bg-hud-red/[0.07] px-3 py-2 mb-2 text-[13px] text-hud-dim">
                Model 7: {aiErr} — is agent_service running on port 8002?
              </div>}
              {aiRun && (
                <div className="border border-hud-edge bg-black/20 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge tone={aiRun.status === "done" ? "green" : aiRun.status === "awaiting_approval" ? "amber" : "cyan"}>{aiRun.status}</Badge>
                    <span className="text-[12px] text-hud-faint">Model 7 agent run · {(aiRun.trace || []).length} step(s)</span>
                    {aiRun.approval_required && aiRun.status !== "done" && (
                      <Button className="ml-auto" onClick={approveAiRun} disabled={aiBusy}>Approve</Button>
                    )}
                  </div>
                  {(aiRun.trace || []).map((s, i) => (
                    <div key={i} className="text-[13px] text-hud-dim py-1 border-b border-white/[0.05] last:border-0">
                      <b className="text-hud-text">{s.name}</b> — {s.status}{s.detail ? `: ${s.detail}` : ""}
                    </div>
                  ))}
                  {(aiRun.outputs || []).length > 0 && (
                    <div className="mt-2 text-[12px] text-hud-faint font-mono break-all">
                      output: {aiRun.outputs.join(", ")}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Panel>

        <div className="space-y-3.5">
          <Panel title="Deliverable" meta={artifact ? artifact.format : "not yet"}>
            <div className="aspect-[4/5] border border-hud-edge p-3.5 mb-3 overflow-hidden"
                 style={{ background: "repeating-linear-gradient(transparent 0 17px, rgba(255,255,255,.05) 17px 18px), rgba(255,255,255,.02)" }}>
              <div className="text-[13px] font-semibold text-hud-text mb-2">Approval Note — P-101</div>
              <div className="h-1.5 bg-white/10 mb-1.5" />
              <div className="h-1.5 bg-white/10 mb-1.5" />
              <div className="h-1.5 bg-white/10 w-3/5" />
              {finding && <div className="text-[11px] text-hud-faint mt-3 leading-snug">{finding.finding}</div>}
            </div>
            <div className="font-mono text-[13px] text-hud-text break-all">
              {artifact ? artifact.filename : "Approval_Note_*.docx"}
            </div>
            <div className="flex justify-between text-[12px] text-hud-faint mt-2">
              <span>version</span>
              <span className="text-hud-dim">{approved ? "v1 · final" : artifact ? "v1 · draft" : "—"}</span>
            </div>
            <div className="flex justify-between text-[12px] text-hud-faint mt-1.5">
              <span>sha-256</span><span className="text-hud-dim font-mono">{shaShort}</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-3.5">
              <Button className="flex-1" disabled={!artifact}
                onClick={() => fetchDeliverable("docx", artifact?.filename)}>Word</Button>
              <Button className="flex-1" disabled={!task?.analysis}
                onClick={() => fetchDeliverable("xlsx", `Analysis_${task.id}.xlsx`)}>Excel</Button>
              <Button className="flex-1" disabled={!task?.analysis}
                onClick={() => fetchDeliverable("pptx", `Brief_${task.id}.pptx`)}>PPT</Button>
            </div>
            <p className="text-[12px] text-hud-faint leading-snug mt-2.5">
              Word is generated at delivery; Excel has live formulas and PPT is the board brief — both generated on demand from this task's findings.
            </p>

            <Button className="w-full mt-3" onClick={generateWithModel8} disabled={docBusy}
              title="Generate a document directly with Model 8, from the prompt box above, independent of this task">
              {docBusy ? "Generating (Model 8)…" : "Generate directly with Model 8"}
            </Button>
            {docErr && <div className="border border-hud-red/50 bg-hud-red/[0.07] px-3 py-2 mt-2 text-[13px] text-hud-dim">
              {docErr} — is agent_service running on port 8002?
            </div>}
            {docResult && (
              <div className="mt-2 text-[12px] text-hud-dim">
                <Badge tone={docResult.status === "ok" ? "green" : "red"}>{docResult.status}</Badge>
                {docResult.path && <span className="ml-2 font-mono break-all">{docResult.path}</span>}
                {docResult.error && <span className="ml-2">{docResult.error}</span>}
              </div>
            )}
          </Panel>

          <Panel title="Activity" meta={trace.length ? `${trace.length} steps` : "idle"}>
            {[...trace].reverse().slice(0, 6).map((s, i) => (
              <div key={i} className="flex gap-2.5 py-1.5 text-[13px] text-hud-dim border-b border-white/[0.05] last:border-0 leading-snug">
                <span className="text-hud-faint shrink-0">{s.at ? String(s.at).slice(11, 16) : "--:--"}</span>
                <span className="min-w-0 break-words">{s.tool ? `${s.tool} — ` : ""}{s.text}</span>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </div>
  );
}
