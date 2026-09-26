"use client";

import { useTranslations } from "next-intl";
import { BilingualField } from "@/components/admin/bilingual-field";
import { SelectField } from "@/components/ui/select-field";
import { SwitchField } from "@/components/ui/switch-field";
import { TextField } from "@/components/auth/text-field";
import type { AboutDraft } from "@/lib/admin/about-readiness";
import { AboutListField } from "../about-list-field";
import { SectionHeadings } from "./section-headings";
import { emptyText, type SectionFieldsProps } from "./section-fields";

/** The three colours a card can be tinted with, in the order the approved row
 *  draws them. The fact cards' fourth, `tri`, is not offered here. */
const CARD_TONES = ["green", "black", "red"] as const;
type CardTone = (typeof CARD_TONES)[number];

/** The approved composition stands the cards in a single row of three. The
 *  screen's copy of that number; the API has its own and refuses a fourth. */
const MAX_CARDS = 3;

/** Where the link may point: a path inside this site, or an `https://`
 *  address. The screen's copy of the API's allowlist, matched against the
 *  value exactly as typed because the API does not trim it either. A
 *  protocol-relative `//host` starts with a slash and is still refused. */
const SAFE_HREF = /^(?:\/(?!\/)[^\s]*|https:\/\/[^\s]+)$/;

/**
 * The governance statement: its three headings, the cards beside it, and the
 * link under it to the regulations page.
 *
 * ── Three is a ceiling, and hidden cards count toward it ──────────────────
 *
 * The row has three places, and the API counts the whole list, hidden cards
 * included. The editor is told so beside the list rather than discovering it
 * as a refused save.
 *
 * ── The link's address is checked as it is typed ──────────────────────────
 *
 * The hint states the rule before anything is typed; the error names a
 * breach as soon as there is one. An editor who pastes an `http://` address
 * finds out here, beside the field, rather than from a save that fails with
 * the whole section's work still unsaved. An empty field is not flagged: it
 * is a field nobody has reached yet, and it is marked required already.
 */
export const GovernanceFields = ({ value, patch, disabled }: SectionFieldsProps<"governance">) => {
  const t = useTranslations("AboutFederation");
  const { link } = value;
  const patchLink = (change: Partial<AboutDraft["governance"]["link"]>) => patch({ link: { ...link, ...change } });
  const hrefRefused = link.href !== "" && !SAFE_HREF.test(link.href);

  return (
    <>
      <SectionHeadings
        idPrefix="about-governance"
        value={value}
        patch={patch}
        disabled={disabled}
        withDescription
      />

      <AboutListField
        id="about-governance-cards"
        items={value.cards}
        onChange={(cards) => patch({ cards })}
        maxItems={MAX_CARDS}
        disabled={disabled}
        labels={{
          addItem: t("governance.add"),
          removeItem: t("governance.remove"),
          removeTitle: t("governance.removeTitle"),
          removeBody: t("governance.removeBody"),
          limitReached: t("governance.limit", { max: MAX_CARDS }),
        }}
        summaryOf={(card) => ({
          lead: "",
          title: card.title.ar || card.title.en || t("governance.untitled"),
        })}
        stateOf={(card) => (card.isVisible === false ? "hidden" : "visible")}
        makeItem={() => ({
          title: emptyText(),
          text: emptyText(),
          // The first colour no card is wearing yet, so cards added one after
          // another come out as the approved row draws them rather than as
          // three green ones.
          tone: CARD_TONES.find((tone) => !value.cards.some((card) => card.tone === tone)) ?? CARD_TONES[0],
          isVisible: true,
        })}
      >
        {(card, patchCard, index) => {
          const id = `about-governance-${index}`;

          return (
            <>
              <BilingualField
                id={`${id}-title`}
                labelAr={t("governance.cardTitle")}
                labelEn={t("governance.cardTitle")}
                valueAr={card.title.ar}
                valueEn={card.title.en}
                onChangeAr={(ar) => patchCard({ title: { ...card.title, ar } })}
                onChangeEn={(en) => patchCard({ title: { ...card.title, en } })}
                disabled={disabled}
                required
              />

              <BilingualField
                id={`${id}-text`}
                labelAr={t("governance.cardText")}
                labelEn={t("governance.cardText")}
                valueAr={card.text.ar}
                valueEn={card.text.en}
                onChangeAr={(ar) => patchCard({ text: { ...card.text, ar } })}
                onChangeEn={(en) => patchCard({ text: { ...card.text, en } })}
                disabled={disabled}
                required
                multiline
              />

              <SelectField
                id={`${id}-tone`}
                label={t("governance.tone")}
                hint={t("governance.toneHint")}
                value={card.tone}
                disabled={disabled}
                options={CARD_TONES.map((tone) => ({ value: tone, label: t(`governance.tones.${tone}`) }))}
                onChange={(event) => patchCard({ tone: event.target.value as CardTone })}
              />

              <SwitchField
                id={`${id}-hidden`}
                label={t("governance.hideSwitch")}
                checked={card.isVisible === false}
                disabled={disabled}
                onChange={(hide) => patchCard({ isVisible: !hide })}
              />
            </>
          );
        }}
      </AboutListField>

      {/* Mounted empty so that reaching the ceiling is announced, not only
          drawn: the region has to exist before its text changes. `sr-only`
          while empty keeps it out of the section's spacing. */}

      <fieldset className="flex flex-col gap-4">
        <legend className="text-label font-bold">{t("governance.link")}</legend>

        <BilingualField
          id="about-governance-link-label"
          labelAr={t("governance.linkLabel")}
          labelEn={t("governance.linkLabel")}
          valueAr={link.label.ar}
          valueEn={link.label.en}
          onChangeAr={(ar) => patchLink({ label: { ...link.label, ar } })}
          onChangeEn={(en) => patchLink({ label: { ...link.label, en } })}
          disabled={disabled}
          required
        />

        {/* Left to right in both languages: an address is not Arabic text,
            and read right to left its slashes and dots land in the wrong
            places. `inputMode="url"` brings the keyboard with "/" and ".com"
            on it without `type="url"`, which would reject the site's own
            paths as malformed. */}
        <TextField
          id="about-governance-link-href"
          label={t("governance.linkHref")}
          // Each address in the hint is isolated left to right. Left in the
          // Arabic sentence's own direction, "https://" prints as "//:https"
          // and the example path loses its leading slash to the far end.
          hint={t.rich("governance.linkHrefHint", {
            addr: (chunks) => <bdi dir="ltr">{chunks}</bdi>,
          })}
          error={hrefRefused ? t("governance.linkHrefRefused") : null}
          dir="ltr"
          inputMode="url"
          spellCheck={false}
          autoComplete="off"
          value={link.href}
          disabled={disabled}
          required
          onChange={(event) => patchLink({ href: event.target.value })}
        />
      </fieldset>
    </>
  );
};
