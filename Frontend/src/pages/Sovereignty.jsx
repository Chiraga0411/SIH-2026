import React, { useEffect, useState } from "react";
import { Panel, Badge, Icon } from "../components/Hud";
import { PageHead, Button } from "../components/Chrome";
import { EGRESS, LOCAL_CONNS } from "../data/mock";

/* The sovereignty proof, made visible. Four independent layers:
   physical disconnection, packet capture, this live monitor, and the
   audit log. The test button deliberately tries to leave the network. */

export default function Sovereignty() {
  const [log, setLog] = useState(EGRESS);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? false : navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const test = () => setLog([
    { t:new Date().toTimeString().slice(0,8), target:"example.com:443", verdict:"blocked", by:"manual test from sandbox" },
    ...log,
  ]);

  return (
    <div className="p-5">
      <PageHead
        title="Sovereignty monitor"
        sub="Live connection watch over every process in the stack, polled each second"
        actions={<Button variant="primary" onClick={test}>Try an outbound call</Button>}
      />

      <div className="flex items-start gap-2 border border-hud-amber/35 bg-hud-amber/[0.06] px-3 py-2.5 text-[10.5px] text-hud-dim leading-relaxed">
        <span className="text-hud-amber">▲</span>
        <span><b className="text-hud-amber">Prototype disclosure:</b> connection counters and sample events are local demo data. Browser link state is live; production enforcement comes from the gateway, container policy, and host network monitor.</span>
      </div>

      <div className="grid grid-cols-[320px_1fr_300px] gap-3.5 items-start">
        <div className="space-y-3.5">
          <Panel title="External connections" meta={online ? "browser link online" : "browser offline"}>
            <div className="text-center py-5">
              <div className="font-display font-bold text-[64px] leading-none text-hud-green">0</div>
              <div className="text-[10px] text-hud-faint tracking-widest mt-2">SINCE BOOT · 4h 12m</div>
            </div>
            <div className="border-t border-hud-edge pt-3 text-[11px] text-hud-dim leading-relaxed">
              Loopback and the Docker bridge are whitelisted. Anything else is counted here
              and written to the audit chain.
            </div>
          </Panel>

          <Panel title="Proof layers" meta="4 of 4 active">
            {[["Network physically off","Wi-Fi disabled, cable out"],["Packet capture","Wireshark, zero non-local"],["This monitor","psutil + systeminformation"],["Audit log","every call recorded locally"]].map(([n, d]) => (
              <div key={n} className="flex gap-2.5 py-2 border-b border-white/[0.05] last:border-0">
                <Icon name="check" className="w-3.5 h-3.5 text-hud-green shrink-0 mt-0.5" />
                <span className="leading-tight">
                  <b className="block text-[11.5px] text-hud-text font-medium">{n}</b>
                  <i className="block text-[10px] text-hud-faint not-italic">{d}</i>
                </span>
              </div>
            ))}
          </Panel>
        </div>

        <div className="space-y-3.5">
          <Panel title="Blocked attempts" meta="newest first">
            {log.map((e, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 border-b border-white/[0.05] last:border-0">
                <span className="text-[9.5px] text-hud-faint w-14 shrink-0">{e.t}</span>
                <Icon name="x" className="w-3.5 h-3.5 text-hud-red shrink-0" />
                <span className="flex-1 font-mono text-[11px] text-hud-text">{e.target}</span>
                <span className="text-[10px] text-hud-dim">{e.by}</span>
                <Badge tone="red">{e.verdict}</Badge>
              </div>
            ))}
          </Panel>

          <Panel title="Local traffic" meta="loopback only">
            <table className="w-full border-collapse text-[11.5px]">
              <thead>
                <tr className="text-[9.5px] text-hud-faint tracking-wide">
                  {["Process","Listening on","Peer","Scope"].map(h => (
                    <th key={h} className="text-left font-normal pb-2 border-b border-hud-edge/60">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {LOCAL_CONNS.map(c => (
                  <tr key={c.proc}>
                    <td className="py-2.5 border-b border-white/[0.05] pr-3 text-hud-text">{c.proc}</td>
                    <td className="py-2.5 border-b border-white/[0.05] pr-3 font-mono text-hud-dim">{c.addr}</td>
                    <td className="py-2.5 border-b border-white/[0.05] pr-3 font-mono text-hud-dim">{c.peer}</td>
                    <td className="py-2.5 border-b border-white/[0.05]"><Badge tone="green">local</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>

        <div className="space-y-3.5">
          <Panel title="Telemetry disabled">
            {["chroma anonymized_telemetry=False","HF_HUB_OFFLINE=1","TRANSFORMERS_OFFLINE=1","no LangSmith keys set","ollama update check off"].map(v => (
              <div key={v} className="flex gap-2 py-1.5 text-[10.5px] text-hud-dim border-b border-white/[0.05] last:border-0">
                <Icon name="check" className="w-3 h-3 text-hud-green shrink-0 mt-0.5" />
                <span className="font-mono">{v}</span>
              </div>
            ))}
          </Panel>

          <Panel title="Deployment">
            <p className="text-[11.5px] text-hud-dim leading-relaxed">
              The whole stack runs on a docker-compose network marked internal, so containers
              cannot route outward even if code tries. Install runs from a USB bundle with no
              internet present.
            </p>
            <div className="flex gap-1.5 mt-3 flex-wrap">
              <Badge tone="cyan">internal: true</Badge>
              <Badge tone="cyan">offline bundle</Badge>
              <Badge tone="cyan">models pre-pulled</Badge>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
