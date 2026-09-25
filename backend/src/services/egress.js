import { appendAudit } from './auditChain.js';

/* One place where an outbound attempt is judged. The gateway's egress
   policy is DENY_ALL: nothing is ever routed out. The attempt is recorded
   to the hash-chained audit log and returned to the UI. When a real
   container is available the caller runs the attempt inside it with
   --network none, which fails at the network layer; either way the
   result written to the chain is the same audited event. */

export async function recordBlockedProbe(user, target, by) {
  const event = await appendAudit({
    user,
    action: 'egress_probe',
    resource: target,
    model: by,
    result: 'blocked',
    note: 'denied by egress policy DENY_ALL',
  });
  return {
    blocked: true,
    target,
    policy: 'DENY_ALL',
    by,
    auditId: event.id,
    hash: event.hash,
    at: event.time,
  };
}
