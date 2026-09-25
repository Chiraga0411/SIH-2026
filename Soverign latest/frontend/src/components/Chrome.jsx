import React from "react";

/* Shared bits used inside the campus panel: the page header line and buttons. */

export function PageHead({ sub, actions }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2.5 flex-wrap">
        <p className="m-0 text-[14px] text-hud-dim break-words">{sub}</p>
        <span className="text-[12px] border border-hud-green/60 text-hud-green px-[7px] leading-[18px] whitespace-nowrap">● PROTOTYPE-VERIFIED</span>
      </div>
      {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Button({ children, variant = "ghost", onClick, className = "", ...rest }) {
  const v = {
    primary: "bg-hud-amber border-hud-amber text-[#1a1203] font-semibold hover:bg-[#ffc063] hover:border-[#ffc063]",
    ghost: "bg-[#0f2036] border-hud-edge text-hud-text font-medium hover:border-hud-cyan",
    quiet: "bg-transparent border-transparent text-hud-dim font-medium hover:text-hud-text",
  }[variant];
  return (
    <button onClick={onClick} {...rest}
      className={`text-[14px] min-h-[38px] px-3.5 py-1.5 border ${v} ${className}`}>
      {children}
    </button>
  );
}
