import React, { useState } from "react";
import { Icon } from "../components/Hud";
import { Button } from "../components/Chrome";

/* Sign-in. In production this hits the gateway, which validates against
   the company directory (LDAP/AD). Demo accounts are local. */

const ROLES = ["Engineer", "Manager", "Admin"];
const FIELD = "mt-1.5 w-full bg-hud-bg0 border border-hud-edge px-3 py-2.5 text-[14px] text-hud-text outline-none focus:border-hud-cyan";

export default function Login({ onEnter }) {
  const [role, setRole] = useState("Engineer");

  return (
    <div className="min-h-screen grid place-items-center relative overflow-hidden py-[calc(16px+env(safe-area-inset-top))]">
      <div className="absolute inset-0"
           style={{ backgroundImage: "linear-gradient(#0d2035 1px, transparent 1px), linear-gradient(90deg, #0d2035 1px, transparent 1px)", backgroundSize: "44px 44px", opacity: .7 }} />
      <div className="relative w-full max-w-[400px] mx-4 bg-hud-panel border border-hud-edge border-l-4 border-l-hud-cyan backdrop-blur-md p-6 sm:p-8">
        <h1 className="m-0 font-display font-bold text-[32px] leading-none text-hud-text">Sovereign Workbench</h1>
        <p className="mt-2 mb-6 text-[14px] text-hud-dim leading-relaxed">
          This workbench runs entirely inside the plant network. Nothing you upload
          or ask leaves this server.
        </p>

        <label className="block mb-3">
          <span className="text-[13px] text-hud-dim">Employee ID</span>
          <input defaultValue="MRPL-4417" className={FIELD} />
        </label>
        <label className="block mb-5">
          <span className="text-[13px] text-hud-dim">Password</span>
          <input type="password" defaultValue="passphrase" className={FIELD} />
        </label>

        <span className="text-[13px] text-hud-dim">Sign in as</span>
        <div className="flex gap-1.5 mt-1.5 mb-6" role="group" aria-label="Role">
          {ROLES.map(r => (
            <button key={r} onClick={() => setRole(r)} aria-pressed={role === r}
              className={`flex-1 min-h-[40px] text-[14px] font-medium border
                ${role === r ? "border-hud-cyan text-hud-cyan bg-hud-cyan/10" : "border-hud-edge text-hud-dim hover:text-hud-text"}`}>
              {r}
            </button>
          ))}
        </div>

        <Button variant="primary" onClick={() => onEnter(role)} className="w-full min-h-[44px] text-[15px]">
          Enter workbench
        </Button>

        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-hud-edge text-[13px] text-hud-dim">
          <Icon name="shield" className="w-4 h-4 text-hud-green shrink-0" />
          Air-gapped design · local demo data · no external calls
        </div>
      </div>
    </div>
  );
}
