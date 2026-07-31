"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuthStore, type AppLocale } from "@/stores/auth";

export function AuthModal() {
  const t = useTranslations("auth");
  const locale = useLocale() as AppLocale;
  const open = useAuthStore((s) => s.authModalOpen);
  const mode = useAuthStore((s) => s.authModalMode);
  const authNotice = useAuthStore((s) => s.authNotice);
  const setAuthModalOpen = useAuthStore((s) => s.setAuthModalOpen);
  const setAuthNotice = useAuthStore((s) => s.setAuthNotice);
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const resendVerification = useAuthStore((s) => s.resendVerification);
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);
  const pendingVerifyEmail = useAuthStore((s) => s.pendingVerifyEmail);
  const googleOAuthEnabled = useAuthStore((s) => s.googleOAuthEnabled);
  const fetchGoogleOAuthEnabled = useAuthStore((s) => s.fetchGoogleOAuthEnabled);

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
    if (open && googleOAuthEnabled === null) {
      void fetchGoogleOAuthEnabled();
    }
  }, [open, googleOAuthEnabled, fetchGoogleOAuthEnabled]);

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
    setAuthNotice(null);
    setSubmitting(false);
    setResending(false);
  }, [open, mode]);

  if (!mounted) return null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    if (mode === "forgot") {
      const err = await requestPasswordReset(email);
      setSubmitting(false);
      if (err) {
        setError(err);
        return;
      }
      setInfo(t("resetEmailSent", { email: email.toLowerCase() }));
      return;
    }
    const result =
      mode === "register"
        ? await register({
            email,
            password,
            name,
            operatorNumber: operatorNumber.trim() || undefined,
            locale,
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
  const showVerifyPrompt =
    mode !== "forgot" && (Boolean(pendingVerifyEmail) || Boolean(info));
  const showForgotSuccess = mode === "forgot" && Boolean(info);
  const modalTitle =
    mode === "register"
      ? t("createAccount")
      : mode === "forgot"
        ? t("forgotPassword")
        : t("logIn");
  const modalBlurb =
    mode === "register"
      ? t("registerBlurb")
      : mode === "forgot"
        ? t("forgotBlurb")
        : t("loginBlurb");
  const googleHref = `/api/auth/google?locale=${encodeURIComponent(locale)}&returnTo=${encodeURIComponent(`/${locale}`)}`;
  const showGoogleBlock = mode !== "forgot" && !showVerifyPrompt;
  const showGoogle = showGoogleBlock && googleOAuthEnabled === true;
  const showGoogleSkeleton = showGoogleBlock && googleOAuthEnabled === null;

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
            {modalTitle}
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
          {modalBlurb}
        </p>

        {showForgotSuccess ? (
          <div className="mb-4 space-y-3 rounded-xl border border-[var(--as-line-soft)] bg-[var(--as-surface-muted)] p-3">
            <p className="text-[13px] leading-relaxed text-[var(--as-ink)]">
              {info}
            </p>
            <button
              type="button"
              onClick={() => setAuthModalOpen(true, "login")}
              className="as-press w-full rounded-xl border border-[var(--as-line)] px-4 py-2.5 text-[13px] font-semibold text-[var(--as-ink)]"
            >
              {t("backToLogin")}
            </button>
          </div>
        ) : null}

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

        {!showForgotSuccess ? (
        <>
        {showGoogleSkeleton ? (
          <>
            <div
              className="mb-4 h-[46px] w-full animate-pulse rounded-xl border border-[var(--as-line)] bg-[var(--as-surface-muted)]"
              aria-hidden
            />
            <div className="mb-4 flex items-center gap-3" aria-hidden>
              <div className="h-px flex-1 bg-[var(--as-line)]" />
              <span className="text-[12px] font-medium text-[var(--as-ink-soft)]">
                {t("orContinueWith")}
              </span>
              <div className="h-px flex-1 bg-[var(--as-line)]" />
            </div>
          </>
        ) : null}
        {showGoogle ? (
          <>
            <a
              href={googleHref}
              className="as-press mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--as-line)] bg-[var(--as-surface)] px-4 py-2.5 text-[14px] font-semibold text-[var(--as-ink)] hover:bg-[var(--as-surface-muted)]"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {t("continueWithGoogle")}
            </a>
            <div className="mb-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--as-line)]" />
              <span className="text-[12px] font-medium text-[var(--as-ink-soft)]">
                {t("orContinueWith")}
              </span>
              <div className="h-px flex-1 bg-[var(--as-line)]" />
            </div>
          </>
        ) : null}
        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "register" && (
            <>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold text-[var(--as-ink)]">
                  {t("name")}{" "}
                  <span className="font-bold text-[var(--as-rausch)]">*</span>
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
              {t("email")}{" "}
              <span className="font-bold text-[var(--as-rausch)]">*</span>
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
          {mode !== "forgot" ? (
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold text-[var(--as-ink)]">
              {t("password")}{" "}
              <span className="font-bold text-[var(--as-rausch)]">*</span>
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
          ) : null}

          {mode === "login" ? (
            <p className="text-right">
              <button
                type="button"
                className="text-[12px] font-semibold text-[#ff385c] hover:underline"
                onClick={() => setAuthModalOpen(true, "forgot")}
              >
                {t("forgotPassword")}
              </button>
            </p>
          ) : null}

          {error && (
            <p className="as-rise-soft rounded-xl bg-[var(--as-hover-warm)] px-3 py-2 text-[13px] text-[var(--as-prohibited)]">
              {error}
            </p>
          )}

          {authNotice && !error && (
            <p className="as-rise-soft rounded-xl bg-[var(--as-hover-warm)] px-3 py-2 text-[13px] text-[var(--as-prohibited)]">
              {authNotice === "google" ? t("googleSignInFailed") : authNotice}
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
                : mode === "forgot"
                  ? t("sendResetLink")
                  : t("logIn")}
          </button>
        </form>
        </>
        ) : null}

        {!showForgotSuccess ? (
        <p className="mt-4 text-center text-[13px] text-[var(--as-ink-soft)]">
          {mode === "forgot" ? (
            <>
              {t("rememberPassword")}{" "}
              <button
                type="button"
                className="font-semibold text-[#ff385c] hover:underline"
                onClick={() => setAuthModalOpen(true, "login")}
              >
                {t("logIn")}
              </button>
            </>
          ) : mode === "register" ? (
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
        ) : null}
      </div>
    </div>
  );
}
