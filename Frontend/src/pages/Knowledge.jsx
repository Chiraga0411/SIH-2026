import React, { useState } from "react";
import { Panel, Badge, Bar, Icon } from "../components/Hud";
import { PageHead, Button } from "../components/Chrome";
import { DOCS, CITATIONS } from "../data/mock";

/* Knowledge base: ingested sources, clearance labels, and a query
   pane that always shows where an answer came from. Clearance is
   enforced at retrieval time, not hidden in the UI. */

const CLEAR_TONE = { Public:"green", Internal:"cyan", Restricted:"red" };

export default function Knowledge() {
  const [q, setQ] = useState("What is the minimum shell thickness for P-101?");
  const [asked, setAsked] = useState(true);

  return (
    <div className="p-4 sm:p-5">
      <PageHead
        title="Knowledge base"
        sub="342 documents · hybrid retrieval (vector + BM25) with a local reranker"
        actions={<Button variant="primary">Add source folder</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-3.5 items-start">
        <div className="space-y-3.5">
          <Panel title="Ask the knowledge base" meta="answers are cited or refused">
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <input value={q} onChange={e => setQ(e.target.value)}
                className="flex-1 bg-white/[0.04] border border-hud-edge px-3 py-2.5 text-[12.5px] text-hud-text outline-none focus:border-hud-cyan" />
              <Button variant="primary" onClick={() => setAsked(true)}>Search</Button>
            </div>

            {asked && (
              <>
                <div className="border-l-2 border-hud-cyan pl-3.5 py-1 mb-4">
                  <p className="text-[12.5px] text-hud-text leading-relaxed">
                    The minimum permissible shell thickness for a class II vessel such as P-101
                    is 8.5 mm after corrosion allowance. The last recorded measurement was 8.1 mm,
                    which is below tolerance and requires a follow-up inspection before return to service.
                  </p>
                  <div className="flex gap-2 mt-2.5">
                    <Badge tone="green">3 sources</Badge>
                    <Badge tone="cyan">reranker confidence 0.91</Badge>
                  </div>
                </div>

                <div className="text-[9.5px] text-hud-faint tracking-widest mb-2">RETRIEVED CHUNKS</div>
                {CITATIONS.map((c, i) => (
                  <div key={i} className="border border-hud-edge bg-black/20 p-3 mb-2 last:mb-0">
                    <div className="flex items-baseline gap-2 mb-1.5">
                      <span className="text-[11px] text-hud-cyan">{c.doc}</span>
                      <span className="text-[9.5px] text-hud-faint">page {c.page}</span>
                      <span className="ml-auto text-[9.5px] text-hud-dim">score {c.score}</span>
                    </div>
                    <p className="text-[11.5px] text-hud-dim leading-relaxed">{c.text}</p>
                  </div>
                ))}
                <p className="text-[10.5px] text-hud-faint mt-3 flex items-center gap-2">
                  <Icon name="shield" className="w-3.5 h-3.5 text-hud-green" />
                  When the best chunk scores below 0.45 the agent answers "not found in the knowledge base" instead of guessing.
                </p>
              </>
            )}
          </Panel>

          <Panel title="Indexed documents" meta={DOCS.length + " shown of 342"}>
            <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11.5px] min-w-[640px]">
              <thead>
                <tr className="text-[9.5px] text-hud-faint tracking-wide">
                  {["Document","Type","Pages","Chunks","Clearance","Ingested"].map(h => (
                    <th key={h} className="text-left font-normal pb-2 border-b border-hud-edge/60">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DOCS.map(d => (
                  <tr key={d.name}>
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
          <Panel title="Connectors">
            {[["Watch folder","/srv/mrpl/sops","synced"],["Network share","//fileserver/eng","synced"],["Mailbox export",".eml archive","synced"]].map(([n, p, s]) => (
              <div key={n} className="flex items-center gap-2 py-2 border-b border-white/[0.05] last:border-0">
                <span className="w-1.5 h-1.5 rounded-full bg-hud-green shrink-0" />
                <span className="leading-tight">
                  <b className="block text-[11.5px] text-hud-text font-medium">{n}</b>
                  <i className="block text-[9.5px] text-hud-faint not-italic font-mono">{p}</i>
                </span>
                <span className="ml-auto text-[9.5px] text-hud-green">{s}</span>
              </div>
            ))}
            <button className="mt-3 w-full border border-dashed border-hud-edge text-hud-dim text-[10.5px] py-2.5 hover:border-hud-cyan/50">
              + add connector
            </button>
          </Panel>

          <Panel title="Retrieval quality" meta="last 30 queries">
            <Bar label="Hit @1" value={82} />
            <Bar label="Hit @5" value={95} />
            <Bar label="Answer correctness" value={87} />
            <p className="text-[10px] text-hud-faint leading-relaxed mt-3">
              Measured against a fixed 30-question set. Full comparison on the Evaluation page.
            </p>
          </Panel>

          <Panel title="Your clearance">
            <p className="text-[11.5px] text-hud-dim leading-relaxed">
              You can retrieve Public and Internal documents. Restricted chunks are filtered out of
              the vector query before the model ever sees them.
            </p>
            <div className="flex gap-1.5 mt-3">
              <Badge tone="green">Public</Badge><Badge tone="cyan">Internal</Badge><Badge tone="dim">Restricted — denied</Badge>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
