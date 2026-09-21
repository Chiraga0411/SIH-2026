import React, { useState } from "react";
import { Corners, Icon } from "../components/Hud";

/* Sign-in. In production this hits the gateway, which validates against
   the company directory (LDAP/AD). Demo accounts are local. */

const ROLES = ["Engineer", "Manager", "Admin"];

export default function Login({ onEnter }) {
  const [role, setRole] = useState("Engineer");

  return (
    <div className="min-h-screen grid place-items-center relative overflow-hidden">
      <div className="absolute inset-0 opacity-50"
           style={{ backgroundImage:"linear-gradient(rgba(69,216,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(69,216,255,.06) 1px, transparent 1px)", backgroundSize:"44px 44px" }} />
      <div className="relative w-[380px] bg-hud-panel border border-hud-edge backdrop-blur-sm p-8">
        <Corners />
        <div className="flex items-center gap-3 mb-7">
          <span className="w-6 h-6 rotate-45 border-[1.5px] border-hud-cyan relative shrink-0">
            <span className="absolute inset-1 bg-hud-cyan" />
          </span>
          <span className="font-display font-bold text-[21px] text-white tracking-wide">
            SOVEREIGN<span className="text-hud-cyan font-semibold">AI</span>
          </span>
        </div>

        <p className="text-[11px] text-hud-dim leading-relaxed mb-6">
          This workbench runs entirely inside the plant network. Nothing you upload
          or ask leaves this server.
        </p>

        <label className="block mb-3">
          <span className="text-[9.5px] text-hud-faint tracking-widest">EMPLOYEE ID</span>
          <input defaultValue="MRPL-4417" className="mt-1.5 w-full bg-white/[0.04] border border-hud-edge px-3 py-2 text-[12px] text-hud-text outline-none focus:border-hud-cyan" />
        </label>
        <label className="block mb-5">
          <span className="text-[9.5px] text-hud-faint tracking-widest">PASSWORD</span>
          <input type="password" defaultValue="passphrase" className="mt-1.5 w-full bg-white/[0.04] border border-hud-edge px-3 py-2 text-[12px] text-hud-text outline-none focus:border-hud-cyan" />
        </label>

        <span className="text-[9.5px] text-hud-faint tracking-widest">SIGN IN AS</span>
        <div className="flex gap-1.5 mt-1.5 mb-6">
          {ROLES.map(r => (
            <button key={r} onClick={() => setRole(r)}
              className={`flex-1 py-2 text-[11.5px] font-display font-semibold border transition-colors
                ${role === r ? "border-hud-cyan text-hud-cyan bg-hud-cyan/10" : "border-hud-edge text-hud-dim hover:text-hud-text"}`}>
              {r}
            </button>
          ))}
        </div>

        <button onClick={() => onEnter(role)}
          className="w-full bg-hud-cyan text-hud-bg0 font-display font-bold text-[13.5px] py-2.5 tracking-wide">
          Enter workbench
        </button>

        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-hud-edge text-[10px] text-hud-faint">
          <Icon name="shield" className="w-3.5 h-3.5 text-hud-green" />
          Air-gapped design · local demo data · no external calls
        </div>
      </div>
    </div>
  );
}
