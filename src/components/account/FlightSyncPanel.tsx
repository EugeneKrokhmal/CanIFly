"use client";

import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";

export type FlightSummary = {
  id: string;
  startedAt: string;
  durationS: number;
  distanceM: number;
  maxHeightM: number | null;
  aircraftName: string | null;
  startLat: number | null;
  startLng: number | null;
  hasTrack: boolean;
  sourceFileName?: string | null;
};

function formatDuration(s: number): string {
  if (!Number.isFinite(s) || s <= 0) return "—";
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

export function FlightSyncPanel({ pilotId }: { pilotId: string }) {
  const [flights, setFlights] = useState<FlightSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [keyConfigured, setKeyConfigured] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/flights/mine", { credentials: "include" });
      const data = (await res.json().catch(() => null)) as {
        flights?: FlightSummary[];
        djiApiKeyConfigured?: boolean;
        error?: string;
      } | null;
      if (!res.ok) {
        setError(data?.error ?? "Could not load flights");
        return;
      }
      setFlights(data?.flights ?? []);
      setKeyConfigured(Boolean(data?.djiApiKeyConfigured));
      setError(null);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const form = new FormData();
      for (const file of Array.from(fileList)) {
        form.append("files", file);
      }
      const res = await fetch("/api/flights/upload", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const data = (await res.json().catch(() => null)) as {
        imported?: FlightSummary[];
        skipped?: { file: string; reason: string }[];
        errors?: { file: string; error: string }[];
        note?: string;
        error?: string;
        djiApiKeyConfigured?: boolean;
      } | null;
      if (!res.ok) {
        setError(data?.error ?? `Upload failed (${res.status})`);
        return;
      }
      setKeyConfigured(Boolean(data?.djiApiKeyConfigured));
      const n = data?.imported?.length ?? 0;
      const skip = data?.skipped?.length ?? 0;
      const errN = data?.errors?.length ?? 0;
      setMessage(
        `Synced ${n} flight(s)${skip ? `, ${skip} already on account` : ""}${
          errN ? `, ${errN} failed` : ""
        }.${data?.note ? ` ${data.note}` : ""}`,
      );
      if (data?.errors?.length) {
        setError(data.errors.map((e) => `${e.file}: ${e.error}`).join(" · "));
      }
      await refresh();
    } catch {
      setError("Network error during upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="as-rise-soft mt-8 rounded-2xl border border-[var(--as-line-soft)] bg-[var(--as-surface)] p-5 shadow-[var(--as-shadow)]">
      <h2 className="text-[16px] font-semibold tracking-tight">Flight history</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-[var(--as-ink-soft)]">
        Upload DJI Fly <code className="text-[12px]">FlightRecord_*.txt</code>{" "}
        files (or a zip).{" "}
        <Link
          href="/guide/flights"
          className="font-semibold text-[#ff385c] hover:underline"
        >
          iPhone & Android guide with screenshots
        </Link>
        .
      </p>

      <label className="as-press mt-4 inline-flex cursor-pointer items-center justify-center rounded-xl bg-[var(--as-ink)] px-4 py-2.5 text-[14px] font-semibold text-[var(--as-ink-invert)] disabled:opacity-60">
        {uploading ? "Uploading…" : "Upload DJI flights"}
        <input
          type="file"
          accept=".txt,.zip,application/zip,text/plain"
          multiple
          className="sr-only"
          disabled={uploading}
          onChange={(e) => {
            void onUpload(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {!keyConfigured ? (
        <p className="mt-3 text-[12px] text-[var(--as-ink-soft)]">
          Full GPS tracks need <code>DJI_API_KEY</code> on the API (Open API app
          on developer.dji.com). Without it, takeoff stats still sync.
        </p>
      ) : null}

      {message ? (
        <p className="mt-3 rounded-xl bg-[var(--as-hover-green)] px-3 py-2 text-[13px] text-[var(--as-clear)]">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 rounded-xl bg-[var(--as-hover-warm)] px-3 py-2 text-[13px] text-[var(--as-prohibited)]">
          {error}
        </p>
      ) : null}

      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-[13px] font-semibold">
            Your flights{loading ? "" : ` · ${flights.length}`}
          </h3>
          <Link
            href={`/pilots/${pilotId}`}
            className="text-[12px] font-semibold text-[#ff385c] hover:underline"
          >
            Open profile
          </Link>
        </div>
        {loading ? (
          <p className="mt-2 text-[13px] text-[var(--as-ink-soft)]">Loading…</p>
        ) : flights.length === 0 ? (
          <p className="mt-2 text-[13px] text-[var(--as-ink-soft)]">
            No flights synced yet.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-[var(--as-line-soft)]">
            {flights.map((f) => (
              <li key={f.id} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold">
                    {f.aircraftName ?? "Flight"} ·{" "}
                    {new Date(f.startedAt).toLocaleString()}
                  </p>
                  <p className="text-[12px] text-[var(--as-ink-soft)]">
                    {formatDuration(f.durationS)} ·{" "}
                    {Math.round(f.distanceM)} m
                    {f.maxHeightM != null ? ` · max ${f.maxHeightM} m` : ""}
                    {f.hasTrack ? " · track" : ""}
                  </p>
                </div>
                {f.startLat != null && f.startLng != null ? (
                  <Link
                    href={{
                      pathname: "/",
                      query: {
                        lat: f.startLat.toFixed(5),
                        lng: f.startLng.toFixed(5),
                      },
                    }}
                    className="shrink-0 text-[12px] font-semibold text-[#ff385c] hover:underline"
                  >
                    Map
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
