"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CheckBadge } from "@/components/Icons";
import { inr, inrMasked, REGION_ORDER, regionOf } from "@/lib/fares";

export type DestOption = { slug: string; city: string; country: string; from?: number; code?: string };

/**
 * A searchable list in place of a native select. Used for both "Flying from" (no grouping, airport codes)
 * and "Going to" (grouped by region, with the country in brackets and the cheapest fare).
 * Keyboard: type to filter, arrows to move, Enter to choose, Escape to close.
 */
export default function DestinationPicker({
  value, onChange, options, anywhere = "Anywhere", grouped = true, showCountry = true,
  searchPlaceholder = "Search city or country", disabled = false, variant = "box", maskPrices = false,
}: {
  value: string; onChange: (slug: string) => void; options: DestOption[];
  anywhere?: string | null; grouped?: boolean; showCountry?: boolean; searchPlaceholder?: string; disabled?: boolean; variant?: "box" | "bare";
  /** Show "from ₹2xxx7" instead of the real price while fares are locked. */
  maskPrices?: boolean;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  const groups = useMemo(() => {
    const s = q.trim().toLowerCase();
    const m = new Map<string, DestOption[]>();
    for (const o of options) {
      const region = grouped ? regionOf(o.country, o.slug) : "";
      if (s && !`${o.city} ${o.country} ${region} ${o.code ?? ""}`.toLowerCase().includes(s)) continue;
      m.set(region, [...(m.get(region) ?? []), o]);
    }
    const rank = (r: string) => { const i = REGION_ORDER.indexOf(r); return i === -1 ? 99 : i; };
    return [...m.entries()]
      .sort((a, b) => rank(a[0]) - rank(b[0]))
      .map(([region, items]) => ({ region, items: items.sort((a, b) => a.city.localeCompare(b.city)) }));
  }, [options, q, grouped]);

  const hasAny = anywhere !== null && !q.trim();
  // One flat list drives the keyboard. "Anywhere" is the first row unless the user is searching.
  const flat = useMemo<DestOption[]>(
    () => [...(hasAny ? [{ slug: "", city: anywhere as string, country: "" }] : []), ...groups.flatMap((g) => g.items)],
    [groups, hasAny, anywhere],
  );
  const selected = options.find((o) => o.slug === value);

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const away = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  useEffect(() => {
    if (open) document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, open, id]);

  function pick(slug: string) {
    onChange(slug);
    setOpen(false);
    setQ("");
  }
  function key(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(flat.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); if (flat[active]) pick(flat[active].slug); }
    else if (e.key === "Escape") { setOpen(false); }
  }

  const indexOf = (slug: string) => flat.findIndex((x) => x.slug === slug);
  const country = (o: DestOption) => showCountry && o.country ? <span className="font-normal text-muted-foreground"> ({o.country})</span> : null;

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        onClick={() => { setOpen(!open); setActive(Math.max(0, flat.findIndex((o) => o.slug === value))); }}
        className={variant === "bare"
          ? "flex h-6 w-full items-center justify-between gap-2 bg-transparent text-left text-[15px] font-semibold outline-none disabled:opacity-60"
          : "font-label flex h-12 w-full items-center justify-between gap-2 rounded-xl border border-border bg-white px-4 text-left text-sm font-semibold outline-none transition hover:border-primary/50 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 disabled:opacity-60"}
      >
        <span className="truncate">{selected ? <>{selected.city}{country(selected)}</> : anywhere}</span>
        <svg className={`h-4 w-4 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="page-enter absolute left-0 z-30 mt-2 w-full min-w-[17rem] overflow-hidden rounded-2xl border border-border bg-white shadow-2xl shadow-black/15">
          <div className="border-b border-border p-2">
            <label className="relative block">
              <span className="sr-only">{searchPlaceholder}</span>
              <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="9" cy="9" r="6" /><path d="m14 14 4 4" strokeLinecap="round" />
              </svg>
              <input
                ref={search}
                value={q}
                onChange={(e) => { setQ(e.target.value); setActive(0); }}
                onKeyDown={key}
                placeholder={searchPlaceholder}
                className="h-10 w-full rounded-lg bg-muted pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-primary/20"
                role="combobox"
                aria-expanded
                aria-controls={`${id}-list`}
                aria-activedescendant={`${id}-${active}`}
              />
            </label>
          </div>

          <ul id={`${id}-list`} role="listbox" className="max-h-72 overflow-y-auto overscroll-contain p-2">
            {flat.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">Nothing matches &quot;{q}&quot;.</li>}
            {hasAny && (
              <li key="any" id={`${id}-0`} role="option" aria-selected={value === ""}>
                <button type="button" onMouseEnter={() => setActive(0)} onClick={() => pick("")}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[15px] font-semibold ${active === 0 ? "bg-secondary" : ""}`}>
                  <span>{anywhere}</span>{value === "" && <CheckBadge tone="primary" size="xs" />}
                </button>
              </li>
            )}
            {groups.map((g) => (
              <li key={g.region || "all"} role="presentation">
                {g.region && (
                  <p className="font-label sticky top-0 z-10 bg-white/95 px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground backdrop-blur">{g.region}</p>
                )}
                <ul role="presentation">
                  {g.items.map((o) => {
                    const i = indexOf(o.slug);
                    return (
                      <li key={o.slug} id={`${id}-${i}`} role="option" aria-selected={value === o.slug}>
                        <button type="button" onMouseEnter={() => setActive(i)} onClick={() => pick(o.slug)}
                          className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-[15px] ${active === i ? "bg-secondary" : ""}`}>
                          <span className="flex min-w-0 items-center gap-2 font-semibold">
                            {value === o.slug && <CheckBadge tone="primary" size="xs" />}
                            <span className="truncate">{o.city}{country(o)}</span>
                          </span>
                          {o.from !== undefined
                            ? <span className="t-num shrink-0 text-xs text-muted-foreground">from {maskPrices ? inrMasked(o.from) : inr(o.from)}</span>
                            : o.code && <span className="t-num shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-bold tracking-wider text-muted-foreground">{o.code}</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
