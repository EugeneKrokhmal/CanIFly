import { Figtree, Plus_Jakarta_Sans } from "next/font/google";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/layout/AppShell";
import { SiteJsonLd } from "@/components/seo/SiteJsonLd";
import { routing, type AppLocale } from "@/i18n/routing";
import { resolveLiveCountryFromIpHeaders } from "@/lib/geo/ip-country";
import { buildPageMetadata } from "@/lib/seo";
import { THEME_BOOT_SCRIPT } from "@/lib/theme-boot";
import "../globals.css";

const display = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const ui = Figtree({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Omit<Props, "children">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return buildPageMetadata({
    locale,
    title: t("title"),
    description: t("description"),
    path: "/",
  });
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover" as const,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#121212" },
  ],
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const appLocale = locale as AppLocale;
  const ipCountry = resolveLiveCountryFromIpHeaders(await headers());

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }}
        />
      </head>
      <body className={`${display.variable} ${ui.variable} antialiased`}>
        <SiteJsonLd locale={appLocale} />
        <NextIntlClientProvider messages={messages}>
          <AppShell ipCountry={ipCountry}>{children}</AppShell>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
