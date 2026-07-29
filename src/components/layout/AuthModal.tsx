"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/stores/auth";

export function AuthModal() {
  const t = useTranslations("auth");
  const open = useAuthStore((s) => s.authModalOpen);
  const mode = useAuthStore((s) => s.authModalMode);
  const setAuthModalOpen = useAuthStore((s) => s.setAuthModalOpen);
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const resendVerification = useAuthStore((s) => s.resendVerification);
  const pendingVerifyEmail = useAuthStore((s) => s.pendingVerifyEmail);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [operatorNumber, setOperatorNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const tOut = window.setTimeout(() => setMounted(false), 220);
    return () => window.clearTimeout(tOut);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setPassword("");
    setName("");
    setOperatorNumber("");
    setError(null);
    setInfo(null);
    setSubmitting(false);
    setResending(false);
  }, [open, mode]);

  if (!mounted) return null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    const result =
      mode === "register"
        ? await register({
            email,
            password,
            name,
            operatorNumber: operatorNumber.trim() || undefined,
          })
        : await login(email, password);
    setSubmitting(false);
    if (result.needsVerification) {
      setInfo(t("checkEmail", { email: email.toLowerCase() }));
      return;
    }
    if (result.error) setError(result.error);
  };

  const onResend = async () => {
    const target = pendingVerifyEmail || email;
    if (!target) return;
    setResending(true);
    setError(null);
    const err = await resendVerification(target);
    setResending(false);
    if (err) setError(err);
    else setInfo(t("resent", { email: target }));
  };

  const close = () => setAuthModalOpen(false);
  const showVerifyPrompt = Boolean(pendingVerifyEmail) || Boolean(info);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center"
      onClick={close}
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-black/40"
        style={{
          opacity: visible ? 1 : 0,
          transition: "opacity 200ms var(--as-ease-out)",
        }}
      />
      <div
        className="as-gpu relative max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-2xl border border-[var(--as-line-soft)] bg-[var(--as-surface)] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.18)]"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible
            ? "translate3d(0,0,0) scale(1)"
            : "translate3d(0,12px,0) scale(0.97)",
          transition:
            "opacity 220ms var(--as-ease-out), transform 220ms var(--as-ease-out)",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="auth-modal-title"
            className="font-[family-name:var(--font-display)] text-[18px] font-bold text-[var(--as-ink)]"
          >
            {mode === "register" ? t("createAccount") : t("logIn")}
          </h2>
          <button
            type="button"
            onClick={close}
            className="as-press grid h-8 w-8 place-items-center rounded-full text-[var(--as-ink-soft)] hover:bg-[var(--as-surface-muted)]"
            aria-label={t("close")}
          >
            ×
          </button>
        </div>

        <p className="mb-4 text-[13px] leading-relaxed text-[var(--as-ink-soft)]">
          {mode === "register" ? t("registerBlurb") : t("loginBlurb")}
        </p>

        {showVerifyPrompt ? (
          <div className="mb-4 space-y-3 rounded-xl border border-[var(--as-line-soft)] bg-[var(--as-surface-muted)] p-3">
            <p className="text-[13px] leading-relaxed text-[var(--as-ink)]">
              {info ??
                t("checkEmail", {
                  email: pendingVerifyEmail ?? email.toLowerCase(),
                })}
            </p>
            <button
              type="button"
              disabled={resending}
              onClick={() => void onResend()}
              className="as-press w-full rounded-xl border border-[var(--as-line)] px-4 py-2.5 text-[13px] font-semibold text-[var(--as-ink)] disabled:opacity-60"
            >
              {resending ? t("pleaseWait") : t("resendVerification")}
            </button>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "register" && (
            <>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold text-[var(--as-ink)]">
                  {t("name")}
                </span>
                <input
                  type="text"
                  autoComplete="name"
                  required
                  minLength={2}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("namePlaceholder")}
                  className="w-full rounded-xl border border-[var(--as-line)] px-3 py-2.5 text-[14px] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--as-ink)] focus:shadow-[0_0_0_3px_rgba(34,34,34,0.08)]"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold text-[var(--as-ink)]">
                  {t("operatorNumber")}{" "}
                  <span className="font-normal text-[var(--as-ink-soft)]">
                    {t("optional")}
                  </span>
                </span>
                <input
                  type="text"
                  value={operatorNumber}
                  onChange={(e) => setOperatorNumber(e.target.value)}
                  placeholder={t("operatorPlaceholder")}
                  className="w-full rounded-xl border border-[var(--as-line)] px-3 py-2.5 text-[14px] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--as-ink)] focus:shadow-[0_0_0_3px_rgba(34,34,34,0.08)]"
                />
              </label>
            </>
          )}

          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold text-[var(--as-ink)]">
              {t("email")}
            </span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[var(--as-line)] px-3 py-2.5 text-[14px] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--as-ink)] focus:shadow-[0_0_0_3px_rgba(34,34,34,0.08)]"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold text-[var(--as-ink)]">
              {t("password")}
            </span>
            <input
              type="password"
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[var(--as-line)] px-3 py-2.5 text-[14px] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--as-ink)] focus:shadow-[0_0_0_3px_rgba(34,34,34,0.08)]"
            />
            <span className="mt-1 block text-[11px] text-[var(--as-ink-soft)]">
              {t("passwordHint")}
            </span>
          </label>

          {error && (
            <p className="as-rise-soft rounded-xl bg-[var(--as-hover-warm)] px-3 py-2 text-[13px] text-[var(--as-prohibited)]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="as-press w-full rounded-xl bg-[var(--as-ink)] px-4 py-2.5 text-[14px] font-semibold text-[var(--as-ink-invert)] disabled:opacity-60"
          >
            {submitting
              ? t("pleaseWait")
              : mode === "register"
                ? t("register")
                : t("logIn")}
          </button>
        </form>

        <p className="mt-4 text-center text-[13px] text-[var(--as-ink-soft)]">
          {mode === "register" ? (
            <>
              {t("haveAccount")}{" "}
              <button
                type="button"
                className="font-semibold text-[#ff385c] hover:underline"
                onClick={() => setAuthModalOpen(true, "login")}
              >
                {t("logIn")}
              </button>
            </>
          ) : (
            <>
              {t("newHere")}{" "}
              <button
                type="button"
                className="font-semibold text-[#ff385c] hover:underline"
                onClick={() => setAuthModalOpen(true, "register")}
              >
                {t("register")}
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
