import { getTranslations, setRequestLocale } from "next-intl/server";
import { fetchAsUser, readGrants } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { AccessDenied } from "@/components/ui/access-denied";
import { PresidentMessageEditor } from "@/components/admin/president-message/editor";
import { toMediaOptions } from "@/lib/admin/media-options";
import { editorialStatePath, findEditorialEntity } from "@/lib/admin/editorial-entities";
import type { PresidentMessageResponse } from "@/lib/admin/president-message";
import type { EditorialState } from "@/lib/admin/editorial-state";
import { resolveLocale } from "@/i18n/params";

/**
 * The president's message.
 *
 * The permission check here is the *enforcement* half of the pair. Hiding the
 * link in the navigation is presentation — anyone can type the URL — so this
 * decides on the server, before any of the record reaches the browser, and a
 * reader who fails it is sent an access notice rather than the screen.
 *
 * Reading the message is deliberately not enough. The screen exists to change
 * it or to decide on a change, so `presidentMessagePage:Read` alone opens
 * nothing (owner decision 2026-09-12) — which is a narrower rule than the
 * other sections of this dashboard use, and narrower than `أ٣` of the plan
 * recorded, where the link was to appear for `Read`.
 *
 * Two grants, two jobs. The editor writes the message; the approver decides
 * on it and needs to read what they are approving, so the screen opens for
 * either and the editor itself goes read-only for the one who cannot write.
 */
/** The one place this screen names its type. The registry resolves both the
 *  upstream paths and the actions from it. */
const ENTITY_TYPE = "presidentMessagePage";

export default async function PresidentMessagePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  /** `?record=<id>` opens one specific row of the collection — how a test
   *  record is rehearsed on without touching the real message. */
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  const t = await getTranslations("PresidentMessage");
  const common = await getTranslations("Common");

  // Written once: this screen has four exits and every one of them draws the
  // same header. Four copies is four edits, three of which are off-screen when
  // the fourth is being changed.
  const header = <PageHeader title={t("title")} description={t("description")} />;
  const denied = (
    <>
      {header}
      <AccessDenied title={common("accessDeniedTitle")} message={common("accessDenied")} />
    </>
  );

  const grants = await readGrants(locale);
  const canEdit = hasPermission(grants, "presidentMessagePage", "Update");
  const canReview = hasPermission(grants, "workflowInstances", "Approve");

  if (!canEdit && !canReview) {
    return denied;
  }

  // The record and the image library are independent grants. `mediaAssets`
  // being refused is an absence, not an error: the picker then offers upload
  // only, rather than an empty grid that reads as a broken screen.
  const [records, media] = await Promise.all([
    fetchAsUser<PresidentMessageResponse[]>("/president-message-page", locale),
    fetchAsUser<unknown[]>("/media-assets", locale),
  ]);

  // Mapped, not forwarded: the API's id is `_id`, and the picker matches the
  // stored image by `id`. Handed the raw list, every tile in the grid selects
  // nothing and the stored portrait shows as "no image" — silently, since
  // neither is an error.
  const images = toMediaOptions(media);

  // Refused is not the same as absent, and saying "access denied" for both
  // tells a reader with every permission that they lack one. `null` is the
  // API refusing; an empty list is a record nobody has created.
  if (records === null) {
    return denied;
  }

  // One message, held as a collection upstream: the archive of past messages
  // is a later decision (plan, decision 5), so the screen edits one row
  // rather than offering a list. Which row is the question below.
  //
  // The id is matched against the list the API already returned for THIS
  // reader, never fetched on its own. A URL cannot widen what its author may
  // see: an id they hold no grant for is simply not in the list.
  const wanted = (await searchParams).record;
  const requested = typeof wanted === "string" ? wanted : null;

  // Oldest first when the URL names none. "Whatever came back first" reads
  // the same on a one-row collection and stops being deterministic the
  // moment a second row exists — and the second row is a test record, which
  // must never be able to take the place of the real message.
  const record = requested
    ? (records.find((candidate) => candidate._id === requested) ?? null)
    : ([...records].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0] ?? null);

  if (record === null) {
    return (
      <>
        {header}
        {/* Two different absences. A named record that is not there is a bad
            link; an empty collection is a record nobody has created — and
            neither one may quietly open some other message instead, because
            an editor who believes they are on a test record would publish
            the federation's front page. */}
        <p className="rounded-[var(--radius-md)] border border-dashed border-[color:var(--color-border-default)] px-6 py-10 text-center text-body text-[color:var(--color-text-muted)]">
          <strong className="block text-body font-bold text-[color:var(--color-text-primary)]">
            {requested ? t("recordNotFoundTitle") : t("notCreatedTitle")}
          </strong>
          {/* Creating it is not this screen's job: it needs an appointment to
              attach to, and comes from seeding or an import. */}
          {requested ? t("recordNotFoundBody") : t("notCreatedBody")}
        </p>
      </>
    );
  }

  // Read after the record, because it is keyed by the record's id. Refused
  // or unavailable means no panel rather than no screen: the editor above it
  // is still usable, and a reader who may edit but not see the status has
  // lost a panel, not their work.
  const entity = findEditorialEntity(ENTITY_TYPE)!;
  const editorial = await fetchAsUser<EditorialState>(
    // Through the registry, not a literal: it already owns this path for the
    // route handler that serves the browser's own re-reads, and a second
    // spelling here is a second thing to remember when the API moves it.
    editorialStatePath(entity, record._id),
    locale,
  );

  // Only the fields this record can actually be blocked on. The rest of a
  // blocker path stays technical, which is the honest answer for generated
  // paths inside rich text.
  const fieldLabels = {
    featuredImageId: t("blockerField.featuredImageId"),
    heroImageId: t("blockerField.heroImageId"),
    pullQuote: t("blockerField.pullQuote"),
    messageBody: t("blockerField.messageBody"),
  };

  return (
    <>
      {header}
      {/* The editor owns the screen's two columns, not this page: the version
          panel's unsaved-changes guard needs the draft, and the draft lives
          in there. */}
      <PresidentMessageEditor
        record={record}
        images={images}
        canEdit={canEdit}
        canReadMedia={media !== null}
        locale={locale}
        editorial={editorial}
        fieldLabels={fieldLabels}
      />
    </>
  );
}
