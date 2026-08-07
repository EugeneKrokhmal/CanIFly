import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContactForm } from "@/components/content/ContactForm";
import { ContactsCountryContent } from "@/components/content/ContactsCountryContent";
import { BackToMapLink } from "@/components/layout/BackToMapLink";
import { buildPageMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return buildPageMetadata({
    locale,
    title: t("contactsTitle"),
    description: t("contactsDescription"),
    path: "/contacts",
  });
}

export default async function ContactsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="h-full overflow-y-auto bg-[var(--as-surface-muted)] text-[var(--as-ink)]">
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-8 sm:px-8 sm:py-10">
        <ContactsCountryContent />
        <ContactForm />
        <BackToMapLink namespace="contacts" />
      </div>
    </div>
  );
}
