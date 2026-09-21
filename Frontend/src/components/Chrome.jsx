import React from "react";
import { Icon } from "./Hud";
import { NAV, USER } from "../data/mock";

export function Topbar({ onSearch }) {
  return (
    <header className="relative z-30 flex items-center gap-3 md:gap-7 px-4 md:px-5 py-3 border-b border-hud-edge bg-hud-bg1/70 backdrop-blur-sm">
      <div className="flex items-center gap-2.5 shrink-0">
        <span className="w-5 h-5 rotate-45 border-[1.5px] border-hud-cyan relative shrink-0 shadow-[0_0_10px_rgba(69,216,255,.5)]">
          <span className="absolute inset-1 bg-hud-cyan" />
        </span>
        <span className="font-display font-bold text-[19px] tracking-wide text-white leading-none">
            SOVEREIGN<span className="text-hud-cyan font-semibold">AI</span>
          <small className="hidden sm:block font-mono text-[9.5px] text-hud-faint tracking-[.14em] font-normal mt-1">
            SIH26117 · MRPL · AGENTIC WORKBENCH
          </small>
        </span>
      </div>

      <label className="hidden md:flex flex-1 max-w-[360px] items-center gap-2 bg-white/[0.03] border border-hud-edge px-3 py-1.5">
        <Icon name="search" className="w-3.5 h-3.5 text-hud-cyandim" />
        <input
          onChange={e => onSearch && onSearch(e.target.value)}
          placeholder="Search assets, tasks, documents…"
          className="bg-transparent outline-none text-[11px] text-hud-text placeholder-hud-faint w-full focus:ring-0"
        />
      </label>

      <div className="ml-auto flex items-center gap-3 md:gap-4">
        <span className="hidden sm:block text-[10px] text-hud-faint">Offline · node-01</span>
        <div className="flex items-center gap-2.5 pl-3 md:pl-4 border-l border-hud-edge">
          <span className="w-6 h-6 rounded-full bg-gradient-to-br from-hud-cyan to-hud-blue grid place-items-center text-[10px] font-bold text-hud-bg0 shrink-0">
            {USER.initials}
          </span>
          <span className="hidden sm:block leading-tight">
            <span className="block font-display font-semibold text-[13px] text-white">{USER.name}</span>
            <span className="block text-[9px] text-hud-faint">{USER.role} · {USER.clearance}</span>
          </span>
        </div>
      </div>
    </header>
  );
}

export function StatusStrip() {
  const stats = [
    { k: "LINK", v: "OFFLINE", led: "green" },
    { k: "EGRESS", v: "0 bytes", led: "green" },
    { k: "GPU", v: "61%", led: "amber" },
    { k: "MODEL", v: "qwen2.5-14b-instruct", led: "amber" },
    { k: "AUDIT", v: "chain verified", led: "green" },
    { k: "QUEUE", v: "1 running · 2 waiting", led: "amber" },
  ];
  const c = { green: "bg-hud-green shadow-[0_0_6px_#4FE2A8]", amber: "bg-hud-amber shadow-[0_0_6px_#FF9A4D]" };
  return (
    <div className="relative z-20 flex border-b border-hud-edge bg-hud-bg1/60 backdrop-blur-sm overflow-x-auto">
      {stats.map(s => (
        <div key={s.k} className="flex items-center gap-2 px-3 md:px-4 py-2 border-r border-white/[0.05] whitespace-nowrap shrink-0">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c[s.led]}`} />
          <span className="text-[10px] text-hud-faint tracking-widest">{s.k}</span>
          <span className="text-[11px] text-hud-text">{s.v}</span>
        </div>
      ))}
    </div>
  );
}

const NAV_ICON = {
  overview: "layers", agent: "bolt", knowledge: "doc", models: "chip",
  sandbox: "play", multimodal: "eye", sovereignty: "shield",
  audit: "lock", projects: "users", evaluation: "chart",
};

export function NavRail({ page, setPage }) {
  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:block relative z-20 w-[186px] shrink-0 border-r border-hud-edge bg-hud-bg1/50 backdrop-blur-sm py-3">
        {NAV.map(n => {
          const on = n.id === page;
          return (
            <button
              key={n.id}
              onClick={() => setPage(n.id)}
              className={`w-full text-left flex items-center gap-2.5 px-4 py-2.5 border-l-2 transition-colors
                focus-visible:outline focus-visible:outline-1 focus-visible:outline-hud-cyan
                ${on ? "border-hud-cyan bg-hud-cyan/10 text-white" : "border-transparent text-hud-dim hover:text-hud-text hover:bg-white/[0.03]"}`}
            >
              <Icon name={NAV_ICON[n.id]} className={`w-4 h-4 shrink-0 ${on ? "text-hud-cyan" : ""}`} />
              <span className="leading-tight">
                <span className="block font-display font-semibold text-[13px]">{n.label}</span>
                <span className="block text-[9px] text-hud-faint">{n.hint}</span>
              </span>
            </button>
          );
        })}
      </nav>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex border-t border-hud-edge bg-hud-bg1/95 backdrop-blur-md">
        {NAV.map(n => {
          const on = n.id === page;
          return (
            <button
              key={n.id}
              onClick={() => setPage(n.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors
                ${on ? "text-hud-cyan" : "text-hud-faint"}`}
            >
              <Icon name={NAV_ICON[n.id]} className="w-4 h-4" />
              <span className="text-[8px] font-display font-semibold leading-none">{n.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}

export function PageHead({ title, sub, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
      <div className="min-w-0">
        <h1 className="font-display font-bold text-[20px] sm:text-[22px] text-white leading-tight tracking-wide break-words">{title}</h1>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <p className="text-[11px] text-hud-dim break-words">{sub}</p>
          <span className="text-[9px] border border-hud-green/40 text-hud-green px-1.5 py-0.5 tracking-wide whitespace-nowrap">● PROTOTYPE-VERIFIED</span>
        </div>
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}

export function Button({ children, variant = "ghost", onClick, className = "" }) {
  const v = {
    primary: "bg-hud-cyan text-hud-bg0 border-hud-cyan font-semibold",
    ghost: "border-hud-edge text-hud-text hover:bg-white/[0.04]",
    quiet: "border-transparent text-hud-dim hover:text-hud-text",
  }[variant];
  return (
    <button
      onClick={onClick}
      className={`font-display text-[12.5px] px-3.5 py-2 border tracking-wide
        focus-visible:outline focus-visible:outline-1 focus-visible:outline-hud-cyan ${v} ${className}`}
    >
      {children}
    </button>
  );
}
