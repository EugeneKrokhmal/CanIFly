"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BrandLogo } from "@/components/BrandLogo";
import { LocationSearchPopup } from "@/components/layout/LocationSearchPopup";
import { WeatherWidget } from "@/components/layout/WeatherWidget";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth";

export function SiteHeader() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const setAuthModalOpen = useAuthStore((s) => s.setAuthModalOpen);
  const logout = useAuthStore((s) => s.logout);

  const NAV = [
    { href: "/", label: t("map") },
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

  const switchLocale = (next: "es" | "en") => {
    router.replace(pathname, { locale: next });
  };

  return (
    <header
      className="relative z-40 flex h-12 shrink-0 items-center justify-between gap-2 border-b border-[#dddddd] bg-white px-3 sm:h-16 sm:gap-3 sm:px-8"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <Link href="/" className="flex shrink-0 items-center gap-2 sm:gap-2.5">
        <BrandLogo className="h-4 w-auto text-[#222222] sm:h-5" />
        <span className="font-[family-name:var(--font-display)] text-[14px] font-bold tracking-tight text-[#222222] sm:text-[15px]">
          CanI<strong className="text-[#ff385c]">Fly</strong>
        </span>
      </Link>

      <nav className="hidden h-8 items-center gap-0.5 rounded-full border border-[#dddddd] bg-white p-0.5 shadow-[var(--as-shadow)] md:flex">
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
                color: active ? "#222222" : "#717171",
                background: active ? "#f7f7f7" : "transparent",
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
          className="as-press grid h-8 w-8 place-items-center rounded-full border border-[#dddddd] bg-white text-[#222222]"
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
                  className="as-press inline-flex h-8 max-w-[11rem] items-center gap-1.5 rounded-full border border-[#dddddd] py-0 pl-1 pr-2.5 hover:bg-[#f7f7f7]"
                  title={t("myAccount")}
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-full bg-[#f7f7f7] text-[11px] font-bold text-[#717171]">
                    {user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.avatarUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      user.name.slice(0, 1).toUpperCase()
                    )}
                  </span>
                  <span className="truncate text-[12px] font-semibold text-[#222222]">
                    {user.name}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="as-press inline-flex h-8 items-center rounded-full border border-[#dddddd] px-3 text-[12px] font-semibold text-[#222222] hover:bg-[#f7f7f7]"
                >
                  {t("logOut")}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true, "login")}
                className="as-press inline-flex h-8 items-center rounded-full border border-[#dddddd] px-3 text-[12px] font-semibold text-[#222222] hover:bg-[#f7f7f7]"
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
            className="as-press grid h-8 w-8 place-items-center rounded-full border border-[#dddddd] bg-white text-[#222222]"
            aria-expanded={menuOpen}
            aria-label={t("menu")}
          >
            <MenuIcon open={menuOpen} />
          </button>
          {menuOpen && (
            <div className="as-pop absolute right-0 top-[calc(100%+6px)] w-48 overflow-hidden rounded-xl border border-[#ebebeb] bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
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
                        color: active ? "#222222" : "#717171",
                        background: active ? "#f7f7f7" : "transparent",
                      }}
                    >
                      {item.label}
                    </Link>
                  );
                })}
                <div className="my-1 border-t border-[#ebebeb]" />
              </div>

              <div className="px-3.5 py-2">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#717171]">
                  {t("language")}
                </p>
                <div
                  className="flex items-center rounded-full border border-[#dddddd] p-0.5 text-[12px] font-bold"
                  role="group"
                  aria-label={t("language")}
                >
                  <button
                    type="button"
                    onClick={() => {
                      switchLocale("es");
                      setMenuOpen(false);
                    }}
                    className="as-press flex-1 rounded-full px-2 py-1.5"
                    style={{
                      color: locale === "es" ? "#222222" : "#717171",
                      background: locale === "es" ? "#f7f7f7" : "transparent",
                    }}
                  >
                    {t("langEs")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      switchLocale("en");
                      setMenuOpen(false);
                    }}
                    className="as-press flex-1 rounded-full px-2 py-1.5"
                    style={{
                      color: locale === "en" ? "#222222" : "#717171",
                      background: locale === "en" ? "#f7f7f7" : "transparent",
                    }}
                  >
                    {t("langEn")}
                  </button>
                </div>
              </div>

              <div className="md:hidden">
                <div className="my-1 border-t border-[#ebebeb]" />
                {user ? (
                  <>
                    <Link
                      href="/account"
                      className="block truncate px-3.5 py-2.5 text-[14px] font-semibold text-[#222222]"
                    >
                      {t("account")}
                    </Link>
                    <Link
                      href={`/pilots/${user.id}`}
                      className="block truncate px-3.5 py-2.5 text-[14px] font-semibold text-[#717171]"
                    >
                      {t("publicProfile")}
                    </Link>
                    <button
                      type="button"
                      className="block w-full px-3.5 py-2.5 text-left text-[14px] font-semibold text-[#222222]"
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
                    className="block w-full px-3.5 py-2.5 text-left text-[14px] font-semibold text-[#222222]"
                    onClick={() => {
                      setMenuOpen(false);
                      setAuthModalOpen(true, "login");
                    }}
                  >
                    {t("logIn")}
                  </button>
                )}
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
