import SiteNav from "@/components/SiteNav";
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/site";

const marketingJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}${DEFAULT_OG_IMAGE}`,
    },
    {
      "@type": "WebSite",
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      description:
        "Gamified fantasy walking RPG and fitness app—track activity, earn XP, and level your hero.",
      publisher: { "@type": "Organization", name: SITE_NAME },
    },
  ],
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(marketingJsonLd) }}
      />
      <SiteNav />
      {children}
    </>
  );
}
