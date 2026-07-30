import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["es", "en", "pl"],
  defaultLocale: "es",
  localePrefix: "as-needed",
});

export type AppLocale = (typeof routing.locales)[number];
