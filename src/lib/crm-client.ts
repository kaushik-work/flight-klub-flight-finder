// Tells the server about a signup or plan purchase so the CRM can report on it. Fire and forget: if the server cannot
// record it (no server login in local demo, or a blip) the person's own flow carries on untouched.
export function reportMember(event: "signup" | "trial" | "plan", who: { name: string; city: string; email?: string }, extra: { planId?: string; method?: string } = {}) {
  void fetch("/api/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event, ...who, ...extra }) }).catch(() => {});
}
