"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { BrandLogo } from "@/components/BrandLogo";
import { LocationSearchPopup } from "@/components/layout/LocationSearchPopup";
import { WeatherAlertTicker } from "@/components/layout/WeatherAlertTicker";
import { WeatherWidget } from "@/components/layout/WeatherWidget";
import { Link, usePathname } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth";

export function SiteHeader() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const setAuthModalOpen = useAuthStore((s) => s.setAuthModalOpen);
  const logout = useAuthStore((s) => s.logout);

  const NAV = [
    { href: "/", label: t("map") },
    { href: "/guide", label: t("guide") },
    { href: "/faq", label: t("faq") },
    { href: "/contacts", label: t("contacts") },
    { href: "/privacy", label: t("privacy") },
  ] as const;

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  return (
    <div
      className="relative z-40 shrink-0 bg-[var(--as-surface)]"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      {/* z-50 keeps the menu dropdown above the weather ticker */}
      <header className="relative z-50 flex h-12 items-center justify-between gap-2 border-b border-[var(--as-line)] bg-[var(--as-surface)] px-3 sm:h-16 sm:gap-3 sm:px-8">
      <Link href="/" className="flex shrink-0 items-center">
        <BrandLogo className="h-4 w-auto text-[var(--as-ink)] sm:h-5" />
        <span className="font-[family-name:var(--font-display)] text-[18px] font-bold tracking-tight text-[var(--as-ink)] sm:text-[22px]">
          CanI<strong className="text-[#ff385c]">fly</strong>
        </span>
      </Link>

      <nav className="hidden h-8 items-center gap-0.5 rounded-full border border-[var(--as-line)] bg-[var(--as-surface)] p-0.5 shadow-[var(--as-shadow)] md:flex">
        {NAV.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="as-press-soft inline-flex h-full items-center rounded-full px-3.5 text-[12px] font-semibold"
              style={{
                color: active ? "var(--as-ink)" : "var(--as-ink-soft)",
                background: active ? "var(--as-hover)" : "transparent",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => {
            setMenuOpen(false);
            setSearchOpen(true);
          }}
          className="as-press grid h-8 w-8 place-items-center rounded-full border border-[var(--as-line)] bg-[var(--as-surface)] text-[var(--as-ink)]"
          aria-label={t("search")}
        >
          <SearchIcon />
        </button>

        <WeatherWidget />

        {!loading && (
          <div className="hidden items-center gap-1.5 sm:flex">
            {user ? (
              <>
                <Link
                  href="/account"
                  className="as-press inline-flex h-8 max-w-[11rem] items-center gap-1.5 rounded-full border border-[var(--as-line)] py-0 pl-1 pr-2.5 hover:bg-[var(--as-hover)]"
                  title={t("myAccount")}
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--as-surface-muted)] text-[11px] font-bold text-[var(--as-ink-soft)]">
                    {user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.avatarUrl}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      user.name.slice(0, 1).toUpperCase()
                    )}
                  </span>
                  <span className="truncate text-[12px] font-semibold text-[var(--as-ink)]">
                    {user.name}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="as-press inline-flex h-8 items-center rounded-full border border-[var(--as-line)] px-3 text-[12px] font-semibold text-[var(--as-ink)] hover:bg-[var(--as-hover)]"
                >
                  {t("logOut")}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true, "login")}
                className="as-press inline-flex h-8 items-center rounded-full border border-[var(--as-line)] px-3 text-[12px] font-semibold text-[var(--as-ink)] hover:bg-[var(--as-hover)]"
              >
                {t("logIn")}
              </button>
            )}
          </div>
        )}

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="as-press grid h-8 w-8 place-items-center rounded-full border border-[var(--as-line)] bg-[var(--as-surface)] text-[var(--as-ink)]"
            aria-expanded={menuOpen}
            aria-label={t("menu")}
          >
            <MenuIcon open={menuOpen} />
          </button>
          {menuOpen && (
            <div className="as-pop absolute right-0 top-[calc(100%+6px)] z-50 w-48 overflow-hidden rounded-xl border border-[var(--as-line-soft)] bg-[var(--as-surface)] py-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
              <div className="md:hidden">
                {NAV.map((item) => {
                  const active =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block px-3.5 py-2.5 text-[14px] font-semibold transition-colors duration-150"
                      style={{
                        color: active ? "var(--as-ink)" : "var(--as-ink-soft)",
                        background: active ? "var(--as-hover)" : "transparent",
                      }}
                    >
                      {item.label}
                    </Link>
                  );
                })}
                <div className="my-1 border-t border-[var(--as-line-soft)]" />
              </div>

              <Link
                href="/settings"
                className="block px-3.5 py-2.5 text-[14px] font-semibold text-[var(--as-ink)] hover:bg-[var(--as-hover)]"
              >
                {t("settings")}
              </Link>

              <div className="md:hidden">
                {user ? (
                  <>
                    <Link
                      href="/account"
                      className="block truncate px-3.5 py-2.5 text-[14px] font-semibold text-[var(--as-ink)]"
                    >
                      {t("account")}
                    </Link>
                    <Link
                      href={`/pilots/${user.id}`}
                      className="block truncate px-3.5 py-2.5 text-[14px] font-semibold text-[var(--as-ink-soft)]"
                    >
                      {t("publicProfile")}
                    </Link>
                    <button
                      type="button"
                      className="block w-full px-3.5 py-2.5 text-left text-[14px] font-semibold text-[var(--as-ink)]"
                      onClick={() => {
                        setMenuOpen(false);
                        void logout();
                      }}
                    >
                      {t("logOut")}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="block w-full px-3.5 py-2.5 text-left text-[14px] font-semibold text-[var(--as-ink)]"
                    onClick={() => {
                      setMenuOpen(false);
                      setAuthModalOpen(true, "login");
                    }}
                  >
                    {t("logIn")}
                  </button>
                )}
              </div>

              <div className="hidden md:block">
                {user ? (
                  <Link
                    href={`/pilots/${user.id}`}
                    className="block truncate px-3.5 py-2.5 text-[14px] font-semibold text-[var(--as-ink-soft)]"
                  >
                    {t("publicProfile")}
                  </Link>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>

      <LocationSearchPopup
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
      </header>
      <WeatherAlertTicker />
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle
        cx="11"
        cy="11"
        r="6.5"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M16.5 16.5L21 21"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      {open ? (
        <path
          d="M4 4l8 8M12 4L4 12"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M3 5h10M3 8h10M3 11h10"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
