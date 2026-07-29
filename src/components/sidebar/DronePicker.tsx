"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CatalogDrone } from "@/lib/drones/catalog";
import {
  useDroneProfileStore,
  type WeightClass,
} from "@/stores/drone-profile";

const POPULAR = [
  "dji::mini 4 pro",
  "dji::mini 3 pro",
  "dji::mini 3",
  "dji::air 3",
  "dji::air 3s",
  "dji::mavic 3",
  "dji::mavic 3 classic",
  "dji::mavic 3 pro",
  "dji::avata 2",
  "dji::neo",
];

export function DronePicker() {
  const selectedDrone = useDroneProfileStore((s) => s.selectedDrone);
  const setSelectedDrone = useDroneProfileStore((s) => s.setSelectedDrone);
  const weightClass = useDroneProfileStore((s) => s.weightClass);
  const setWeightClass = useDroneProfileStore((s) => s.setWeightClass);

  const [drones, setDrones] = useState<CatalogDrone[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/drones/catalog");
        const data = (await res.json()) as {
          drones?: CatalogDrone[];
          meta?: { error?: string };
        };
        if (cancelled) return;
        setDrones(data.drones ?? []);
        setError(data.meta?.error ?? null);
      } catch {
        if (!cancelled) setError("catalog_unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      const popular = POPULAR.map((id) =>
        drones.find((d) => d.id === id),
      ).filter((d): d is CatalogDrone => Boolean(d));
      if (popular.length > 0) return popular;
      return drones.slice(0, 12);
    }
    return drones
      .filter(
        (d) =>
          d.label.toLowerCase().includes(q) ||
          d.manufacturer.toLowerCase().includes(q) ||
          d.name.toLowerCase().includes(q),
      )
      .slice(0, 40);
  }, [drones, query]);

  const pick = (drone: CatalogDrone) => {
    setSelectedDrone({
      id: drone.id,
      manufacturer: drone.manufacturer,
      name: drone.name,
      label: drone.label,
      uasClass: drone.uasClass,
      weightG: drone.weightG,
      maxTakeoffG: drone.maxTakeoffG,
      weightClass: drone.weightClass,
      classSource: drone.classSource,
    });
    setWeightClass(drone.weightClass);
    setQuery("");
    setOpen(false);
  };

  const clear = () => {
    setSelectedDrone(null);
    setQuery("");
  };

  const classHint = (wc: WeightClass) =>
    wc === "c0" ? "C0" : wc === "c1" ? "C1" : "C2";

  return (
    <div ref={rootRef} className="relative mt-1">
      <label className="mb-1.5 block text-[12px] font-semibold text-[var(--as-ink)]">
        Your drone
      </label>

      {selectedDrone ? (
        <div className="rounded-xl border border-[var(--as-ink)] bg-[var(--as-surface-muted)] px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-[14px] font-semibold text-[var(--as-ink)]">
                {selectedDrone.label}
              </div>
              <div className="mt-1 text-[12px] text-[var(--as-ink-soft)]">
                {selectedDrone.uasClass
                  ? `EASA ${selectedDrone.uasClass}`
                  : "No class mark"}
                {" · "}
                filter {classHint(selectedDrone.weightClass)}
                {selectedDrone.maxTakeoffG != null
                  ? ` · ${Math.round(selectedDrone.maxTakeoffG)}g MTOM`
                  : selectedDrone.weightG != null
                    ? ` · ${Math.round(selectedDrone.weightG)}g`
                    : ""}
              </div>
            </div>
            <button
              type="button"
              onClick={clear}
              className="shrink-0 text-[13px] font-semibold text-[var(--as-ink-soft)] hover:text-[var(--as-ink)]"
            >
              Clear
            </button>
          </div>
        </div>
      ) : (
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={loading ? "Loading catalog…" : "Search Mini 4 Pro, Air 3…"}
          disabled={loading}
          className="w-full rounded-xl border border-[var(--as-line)] bg-[var(--as-surface)] px-3 py-2.5 text-[14px] text-[var(--as-ink)] outline-none placeholder:text-[var(--as-muted)] focus:border-[var(--as-ink)]"
        />
      )}

      {open && !selectedDrone && (
        <ul className="absolute z-20 mt-1.5 max-h-56 w-full overflow-y-auto rounded-xl border border-[var(--as-line-soft)] bg-[var(--as-surface)] shadow-[0_6px_20px_rgba(0,0,0,0.12)]">
          {filtered.length === 0 && (
            <li className="px-3 py-3 text-[13px] text-[var(--as-ink-soft)]">
              {loading ? "Loading…" : error ? "Catalog unavailable" : "No matches"}
            </li>
          )}
          {filtered.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => pick(d)}
                className="flex w-full items-start justify-between gap-2 px-3 py-2.5 text-left hover:bg-[var(--as-surface-muted)]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-[var(--as-ink)]">
                    {d.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-[var(--as-ink-soft)]">
                    {d.uasClass ? `EASA ${d.uasClass}` : "unlabeled"}
                    {d.maxTakeoffG != null
                      ? ` · ${Math.round(d.maxTakeoffG)}g`
                      : ""}
                  </span>
                </span>
                <span className="shrink-0 text-[12px] font-semibold text-[#ff385c]">
                  {classHint(d.weightClass)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!selectedDrone && (
        <p className="mt-1.5 text-[12px] text-[var(--as-ink-soft)]">
          Or pick class manually
          {weightClass ? ` (now ${weightClass.toUpperCase()})` : ""}.
        </p>
      )}
    </div>
  );
}
