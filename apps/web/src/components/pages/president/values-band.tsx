import { GlassTile, SectionHeading, Surface } from "@uaeaf/brand-ui";
import { CONTAINER } from "@/components/ui/section";
import type { AppLocale } from "@/i18n/routing";
import type { PresidentMessagePublic } from "@/lib/api/types";
import { ValueIcon } from "@/lib/icons/value-icons";

/**
 * The values band, on the President's Message and on Vision & Mission.
 *
 * - A full-bleed brand-green surface. The values are the federation speaking
 *   about itself, and green is the identity colour an institutional page is
 *   allowed to spend a whole band on (ADR-0098 D1 R3).
 * - Each value is a `GlassTile`, not a pastel `ItemCard`: the item palette is a
 *   position code for a closed set, and on this ground it would put a second,
 *   off-identity palette inside the green (owner flag, ADR-0098 D7 recipe).
 *   The tile reads the surface's translucent fill and edge, so it stays one
 *   object on the green without punching an opaque white hole in it.
 * - The heading is the kit's `SectionHeading`; on green its tricolour rule
 *   collapses to white by the surface's own override.
 * - The grid collapses as before: five across from `xl` (three for a count
 *   divisible by three, never five and one), two from `md` with an odd last
 *   tile taking the whole row, one on a phone.
 */

export const ValuesBand = ({
  record,
  locale,
  field,
}: {
  /** Also the federation's values on Vision & Mission (ADR-0070), passed in
   *  this shape. */
  record: Pick<PresidentMessagePublic, "values" | "valuesTitle">;
  locale: AppLocale;
  /** The stored field the list prints, for a page whose text is compared
   *  against the stored record in a browser: marks the list and each tile's
   *  title and description. */
  field?: string;
}) => {
  const values = [...record.values].sort((a, b) => a.displayOrder - b.displayOrder);
  if (values.length === 0) return null;

  const title = record.valuesTitle?.[locale];
  const odd = values.length % 2 === 1;
  const wide = values.length % 3 === 0 && values.length % 5 !== 0 ? "xl:grid-cols-3" : "xl:grid-cols-5";
  const part = (name: "title" | "description") => (field ? name : undefined);

  return (
    <Surface kind="brand-green">
      <div className={`${CONTAINER} py-12 md:py-16 lg:py-24`}>
        {title ? <SectionHeading title={title} /> : null}

        <ul data-field={field} className={`grid gap-4 md:grid-cols-2 md:gap-6 ${wide}`}>
          {values.map((value, index) => (
            <li
              key={`${value.displayOrder}-${value.iconKey}`}
              className={odd && index === values.length - 1 ? "md:max-xl:col-span-2" : undefined}
            >
              <GlassTile
                className="h-full"
                icon={value.iconKey ? <ValueIcon iconKey={value.iconKey} className="size-6" /> : undefined}
                title={<span data-part={part("title")}>{value.title[locale]}</span>}
                description={<span data-part={part("description")}>{value.description[locale]}</span>}
              />
            </li>
          ))}
        </ul>
      </div>
    </Surface>
  );
};
