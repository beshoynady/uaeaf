import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { BrandKitStage } from "@/components/brand-kit/brand-kit-stage";
import { Specimens } from "@/components/brand-kit/specimens";
import type { AppLocale } from "@/i18n/routing";

import "./brand-kit.css";

/**
 * The Brand UI Kit's reference page (ADR-0098 D7).
 *
 * Every component in `@uaeaf/brand-ui`, on all five surfaces, in three themes
 * and both directions. This is the verification instrument for the whole
 * library: a component that needs a prop to know its background cannot be
 * rendered here without that showing up immediately.
 *
 * **Not a public page.** It calls `notFound()` outside development, exports
 * `noindex`, is linked from nothing, and is deliberately absent from
 * `PUBLIC_PAGES` — which is what keeps it out of the sitemap, since the sitemap
 * is generated from that registry. `seo-contract.spec.ts` exempts this one
 * route by name, in the same list and for the same reason as the catch-all.
 *
 * A plain `metadata` export rather than `generateMetadata`: the shared metadata
 * builder emits canonical and hreflang tags, which a page that must never be
 * indexed should not have.
 */
export const metadata: Metadata = {
  title: "Brand UI Kit — internal reference",
  robots: { index: false, follow: false },
};

const BrandKitPage = async ({ params }: { params: Promise<{ locale: AppLocale }> }) => {
  // Production must not serve this at all. Checked at request time rather than
  // at module load: a build-time constant would bake the development answer
  // into a production bundle if the page were ever statically rendered.
  if (process.env.NODE_ENV === "production") notFound();

  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="brand-kit">
      <BrandKitStage>
        <Specimens />
      </BrandKitStage>
    </div>
  );
};

export default BrandKitPage;
