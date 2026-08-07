"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuthStore } from "@/stores/auth";

type Category = "suggestion" | "complaint" | "other";

export function ContactForm() {
  const t = useTranslations("contacts.form");
  const locale = useLocale();
  const user = useAuthStore((s) => s.user);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<Category>("suggestion");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName((n) => n || user.name || "");
    setEmail((e) => e || user.email || "");
  }, [user]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          category,
          message,
          website,
          locale,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? t("error"));
        return;
      }
      setSent(true);
      setMessage("");
      setCategory("suggestion");
    } catch {
      setError(t("error"));
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <section className="rounded-2xl border border-[var(--as-line-soft)] bg-[var(--as-surface)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <h2 className="text-[16px] font-semibold text-[var(--as-ink)]">
          {t("title")}
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-[var(--as-ink-soft)]">
          {t("success")}
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="as-press mt-4 text-[13px] font-semibold text-[#ff385c] hover:underline"
        >
          {t("sendAnother")}
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[var(--as-line-soft)] bg-[var(--as-surface)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <h2 className="text-[16px] font-semibold text-[var(--as-ink)]">
        {t("title")}
      </h2>
      <p className="mt-1 text-[13px] leading-relaxed text-[var(--as-ink-soft)]">
        {t("hint")}
      </p>

      <form onSubmit={(e) => void onSubmit(e)} className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold text-[var(--as-ink)]">
            {t("name")}
          </span>
          <input
            type="text"
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-[var(--as-line)] bg-[var(--as-surface)] px-3 py-2.5 text-[14px] text-[var(--as-ink)] outline-none focus:border-[var(--as-ink)]"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold text-[var(--as-ink)]">
            {t("email")}
          </span>
          <input
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-[var(--as-line)] bg-[var(--as-surface)] px-3 py-2.5 text-[14px] text-[var(--as-ink)] outline-none focus:border-[var(--as-ink)]"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold text-[var(--as-ink)]">
            {t("category")}
          </span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="w-full rounded-xl border border-[var(--as-line)] bg-[var(--as-surface)] px-3 py-2.5 text-[14px] text-[var(--as-ink)] outline-none focus:border-[var(--as-ink)]"
          >
            <option value="suggestion">{t("categorySuggestion")}</option>
            <option value="complaint">{t("categoryComplaint")}</option>
            <option value="other">{t("categoryOther")}</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold text-[var(--as-ink)]">
            {t("message")}
          </span>
          <textarea
            required
            minLength={10}
            maxLength={4000}
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("messagePlaceholder")}
            className="w-full resize-y rounded-xl border border-[var(--as-line)] bg-[var(--as-surface)] px-3 py-2.5 text-[14px] text-[var(--as-ink)] outline-none focus:border-[var(--as-ink)]"
          />
        </label>

        {/* Honeypot */}
        <label className="absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0">
          <span>Website</span>
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>

        {error ? (
          <p className="rounded-xl bg-[var(--as-hover-warm)] px-3 py-2 text-[13px] text-[var(--as-prohibited)]">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="as-press w-full rounded-xl bg-[var(--as-ink)] px-4 py-2.5 text-[14px] font-semibold text-[var(--as-ink-invert)] disabled:opacity-60 sm:w-auto"
        >
          {submitting ? t("sending") : t("submit")}
        </button>
      </form>
    </section>
  );
}
