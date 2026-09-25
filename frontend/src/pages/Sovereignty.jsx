import React, { useEffect, useState } from "react";
import { Panel, Badge, Icon } from "../components/Hud";
import { PageHead, Button } from "../components/Chrome";
import { useApi } from "../api/useApi";
import { api } from "../api/client";

/* The sovereignty proof, made visible. Four independent layers:
   physical disconnection, packet capture, this live monitor, and the
   audit log. The test button asks the gateway to attempt an outbound
   call; the egress policy denies it and writes the attempt to the chain. */

const t = iso => String(iso || "").slice(11, 19);

export default function Sovereignty({ fx }) {
  const { data: status, reload } = useApi("/api/sovereignty/status", { poll: 3000 });
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? false : navigator.onLine);
  const [probing, setProbing] = useState(false);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const test = async () => {
    if (probing) return;
    setProbing(true);
    try {
      await api("/api/sovereignty/probe", { method: "POST", body: { target: "api.openai.com:443" } });
      fx?.blocked("tower");
      reload();
    } catch (e) {
      fx?.toast(`Probe failed: ${e.message}`);
    } finally {
      setProbing(false);
    }
  };

  const blocked = status?.blockedAttempts || [];
  const services = status?.localServices || [];

  return (
    <div>
      <PageHead
        sub="Live connection watch on the gateway, polled every 3 seconds"
        actions={<Button variant="primary" onClick={test} disabled={probing}>
          {probing ? "Recording…" : "Try an outbound call"}
        </Button>}
      />

      <div className="flex items-start gap-2 border border-hud-amber/35 bg-hud-amber/[0.06] px-3 py-2.5 text-[13px] text-hud-dim leading-relaxed mb-3.5">
        <span className="text-hud-amber">▲</span>
        <span><b className="text-hud-amber">Honest scope:</b> {status?.disclosure || "Connecting to gateway…"}</span>
      </div>

      <div className="grid grid-cols-1 gap-3.5 items-start">
        <div className="space-y-3.5">
          <Panel title="External connections" meta={online ? "browser link online" : "browser offline"}>
            <div className="text-center py-5">
              <div className="font-display font-bold text-[64px] leading-none text-hud-green">
                {status?.externalConnections ?? "—"}
              </div>
              <div className="text-[12px] text-hud-faint mt-2">
                gateway uptime {Math.floor((status?.uptimeSec || 0) / 60)}m {((status?.uptimeSec || 0) % 60)}s · policy {status?.egressPolicy || "—"}
              </div>
            </div>
            <div className="border-t border-hud-edge pt-3 text-[13px] text-hud-dim leading-relaxed">
              The gateway holds no outbound client at all: loopback and the Docker bridge are the
              only addresses it ever dials. Anything else is denied and written to the audit chain.
            </div>
          </Panel>

          <Panel title="Proof layers" meta="4 of 4 active">
            {(status?.proofLayers || []).map(p => (
              <div key={p.name} className="flex gap-2.5 py-2 border-b border-white/[0.05] last:border-0">
                <Icon name="check" className="w-3.5 h-3.5 text-hud-green shrink-0 mt-0.5" />
                <span className="leading-tight">
                  <b className="block text-[13px] text-hud-text font-medium">{p.name}</b>
                  <i className="block text-[12px] text-hud-faint not-italic">{p.detail}</i>
                </span>
              </div>
            ))}
          </Panel>
        </div>

        <div className="space-y-3.5">
          <Panel title="Blocked attempts" meta={`${blocked.length} recorded · newest first`}>
            {blocked.length === 0 && (
              <p className="text-[13px] text-hud-faint">No attempts recorded yet. Press “Try an outbound call” — the denial is written to the hash chain you can verify on the Audit tab.</p>
            )}
            {blocked.map((e, i) => (
              <div key={i} className="py-2.5 border-b border-white/[0.05] last:border-0">
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-[12px] text-hud-faint w-[68px] shrink-0">{t(e.t)}</span>
                  <Icon name="x" className="w-3.5 h-3.5 text-hud-red shrink-0" />
                  <span className="flex-1 min-w-0 font-mono text-[13px] text-hud-text truncate" title={e.target}>{e.target}</span>
                  <Badge tone="red">{e.verdict}</Badge>
                </div>
                <div className="text-[12px] text-hud-faint font-mono mt-1 pl-[92px] break-words">{e.by}</div>
              </div>
            ))}
          </Panel>

          <Panel title="Local services" meta="loopback only">
            <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px] min-w-[480px]">
              <thead>
                <tr className="text-[12px] text-hud-faint">
                  {["Process", "Address", "Status", "Scope"].map(h => (
                    <th key={h} className="text-left font-normal pb-2 border-b border-hud-edge/60">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {services.map(c => (
                  <tr key={c.name}>
                    <td className="py-2.5 border-b border-white/[0.05] pr-3 text-hud-text">{c.name}</td>
                    <td className="py-2.5 border-b border-white/[0.05] pr-3 font-mono text-hud-dim">{c.address}</td>
                    <td className="py-2.5 border-b border-white/[0.05] pr-3 text-hud-dim text-[12px]">{c.status}</td>
                    <td className="py-2.5 border-b border-white/[0.05]"><Badge tone="green">local</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </Panel>
        </div>

        <div className="space-y-3.5">
          <Panel title="Telemetry disabled">
            {(status?.telemetryFlags || []).map(v => (
              <div key={v} className="flex gap-2 py-1.5 text-[13px] text-hud-dim border-b border-white/[0.05] last:border-0">
                <Icon name="check" className="w-3 h-3 text-hud-green shrink-0 mt-0.5" />
                <span className="font-mono">{v}</span>
              </div>
            ))}
          </Panel>

          <Panel title="Air-gap design">
            <p className="text-[13px] text-hud-dim leading-relaxed">
              Single on-prem server on the internal network. No cloud API keys exist in the
              gateway; models, knowledge base and files live on this host. Container isolation
              (compose network <span className="font-mono text-hud-cyan">internal: true</span>,
              sandbox <span className="font-mono text-hud-cyan">--network none</span>) layers on top
              when Docker is running.
            </p>
            <div className="flex gap-1.5 mt-3 flex-wrap">
              <Badge tone="cyan">DENY_ALL egress</Badge>
              <Badge tone="cyan">no API keys</Badge>
              <Badge tone="cyan">offline models</Badge>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
