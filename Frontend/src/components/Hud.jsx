import React from "react";

/* ---------------------------------------------------------------
   Workbench primitives, in the campus design language: flat panels
   with a 1px line, square corners, condensed headings, and pills.
--------------------------------------------------------------- */

export function Panel({ title, meta, children, className = "", pad = true }) {
  return (
    <section className={`relative bg-hud-panel border border-hud-edge backdrop-blur-md min-w-0 ${className}`}>
      {title && (
        <header className="flex items-baseline justify-between gap-3 px-4 pt-3.5 pb-2">
          <h3 className="font-display font-semibold text-[18px] leading-none text-hud-text">{title}</h3>
          {meta && <span className="text-[12px] text-hud-dim text-right">{meta}</span>}
        </header>
      )}
      <div className={pad ? "px-4 pb-4" : ""}>{children}</div>
    </section>
  );
}

const TONES = {
  cyan:  "text-hud-cyan border-hud-cyan/60",
  green: "text-hud-green border-hud-green/60",
  amber: "text-hud-amber border-hud-amber/60",
  red:   "text-hud-red border-hud-red/60",
  dim:   "text-hud-dim border-hud-edge",
};

export function Badge({ children, tone = "dim" }) {
  return (
    <span className={`inline-block border px-[7px] text-[12px] leading-[18px] whitespace-nowrap ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function Stat({ value, label, tone = "cyan" }) {
  const c = { cyan:"text-hud-cyan", green:"text-hud-green", amber:"text-hud-amber", red:"text-hud-red", white:"text-white" }[tone];
  return (
    <div>
      <div className={`font-display font-bold text-[34px] leading-none ${c}`}>{value}</div>
      <div className="text-[12px] text-hud-dim mt-1.5">{label}</div>
    </div>
  );
}

export function Bar({ label, value, suffix = "%" }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between gap-3 text-[13px] text-hud-dim mb-1.5">
        <span>{label}</span>
        <b className="font-display text-[16px] leading-none text-hud-text font-semibold">{value}{suffix}</b>
      </div>
      <div className="h-1.5 bg-[#12243a]">
        <div className="h-full bg-hud-cyan" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function Gauge({ value, unit = "% GPU", size = 118 }) {
  return (
    <div className="flex justify-center py-1">
      <div
        className="rounded-full flex items-center justify-center relative"
        style={{
          width: size, height: size,
          background: `conic-gradient(#59d4ff 0% ${value}%, #12243a ${value}% 100%)`,
        }}
      >
        <div className="absolute inset-3 rounded-full bg-hud-bg1 border border-hud-edge" />
        <div className="relative text-center">
          <div className="font-display font-bold text-[30px] text-hud-text leading-none">{value}</div>
          <div className="text-[12px] text-hud-dim mt-1">{unit}</div>
        </div>
      </div>
    </div>
  );
}

export function Donut({ slices, size = 88 }) {
  let acc = 0;
  const stops = slices.map(s => {
    const from = acc; acc += s.value;
    return `${s.color} ${from}% ${acc}%`;
  }).join(", ");
  return (
    <div className="rounded-full relative shrink-0" style={{ width:size, height:size, background:`conic-gradient(${stops})` }}>
      <div className="absolute inset-[15px] rounded-full bg-hud-bg1" />
    </div>
  );
}

export function Sparkline({ points, height = 64 }) {
  const max = Math.max(...points), min = Math.min(...points);
  const w = 230;
  const step = w / (points.length - 1);
  const coords = points.map((p, i) => `${(i * step).toFixed(1)},${(height - ((p - min) / (max - min || 1)) * (height - 8) - 4).toFixed(1)}`);
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="w-full block" style={{ height }}>
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#59d4ff" stopOpacity=".35" />
          <stop offset="100%" stopColor="#59d4ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={`${coords.join(" ")} ${w},${height} 0,${height}`} fill="url(#spark)" stroke="none" />
      <polyline points={coords.join(" ")} fill="none" stroke="#59d4ff" strokeWidth="2" />
    </svg>
  );
}

/* Simple table with the HUD's hairline rules. */
export function Table({ cols, rows }) {
  return (
    <table className="w-full border-collapse text-[14px]">
      <thead>
        <tr>
          {cols.map((c, i) => (
            <th key={i} className="text-left text-[13px] font-medium text-hud-dim pb-2 border-b border-hud-edge">{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((cell, j) => (
              <td key={j} className="py-2.5 align-top border-b border-[#15283f] last:border-0 pr-3">{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Icon({ name, className = "w-4 h-4", style }) {
  const p = {
    bolt: "M13 2 4 14h6l-1 8 9-12h-6z",
    doc: "M6 2h8l4 4v16H6zM14 2v4h4",
    chip: "M8 8h8v8H8zM4 10h4M4 14h4M16 10h4M16 14h4M10 4v4M14 4v4M10 16v4M14 16v4",
    shield: "M12 2 3 6v6c0 5 4 8.5 9 10 5-1.5 9-5 9-10V6z",
    eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
    layers: "m12 2 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 17l9 5 9-5",
    users: "M16 19v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM22 19v-2a4 4 0 0 0-3-3.9",
    chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
    search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3",
    check: "m4 12 5 5L20 6",
    x: "M6 6l12 12M18 6 6 18",
    download: "M12 3v12M7 11l5 5 5-5M4 21h16",
    play: "M6 4l14 8-14 8z",
    lock: "M6 10h12v10H6zM9 10V7a3 3 0 0 1 6 0v3",
    menu: "M4 6h16M4 12h16M4 18h16",
    close: "M6 6l12 12M18 6 6 18",
  }[name] || "";
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
         strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d={p} />
    </svg>
  );
}
