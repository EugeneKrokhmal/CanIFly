import { getSiteUrl, absoluteUrl, jsonLdScript } from "@/lib/seo";
import type { AppLocale } from "@/i18n/routing";

const IN_LANG: Record<AppLocale, string> = {
  es: "es-ES",
  en: "en",
  pl: "pl-PL",
};

export function SiteJsonLd({
  locale,
  faqItems,
}: {
  locale: AppLocale;
  faqItems?: Array<{ question: string; answer: string }>;
}) {
  const base = getSiteUrl();
  const home = absoluteUrl(locale, "/");

  const description =
    locale === "es"
      ? "Mapa de estado del espacio aéreo UAS para pilotos de drones en España y Polonia."
      : locale === "pl"
        ? "Mapa statusu przestrzeni powietrznej UAS dla pilotów dronów w Hiszpanii i Polsce."
        : "UAS airspace status map for drone pilots in Spain and Poland.";

  const featureList =
    locale === "es"
      ? [
          "Estado Libre / Limitado / Restringido / Prohibido",
          "Zonas geográficas UAS (ENAIRE / PANSA)",
          "Filtro por clase C0–C2 y techo AGL",
          "Obstáculos y zonas de vuelo de la comunidad",
        ]
      : locale === "pl"
        ? [
            "Status Wolna / Ograniczona / Zastrzeżona / Zakazana",
            "Strefy geograficzne UAS (ENAIRE / PANSA)",
            "Filtr klasy C0–C2 i pułapu AGL",
            "Przeszkody i miejsca do lotów społeczności",
          ]
        : [
            "Clear / Limited / Restricted / Prohibited status",
            "UAS geographical zones (ENAIRE / PANSA)",
            "Filter by C0–C2 class and AGL ceiling",
            "Community obstacles and fly spots",
          ];

  const graph: Record<string, unknown>[] = [
    {
      "@type": "WebSite",
      "@id": `${base}/#website`,
      url: base,
      name: "CanIFly",
      alternateName: ["Can I Fly", "CanIFly España", "CanIFly Polska"],
      inLanguage: ["es-ES", "en", "pl-PL"],
      description,
      potentialAction: {
        "@type": "SearchAction",
        target: `${home}?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "WebApplication",
      "@id": `${base}/#app`,
      name: "CanIFly",
      url: home,
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Web",
      browserRequirements: "Requires JavaScript",
      inLanguage: IN_LANG[locale],
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "EUR",
      },
      areaServed: [
        { "@type": "Country", name: "Spain" },
        { "@type": "Country", name: "Poland" },
      ],
      featureList,
    },
    {
      "@type": "Organization",
      "@id": `${base}/#organization`,
      name: "CanIFly",
      url: base,
      logo: `${base}/icon.svg`,
      areaServed: ["ES", "PL"],
    },
  ];

  if (faqItems && faqItems.length > 0) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${absoluteUrl(locale, "/faq")}#faq`,
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    });
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={jsonLdScript({
        "@context": "https://schema.org",
        "@graph": graph,
      })}
    />
  );
}
