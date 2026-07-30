"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth";
import { compressImageFile } from "@/lib/image/compress";

export default function AccountPage() {
  const t = useTranslations("account");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const setUser = useAuthStore((s) => s.setUser);
  const setAuthModalOpen = useAuthStore((s) => s.setAuthModalOpen);
  const logout = useAuthStore((s) => s.logout);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [operatorNumber, setOperatorNumber] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setAuthModalOpen(true, "login");
      return;
    }
    setName(user.name ?? "");
    setBio(user.bio ?? "");
    setOperatorNumber(user.operatorNumber ?? "");
    setAvatarPreview(user.avatarUrl);
    setAvatarFile(null);
    setRemoveAvatar(false);
  }, [user, loading, setAuthModalOpen]);

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-[14px] text-[var(--as-ink-soft)]">
        {t("loading")}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 text-center">
        <p className="text-[15px] text-[var(--as-ink-soft)]">{t("loginPrompt")}</p>
        <button
          type="button"
          onClick={() => setAuthModalOpen(true, "login")}
          className="as-press mt-4 rounded-xl bg-[var(--as-ink)] px-4 py-2.5 text-[14px] font-semibold text-[var(--as-ink-invert)]"
        >
          {t("logIn")}
        </button>
      </div>
    );
  }

  const onPickAvatar = (file: File | null) => {
    void (async () => {
      if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
      if (!file) {
        setAvatarFile(null);
        setAvatarPreview(removeAvatar ? null : user.avatarUrl);
        return;
      }
      if (!file.type.startsWith("image/")) {
        setError(t("photoTooLarge"));
        return;
      }
      if (file.size > 12 * 1024 * 1024) {
        setError(t("photoTooLarge"));
        return;
      }
      const compressed = await compressImageFile(file, {
        maxEdge: 512,
        quality: 0.85,
      });
      if (compressed.size > 5 * 1024 * 1024) {
        setError(t("photoTooLarge"));
        return;
      }
      setError(null);
      setRemoveAvatar(false);
      setAvatarFile(compressed);
      setAvatarPreview(URL.createObjectURL(compressed));
    })();
  };

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const form = new FormData();
      form.set("name", name);
      form.set("bio", bio);
      form.set("operatorNumber", operatorNumber);
      if (removeAvatar) form.set("removeAvatar", "true");
      if (avatarFile) form.set("avatar", avatarFile);

      const res = await fetch("/api/account", {
        method: "PATCH",
        credentials: "include",
        body: form,
      });
      const data = (await res.json().catch(() => null)) as
        | { user?: typeof user; error?: string }
        | null;
      if (!res.ok || !data?.user) {
        setError(data?.error ?? t("failed", { status: res.status }));
        setSaving(false);
        return;
      }
      setUser(data.user);
      setAvatarFile(null);
      setRemoveAvatar(false);
      setAvatarPreview(data.user.avatarUrl);
      setMessage(t("saved"));
    } catch {
      setError(t("networkError"));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    const ok = window.confirm(t("deleteConfirm"));
    if (!ok) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? t("failed", { status: res.status }));
        setDeleting(false);
        return;
      }
      await logout();
      router.push("/");
    } catch {
      setError(t("networkError"));
      setDeleting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-[var(--as-surface-muted)] text-[var(--as-ink)]">
      <div className="mx-auto max-w-lg px-4 py-8 sm:px-8 sm:py-10">
        <p className="text-[12px] font-semibold text-[var(--as-ink-soft)]">
          {t("eyebrow")}
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-[28px] font-bold tracking-tight sm:text-[32px]">
          {t("title")}
        </h1>
        <p className="mt-2 text-[14px] text-[var(--as-ink-soft)]">
          {user.email} ·{" "}
          <Link
            href={`/pilots/${user.id}`}
            className="font-semibold text-[#ff385c] hover:underline"
          >
            {t("publicProfile")}
          </Link>
        </p>

        <form
          onSubmit={onSave}
          className="as-rise-soft mt-8 space-y-4 rounded-2xl border border-[var(--as-line-soft)] bg-[var(--as-surface)] p-5 shadow-[var(--as-shadow)]"
        >
          <div>
            <span className="mb-2 block text-[12px] font-semibold">
              {t("profilePhoto")}
            </span>
            <div className="flex items-center gap-4">
              <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full border border-[var(--as-line)] bg-[var(--as-surface-muted)] text-[22px] font-bold text-[var(--as-ink-soft)]">
                {avatarPreview && !removeAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarPreview}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  (name || user.name || "?").slice(0, 1).toUpperCase()
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="as-press cursor-pointer rounded-full border border-[var(--as-line)] px-3 py-1.5 text-center text-[12px] font-semibold hover:bg-[var(--as-surface-muted)]">
                  {t("upload")}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => onPickAvatar(e.target.files?.[0] ?? null)}
                  />
                </label>
                {(avatarPreview || user.avatarUrl) && !removeAvatar ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (avatarPreview?.startsWith("blob:")) {
                        URL.revokeObjectURL(avatarPreview);
                      }
                      setAvatarFile(null);
                      setRemoveAvatar(true);
                      setAvatarPreview(null);
                    }}
                    className="text-[12px] font-semibold text-[#c13515]"
                  >
                    {t("remove")}
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold">
              {t("name")}
            </span>
            <input
              type="text"
              required
              minLength={2}
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-[var(--as-line)] px-3 py-2.5 text-[14px] outline-none focus:border-[var(--as-ink)]"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold">
              {t("bio")}{" "}
              <span className="font-normal text-[var(--as-ink-soft)]">{t("optional")}</span>
            </span>
            <textarea
              rows={3}
              maxLength={500}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t("bioPlaceholder")}
              className="w-full resize-none rounded-xl border border-[var(--as-line)] px-3 py-2.5 text-[14px] outline-none focus:border-[var(--as-ink)]"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold">
              {t("operatorNumber")}{" "}
              <span className="font-normal text-[var(--as-ink-soft)]">{t("optional")}</span>
            </span>
            <input
              type="text"
              maxLength={64}
              value={operatorNumber}
              onChange={(e) => setOperatorNumber(e.target.value)}
              placeholder={t("operatorPlaceholder")}
              className="w-full rounded-xl border border-[var(--as-line)] px-3 py-2.5 text-[14px] outline-none focus:border-[var(--as-ink)]"
            />
          </label>

          {error && (
            <p className="rounded-xl bg-[var(--as-hover-warm)] px-3 py-2 text-[13px] text-[var(--as-prohibited)]">
              {error}
            </p>
          )}
          {message && (
            <p className="rounded-xl bg-[var(--as-hover-green)] px-3 py-2 text-[13px] text-[var(--as-clear)]">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="as-press w-full rounded-xl bg-[var(--as-ink)] px-4 py-2.5 text-[14px] font-semibold text-[var(--as-ink-invert)] disabled:opacity-60"
          >
            {saving ? t("saving") : t("saveChanges")}
          </button>
        </form>

        <section className="mt-8 rounded-2xl border border-[#ffd7d7] bg-[var(--as-surface)] p-5">
          <h2 className="text-[14px] font-semibold text-[#c13515]">
            {t("dangerZone")}
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--as-ink-soft)]">
            {t("dangerBlurb")}
          </p>
          <button
            type="button"
            disabled={deleting}
            onClick={() => void onDelete()}
            className="as-press mt-4 rounded-xl border border-[#c13515] px-4 py-2.5 text-[14px] font-semibold text-[#c13515] hover:bg-[var(--as-hover-warm)] disabled:opacity-60"
          >
            {deleting ? t("deleting") : t("deleteAccount")}
          </button>
        </section>
      </div>
    </div>
  );
}
