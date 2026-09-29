import React, { useRef, useState } from "react";
import { Panel, Badge, Bar, Icon } from "../components/Hud";
import { PageHead, Button } from "../components/Chrome";
import { useApi } from "../api/useApi";
import { api, getUser } from "../api/client";

/* Knowledge base: ingested sources, clearance labels, and a query pane
   that always shows where an answer came from — or abstains. Clearance is
   enforced inside the retrieval query, not in this UI. */

const CLEAR_TONE = { Public: "green", Internal: "cyan", Restricted: "red" };

export default function Knowledge({ fx }) {
  const user = getUser();
  const { data: docs } = useApi("/api/knowledge/docs");
  const [q, setQ] = useState("What is the minimum shell thickness for P-101?");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Model 4 (hybrid dense + BM25 + reranker knowledge base) — a separate
  // engine from the keyword search above, running in agent_service on
  // :8002. Kept as its own panel so the original search is untouched.
  const [m4Result, setM4Result] = useState(null);
  const [m4Busy, setM4Busy] = useState(false);
  const [m4Err, setM4Err] = useState("");
  const { data: kbs, reload: reloadKb } = useApi("/api/ai/kb/stats");
  const [kbClr, setKbClr] = useState("Internal");
  const [kbBusy, setKbBusy] = useState(false);
  const [kbMsg, setKbMsg] = useState("");
  const kbFile = useRef(null);

  const seedKb = async () => {
    if (kbBusy) return;
    setKbBusy(true); setKbMsg("Embedding the sample SOPs… the first run can take a minute.");
    try {
      const r = await api("/api/ai/kb/seed", { method: "POST", body: {} });
      setKbMsg(`Loaded ${r.results?.length || 0} sample documents.`); reloadKb();
    } catch (e) { setKbMsg(e.message); } finally { setKbBusy(false); }
  };
  const uploadKb = async (e) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f || kbBusy) return;
    setKbBusy(true); setKbMsg(`Embedding ${f.name}…`);
    try {
      const fd = new FormData(); fd.append("file", f); fd.append("clearance", kbClr);
      const r = await api("/api/ai/kb/upload", { method: "POST", form: fd });
      setKbMsg(`${f.name}: ${r.status || "ok"}${r.chunks ? `, ${r.chunks} chunks` : ""} (${r.clearance}).`); reloadKb();
    } catch (e2) { setKbMsg(e2.message); } finally { setKbBusy(false); }
  };

  const search = async () => {
    if (!q.trim() || busy) return;
    setBusy(true);
    setErr("");
    fx?.busy("kb", 900);
    try {
      setResult(await api("/api/knowledge/search", { method: "POST", body: { q: q.trim() } }));
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const askModel4 = async () => {
    if (!q.trim() || m4Busy) return;
    setM4Busy(true);
    setM4Err("");
    fx?.busy("kb", 900);
    try {
      setM4Result(await api("/api/ai/kb/answer", { method: "POST", body: { question: q.trim() } }));
    } catch (e) {
      setM4Err(e.message);
    } finally {
      setM4Busy(false);
    }
  };

  const list = docs || [];
  const restrictedHidden = result?.retrieval?.docsFilteredByClearance || 0;

  return (
    <div>
      <PageHead
        sub={`${list.length} document${list.length === 1 ? "" : "s"} · hybrid retrieval over local chunks with abstention below threshold`}
        actions={<Badge tone="cyan">clearance: {user?.clearance}</Badge>}
      />

      <div className="grid grid-cols-1 gap-3.5 items-start">
        <div className="space-y-3.5">
          <Panel title="Ask the knowledge base" meta="answers are cited or refused">
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <input value={q} onChange={e => setQ(e.target.value)}
                onKeyDown={e => e.key === "Enter" && search()}
                className="flex-1 bg-white/[0.04] border border-hud-edge px-3 py-2.5 text-[14px] text-hud-text outline-none focus:border-hud-cyan" />
              <Button variant="primary" onClick={search} disabled={busy}>{busy ? "Thinking…" : "Search"}</Button>
              <Button onClick={askModel4} disabled={m4Busy}>{m4Busy ? "Thinking…" : "Ask (Model 4)"}</Button>
            </div>
            {err && <div className="border border-hud-red/50 bg-hud-red/[0.07] px-3 py-2 mb-3 text-[13px] text-hud-dim">{err}</div>}

            {result && (
              <>
                <div className={`border-l-2 pl-3.5 py-1 mb-4 ${result.abstained ? "border-hud-amber" : "border-hud-cyan"}`}>
                  <p className="text-[14px] text-hud-text leading-relaxed">{result.answer}</p>
                  <div className="flex gap-2 mt-2.5 flex-wrap">
                    {result.abstained ? (
                      <>
                        <Badge tone="amber">abstained</Badge>
                        {restrictedHidden > 0 && <Badge tone="red">{restrictedHidden} document(s) above your clearance were not searched</Badge>}
                      </>
                    ) : (
                      <>
                        <Badge tone="green">{result.citations.length} sources</Badge>
                        <Badge tone="cyan">score {result.confidence}</Badge>
                      </>
                    )}
                    {result.answerSource && (
                      <Badge tone={result.model ? "green" : "dim"}>{result.answerSource}</Badge>
                    )}
                    {result.model?.latency_s != null && (
                      <Badge tone="dim">{result.model.latency_s}s</Badge>
                    )}
                  </div>
                  {result.modelNote && (
                    <p className="text-[12px] text-hud-amber mt-2">{result.modelNote}</p>
                  )}
                </div>

                <div className="text-[12px] text-hud-faint mb-2">
                  Retrieved chunks · {result.retrieval.chunksScored} scored · {result.retrieval.docsFilteredByClearance} doc(s) filtered by clearance · threshold {result.threshold}
                </div>
                {result.citations.map((c, i) => (
                  <div key={i} className="border border-hud-edge bg-black/20 p-3 mb-2 last:mb-0">
                    <div className="flex items-baseline gap-2 mb-1.5 flex-wrap">
                      <span className="text-[13px] text-hud-cyan">{c.doc}</span>
                      <span className="text-[12px] text-hud-faint">page {c.page}</span>
                      <span className="ml-auto text-[12px] text-hud-dim">score {c.score}</span>
                    </div>
                    <p className="text-[14px] text-hud-dim leading-relaxed">{c.text}</p>
                  </div>
                ))}
                <p className="text-[13px] text-hud-faint mt-3 flex items-center gap-2">
                  <Icon name="shield" className="w-3.5 h-3.5 text-hud-green shrink-0" />
                  When the best chunk scores below {result.threshold} the agent answers “not found in the knowledge base” instead of guessing.
                </p>
              </>
            )}

            {m4Err && <div className="border border-hud-red/50 bg-hud-red/[0.07] px-3 py-2 mt-3 text-[13px] text-hud-dim">
              Model 4 service: {m4Err} — is agent_service running on port 8002?
            </div>}

            <div className="mt-4 pt-4 border-t border-hud-edge">
              <div className="flex gap-2 items-center flex-wrap mb-2">
                <Badge tone={kbs?.chunks ? "green" : "amber"}>{kbs ? `${kbs.chunks} chunks · ${(kbs.sources || []).length} docs indexed` : "index status unknown"}</Badge>
                <select value={kbClr} onChange={e => setKbClr(e.target.value)}
                  className="bg-[#0b1a2c] border border-hud-edge text-hud-text text-[13px] px-2 py-1.5 outline-none">
                  <option>Public</option><option>Internal</option><option>Restricted</option>
                </select>
                <input ref={kbFile} type="file" accept=".md,.txt,.pdf" className="hidden" onChange={uploadKb} />
                <Button onClick={() => kbFile.current?.click()} disabled={kbBusy}>Upload document</Button>
                <Button onClick={seedKb} disabled={kbBusy}>Load sample SOPs</Button>
              </div>
              {kbMsg && <p className="text-[12px] text-hud-amber leading-snug">{kbMsg}</p>}
              {kbs && !kbs.chunks && <p className="text-[12px] text-hud-faint leading-snug mt-1">Model 4 has no documents yet, so every question returns “not found”. Load the sample SOPs or upload a document first.</p>}
            </div>

            {m4Result && (
              <div className="mt-4 pt-4 border-t border-hud-edge">
                <div className="text-[12px] text-hud-faint mb-2">Model 4 — hybrid dense + BM25 + reranker (separate index)</div>
                <div className={`border-l-2 pl-3.5 py-1 mb-3 ${m4Result.status === "not_found" ? "border-hud-amber" : "border-hud-cyan"}`}>
                  <p className="text-[14px] text-hud-text leading-relaxed">{m4Result.answer || "Not found in the knowledge base."}</p>
                  <div className="flex gap-2 mt-2.5 flex-wrap">
                    <Badge tone={m4Result.status === "not_found" ? "amber" : m4Result.status === "answered" ? "green" : "cyan"}>
                      {m4Result.status === "not_found" ? "abstained" : m4Result.status === "answered" ? `${(m4Result.citations || []).length} cited` : m4Result.status}
                    </Badge>
                  </div>
                </div>
                {(m4Result.status === "not_found" ? [] : (m4Result.search?.hits || [])).map((h, i) => (
                  <div key={i} className="border border-hud-edge bg-black/20 p-3 mb-2 last:mb-0">
                    <div className="flex items-baseline gap-2 mb-1.5 flex-wrap">
                      <span className="text-[13px] text-hud-cyan">{h.citation || h.source || h.doc}</span>
                      <span className="ml-auto text-[12px] text-hud-dim">score {(() => { const sc = h.rerank_score ?? h.dense_score ?? h.fused_score; return sc?.toFixed ? sc.toFixed(2) : sc; })()}</span>
                    </div>
                    <p className="text-[14px] text-hud-dim leading-relaxed">{h.text}</p>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Indexed documents" meta={`${list.length} in the local index`}>
            <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px] min-w-[640px]">
              <thead>
                <tr className="text-[12px] text-hud-faint">
                  {["Document", "Type", "Pages", "Chunks", "Clearance", "Ingested"].map(h => (
                    <th key={h} className="text-left font-normal pb-2 border-b border-hud-edge/60">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map(d => (
                  <tr key={d.id} className={d.retrievable ? "" : "opacity-60"}>
                    <td className="py-2.5 border-b border-white/[0.05] pr-3 text-hud-text">{d.name}</td>
                    <td className="py-2.5 border-b border-white/[0.05] pr-3 text-hud-dim">{d.type}</td>
                    <td className="py-2.5 border-b border-white/[0.05] pr-3 text-hud-dim">{d.pages}</td>
                    <td className="py-2.5 border-b border-white/[0.05] pr-3 text-hud-dim">{d.chunks}</td>
                    <td className="py-2.5 border-b border-white/[0.05] pr-3"><Badge tone={CLEAR_TONE[d.clearance]}>{d.clearance}</Badge></td>
                    <td className="py-2.5 border-b border-white/[0.05] text-hud-faint">{d.ingested}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </Panel>
        </div>

        <div className="space-y-3.5">
          <Panel title="Connectors" meta="interface ready">
            {[["Watch folder", "/srv/mrpl/sops"], ["Network share", "//fileserver/eng"], ["Mailbox export", ".eml archive"]].map(([n, p]) => (
              <div key={n} className="flex items-center gap-2 py-2 border-b border-white/[0.05] last:border-0">
                <span className="w-1.5 h-1.5 rounded-full bg-hud-cyan shrink-0" />
                <span className="leading-tight">
                  <b className="block text-[13px] text-hud-text font-medium">{n}</b>
                  <i className="block text-[12px] text-hud-faint not-italic font-mono">{p}</i>
                </span>
                <span className="ml-auto text-[12px] text-hud-dim">interface ready</span>
              </div>
            ))}
            <p className="text-[12px] text-hud-faint leading-relaxed mt-2.5">
              Documents are seeded into the local index in this slice. Adding a source means
              writing one small connector class against the same ingest interface — no redesign.
            </p>
            <button className="mt-3 w-full border border-dashed border-hud-edge text-hud-dim text-[13px] py-2.5 hover:border-hud-cyan/50"
              onClick={() => fx?.toast("Connector classes are the extension point — see README.")}>
              + add connector
            </button>
          </Panel>

          <Panel title="Retrieval quality" meta="baseline · 30-question set">
            <Bar label="Hit @1" value={82} />
            <Bar label="Hit @5" value={95} />
            <Bar label="Answer correctness" value={87} />
            <p className="text-[12px] text-hud-faint leading-relaxed mt-3">
              Measured against a fixed 30-question set (baseline figures until the harness is
              re-run). Full comparison on the Evaluation page.
            </p>
          </Panel>

          <Panel title="Your clearance">
            <p className="text-[14px] text-hud-dim leading-relaxed">
              Signed in as <b className="text-hud-text">{user?.name}</b> ({user?.role}).{" "}
              {user?.clearance === "Restricted"
                ? "You can retrieve every document, including Restricted chunks."
                : "Restricted chunks are filtered out of the query before the model ever sees them — ask about the 2023 incident to see the abstention."}
            </p>
            <div className="flex gap-1.5 mt-3 flex-wrap">
              <Badge tone="green">Public</Badge>
              <Badge tone="cyan">Internal</Badge>
              <Badge tone={user?.clearance === "Restricted" ? "red" : "dim"}>
                Restricted — {user?.clearance === "Restricted" ? "read" : "denied"}
              </Badge>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
