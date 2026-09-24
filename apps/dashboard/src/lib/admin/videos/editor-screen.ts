import { hasPermission } from "@/lib/auth/permissions";
import { fetchAsUser, readGrants } from "@/lib/auth/session";
import { UpstreamError } from "@/lib/api/upstream";
import { toAdminVideo } from "./to-admin-video";
import { toMediaOptions } from "@/lib/admin/media-options";
import { LIVE_STREAM_STATES } from "./types";
import type { AdminLiveStream, AdminVideo, LiveStreamState } from "./types";
import type { AppLocale } from "@/i18n/routing";

/**
 * What the video and broadcast editors read before they draw.
 *
 * `null` for `record` means "a new one"; the pages pass no id for that. The
 * four states are kept apart on purpose — a 404 and a 403 lead a reader to
 * two different places, and collapsing them sends someone hunting for a
 * permission they already hold.
 */
/** A read that produced no screen, and which of the three reasons it was.
 *  Shared so the two loaders cannot describe the same failures differently. */
export type EditorAbsence =
  | { status: "denied" }
  | { status: "unavailable" }
  | { status: "notFound" };

/** A 404 means the id named nothing; anything else means the API could not
 *  answer, which sends the reader somewhere different. */
const toAbsence = (error: unknown): EditorAbsence =>
  error instanceof UpstreamError && error.status === 404
    ? { status: "notFound" }
    : { status: "unavailable" };

export type EditorScreen<T> =
  | { status: "denied" }
  | { status: "unavailable" }
  | { status: "notFound" }
  | {
      status: "ready";
      data: {
        record: T | null;
        /** The stored still, for the preview an edit screen cannot resolve. */
        thumbnailUrl: string | null;
        canPublish: boolean;
        canDelete: boolean;
      };
    };

export const loadVideoEditor = async (
  locale: AppLocale,
  id: string | null,
): Promise<EditorScreen<AdminVideo>> => {
  const grants = await readGrants(locale);
  // Creating needs Create; opening an existing one needs Read. A reader with
  // neither has no business on either screen.
  const needed = id === null ? "Create" : "Read";
  if (!hasPermission(grants, "videos", needed)) {
    return { status: "denied" };
  }

  const permissions = {
    canPublish: hasPermission(grants, "videos", "Update"),
    canDelete: hasPermission(grants, "videos", "Delete"),
  };

  if (id === null) {
    return { status: "ready", data: { record: null, thumbnailUrl: null, ...permissions } };
  }

  try {
    const raw = await fetchAsUser<unknown>(`/videos/${id}`, locale);
    if (raw === null) return { status: "denied" };

    const record = toAdminVideo(raw);
    // A body that is not a video is not a video: the id named nothing usable,
    // which reads to the editor exactly as a deleted record does.
    if (!record) return { status: "notFound" };

    return {
      status: "ready",
      data: { record, thumbnailUrl: await readStill(locale, record.thumbnailId), ...permissions },
    };
  } catch (error) {
    return toAbsence(error);
  }
};

/**
 * What the broadcast screens read before they draw.
 *
 * -- Why this is not `EditorScreen<AdminLiveStream>` -------------------------
 *
 * A broadcast has a state a video does not: it can be over. The site stops
 * showing a stream the moment its end time passes, with nobody pressing
 * anything, and that moment can arrive while the editor is looking at it —
 * a championship runs long and the banner goes dark on its own.
 *
 * Reported as `notFound`, that sends an editor looking for a record nothing
 * deleted. So `finished` is its own state, and it carries the record: the one
 * useful thing to offer someone whose broadcast ran out is to start another
 * with the same details. An id that genuinely names nothing is still
 * `notFound`.
 *
 * -- Three different broadcasts, three fields --------------------------------
 *
 * `record` is the one being edited. `template` is one being copied — the
 * "start another like this" path, which arrives as `?from=<id>`. `active` is
 * whatever is on air right now, which is neither: it is the warning that
 * starting a new broadcast will end it.
 */
export type LiveEditorScreen =
  | { status: "denied" }
  | { status: "unavailable" }
  | { status: "notFound" }
  | { status: "finished"; data: { record: AdminLiveStream; canStart: boolean } }
  | {
      status: "ready";
      data: {
        record: AdminLiveStream | null;
        template: AdminLiveStream | null;
        active: AdminLiveStream | null;
        /** The still of whichever broadcast the form is showing. */
        thumbnailUrl: string | null;
        canEnd: boolean;
      };
    };

/** Whatever the API answered, as the broadcast shape the screens read.
 *  Tolerant in the same way `toAdminVideo` is: one malformed field must not
 *  take down the screen, so anything unreadable reads as absent. */
