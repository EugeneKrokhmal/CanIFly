"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

const CARD_CLASS =
  "pointer-events-auto w-full max-w-2xl rounded-2xl border border-[var(--as-line-soft)] bg-[color-mix(in_srgb,var(--as-surface)_96%,transparent)] px-4 py-3 shadow-[0_4px_24px_rgba(0,0,0,0.12)] backdrop-blur-sm";

type BannerCardProps = {
  children: ReactNode;
  role?: "dialog" | "status";
  ariaLabel?: string;
};

export function BannerCard({ children, role, ariaLabel }: BannerCardProps) {
  return (
    <div
      className={CARD_CLASS}
      role={role}
      aria-label={ariaLabel}
      aria-live={role === "dialog" ? "polite" : undefined}
    >
      {children}
    </div>
  );
}

export function BannerRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 sm:gap-4">{children}</div>
  );
}

type BannerContentProps = {
  title?: string;
  children: ReactNode;
};

export function BannerContent({ title, children }: BannerContentProps) {
  return (
    <div className="min-w-0 flex-1">
      {title ? (
        <p className="text-[14px] font-semibold text-[var(--as-ink)] sm:text-[15px]">
          {title}
        </p>
      ) : null}
      <div
        className={
          title
            ? "mt-1 text-[13px] leading-relaxed text-[var(--as-ink-soft)]"
            : "text-[13px] leading-snug text-[var(--as-ink)]"
        }
      >
        {children}
      </div>
    </div>
  );
}

export function BannerActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-[9.75rem] shrink-0 flex-col sm:w-44">{children}</div>
  );
}

export function BannerPrimaryButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`as-press w-full rounded-xl bg-[var(--as-ink)] px-3 py-2.5 text-[13px] font-semibold text-[var(--as-ink-invert)] sm:text-[14px]${className ? ` ${className}` : ""}`}
    />
  );
}

export function BannerCaptionButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`as-press mt-1.5 w-full text-center text-[11px] font-medium text-[var(--as-ink-soft)] hover:text-[var(--as-ink)] sm:text-[12px]${className ? ` ${className}` : ""}`}
    />
  );
}
