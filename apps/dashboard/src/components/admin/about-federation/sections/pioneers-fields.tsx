"use client";

import { useTranslations } from "next-intl";
import { BilingualField } from "@/components/admin/bilingual-field";
import { SwitchField } from "@/components/ui/switch-field";
import { AboutListField } from "../about-list-field";
import { MediaField } from "../media-field";
import { SectionHeadings } from "./section-headings";
import { emptyText, type SectionFieldsProps } from "./section-fields";

/**
 * The founding figures: the section's two headings, and the people under
 * them — a name, the short line above it, a few sentences, and a portrait.
 *
 * No standfirst. The approved composition draws the heading straight onto the
 * cards, so there is nothing to write under it.
 *
 * ── One of them is drawn wide ─────────────────────────────────────────────
 *
 * The approved page gives one person the wide card and the others the narrow
 * one. Two wide cards is not a layout the page has, so the API refuses a list
 * with more than one featured person. The screen keeps to the same rule while
 * the editor works rather than at the save: switching one person on switches
 * the others off, and the switch says so before it is pressed.
 */
export const PioneersFields = ({
  value,
  patch,
  disabled,
  images,
  canReadMedia,
  locale,
  onUploaded,
}: SectionFieldsProps<"pioneers">) => {
  const t = useTranslations("AboutFederation");

  // The whole list is patched, not the one row. The rule belongs to the list —
  // at most one featured person, and the API refuses a second — so switching
  // one on has to switch every other one off in the same change. Done through
  // the row's own patch, the previous one would stay on beside it: the editor
  // would see two featured people and only learn at the save that the page
  // cannot hold them. Switching one off touches nothing else, so no person is
  // ever featured that the editor did not choose.
  const setFeatured = (index: number, featured: boolean) =>
    patch({
      items: value.items.map((item, position) =>
        position === index ? { ...item, featured } : featured ? { ...item, featured: false } : item,
      ),
    });

  return (
    <>
      <SectionHeadings
        idPrefix="about-pioneers"
        value={value}
        patch={patch}
        disabled={disabled}
        withDescription={false}
      />

      <AboutListField
        id="about-pioneers-items"
        items={value.items}
        onChange={(items) => patch({ items })}
        disabled={disabled}
        labels={{
          addItem: t("pioneers.add"),
          removeItem: t("pioneers.remove"),
          removeTitle: t("pioneers.removeTitle"),
          removeBody: t("pioneers.removeBody"),
        }}
        summaryOf={(item) => ({
          // A person has no date or figure to lead the row with; the name is
          // the whole of what tells two rows apart.
          lead: "",
          title: item.name.ar || item.name.en || t("pioneers.untitled"),
          mark: item.featured ? <FeaturedMark label={t("pioneers.featured")} /> : undefined,
        })}
        stateOf={(item) => (item.isVisible === false ? "hidden" : "visible")}
        makeItem={() => ({
          name: emptyText(),
          badge: emptyText(),
          description: emptyText(),
          imageId: null,
          // Never featured on arrival: which person the page draws wide is
          // the editor's choice, and a new row taking it would quietly move
          // the wide card off someone else.
          featured: false,
          isVisible: true,
        })}
      >
        {(item, patchItem, index) => {
          const id = `about-pioneers-${index}`;

          return (
            <>
              <BilingualField
                id={`${id}-name`}
                labelAr={t("pioneers.name")}
                labelEn={t("pioneers.name")}
                valueAr={item.name.ar}
                valueEn={item.name.en}
                onChangeAr={(ar) => patchItem({ name: { ...item.name, ar } })}
                onChangeEn={(en) => patchItem({ name: { ...item.name, en } })}
                disabled={disabled}
                required
              />

              <BilingualField
                id={`${id}-badge`}
                labelAr={t("pioneers.badge")}
                labelEn={t("pioneers.badge")}
                valueAr={item.badge.ar}
                valueEn={item.badge.en}
                onChangeAr={(ar) => patchItem({ badge: { ...item.badge, ar } })}
                onChangeEn={(en) => patchItem({ badge: { ...item.badge, en } })}
                disabled={disabled}
                required
                hint={t("pioneers.badgeHint")}
              />

              <BilingualField
                id={`${id}-description`}
                labelAr={t("pioneers.description")}
                labelEn={t("pioneers.description")}
                valueAr={item.description.ar}
                valueEn={item.description.en}
                onChangeAr={(ar) => patchItem({ description: { ...item.description, ar } })}
                onChangeEn={(en) => patchItem({ description: { ...item.description, en } })}
                disabled={disabled}
                required
                multiline
              />

              <MediaField
                id={`${id}-image`}
                label={t("pioneers.image")}
                value={item.imageId ?? null}
                images={images}
                canReadMedia={canReadMedia}
                disabled={disabled}
                locale={locale}
                onChange={(imageId) => patchItem({ imageId })}
                onUploaded={onUploaded}
                minSourcePx={800}
              />

              <div className="flex flex-wrap gap-6">
                <SwitchField
                  id={`${id}-featured`}
                  label={t("pioneers.featuredSwitch")}
                  hint={t("pioneers.featuredHint")}
                  checked={item.featured === true}
                  disabled={disabled}
                  onChange={(featured) => setFeatured(index, featured)}
                />
                <SwitchField
                  id={`${id}-hidden`}
                  label={t("pioneers.hideSwitch")}
                  checked={item.isVisible === false}
                  disabled={disabled}
                  onChange={(hide) => patchItem({ isVisible: !hide })}
                />
              </div>
            </>
          );
        }}
      </AboutListField>
    </>
  );
};

const FeaturedMark = ({ label }: { label: string }) => (
  <span className="inline-flex shrink-0 rounded-full bg-[color:var(--color-text-primary)] px-2 py-0.5 text-caption font-bold text-[color:var(--color-surface-raised)]">
    {label}
  </span>
);