export const toAdminLiveStream = (raw: unknown): AdminLiveStream | null => {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as Record<string, unknown>;

  const id = typeof row.id === "string" ? row.id : typeof row._id === "string" ? row._id : null;
  if (!id) return null;

  const text = (value: unknown) => {
    if (typeof value !== "object" || value === null) return null;
    const pair = value as Record<string, unknown>;
    return {
      ar: typeof pair.ar === "string" ? pair.ar : "",
      en: typeof pair.en === "string" ? pair.en : "",
    };
  };

  const when = (value: unknown) => (typeof value === "string" ? value : null);

  const isActive = row.isActive !== false;
  const expectedEndAt = when(row.expectedEndAt) ?? "";
  // The API computes this. Derived here only when it is absent, so an older
  // build still reports a finished broadcast as finished rather than as live.
  const state: LiveStreamState = LIVE_STREAM_STATES.includes(row.state as LiveStreamState)
    ? (row.state as LiveStreamState)
    : !isActive
      ? "ended"
      : new Date(expectedEndAt).getTime() <= Date.now()
        ? "expired"
        : "live";

  return {
    id,
    title: text(row.title) ?? { ar: "", en: "" },
    venue: text(row.venue),
    videoId: typeof row.videoId === "string" ? row.videoId : "",
    url: typeof row.url === "string" ? row.url : "",
    startedAt: when(row.startedAt) ?? "",
    expectedEndAt,
    thumbnailId: when(row.thumbnailId),
    endedAt: when(row.endedAt),
    isActive,
    state,
    associations: Array.isArray(row.associations)
      ? (row.associations as AdminLiveStream["associations"])
      : [],
  };
};

/**
 * Is this broadcast over?
 *
 * One line, because the API decides. It owns the clock and the schema, and it
 * publishes `state` for exactly this question — the first version of this
 * rebuilt the verdict here from `isActive` and `expectedEndAt`, which is the
 * kind of duplicate rule that drifts in one place and not the other.
 */
export const isFinished = (stream: AdminLiveStream): boolean => stream.state !== "live";

/** One asset by id, for a preview. A refused or missing library costs the
 *  picture, never the screen. */
const readStill = async (locale: AppLocale, thumbnailId: string | null): Promise<string | null> => {
  if (!thumbnailId) return null;
  const asset = await fetchAsUser<unknown>(`/media-assets/${thumbnailId}`, locale).catch(() => null);
  return asset ? (toMediaOptions([asset])[0]?.url ?? null) : null;
};

const readLiveStream = async (locale: AppLocale, id: string): Promise<AdminLiveStream | null> => {
  const raw = await fetchAsUser<unknown>(`/live-streams/${id}`, locale);
  return raw === null ? null : toAdminLiveStream(raw);
};

export const loadLiveEditor = async (
  locale: AppLocale,
  id: string | null,
  /** `?from=<id>` — the broadcast whose details a new one starts from. */
  copyFrom: string | null = null,
): Promise<LiveEditorScreen> => {
  const grants = await readGrants(locale);
  if (!hasPermission(grants, "videos", id === null ? "Create" : "Update")) {
    return { status: "denied" };
  }
  const canEnd = hasPermission(grants, "videos", "Update");
  // Offering "start another like this" to someone who cannot create one is
  // a button whose only outcome is a refusal.
  const canStart = hasPermission(grants, "videos", "Create");

  try {
    if (id !== null) {
      const record = await readLiveStream(locale, id);
      if (record === null) return { status: "denied" };

      // Over, one way or the other. The record rides along: the offer to make
      // is "start another with these details", and it needs the details.
      if (isFinished(record)) return { status: "finished", data: { record, canStart } };

      return {
        status: "ready",
        data: {
          record,
          template: null,
          active: null,
          thumbnailUrl: await readStill(locale, record.thumbnailId),
          canEnd,
        },
      };
    }

    // Starting one. The active broadcast is not the record — it is the
    // warning, because starting a second ends the first. It and the template
    // are independent reads, so they go together rather than one after the
    // other.
    //
    // A template that cannot be read is not an error worth a screen: the
    // editor asked for a head start, and an empty form is a worse answer than
    // no head start but still a working one.
    const [active, template] = await Promise.all([
      fetchAsUser<AdminLiveStream | null>("/live-streams/public/active", locale),
      copyFrom ? readLiveStream(locale, copyFrom).catch(() => null) : null,
    ]);

    return {
      status: "ready",
      data: {
        record: null,
        template,
        active: active ? toAdminLiveStream(active) : null,
        // A copied broadcast keeps the picture it had; a brand-new one has
        // none until it starts and the resolver fetches one.
        thumbnailUrl: await readStill(locale, template?.thumbnailId ?? null),
        canEnd,
      },
    };
  } catch (error) {
    return toAbsence(error);
  }
};
