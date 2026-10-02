import { Surface } from "@uaeaf/brand-ui";

import { CONTAINER } from "@/components/ui/section";
import type { AppLocale } from "@/i18n/routing";
import { formatFileSize } from "@/lib/pages/governance-documents-search";
import type { CommitteeDocument } from "@/lib/governance/types";
import { revealStep } from "@/lib/motion/reveal";

import { say } from "../shared/text";
import { ChapterHeading } from "./chapter-heading";
import { DownloadIcon, FileIcon } from "./icons";
import { ANCHOR_OFFSET } from "./sections";

const CONTROL =
  "inline-flex min-h-[var(--space-12)] w-full items-center justify-center gap-[var(--space-2)] rounded-[var(--radius-md)] border border-[color:var(--surface-border)] px-[var(--space-5)] text-body-sm font-bold sm:w-auto";

/**
 * The download control, named for the document it downloads.
 *
 * A document with no file yet gets a disabled button, not a link to nowhere:
 * a disabled control says the file is not available, where a dead link says
 * nothing until it is pressed. Full width on a phone, as the mobile file draws
 * it.
 */
const DownloadControl = ({ item, label, locale }: { item: CommitteeDocument; label: string; locale: AppLocale }) => {
  const name = `${label} ${say(item.title, locale)}`;

  if (!item.fileUrl) {
    return (
      <button type="button" disabled aria-label={name} className={`${CONTROL} cursor-not-allowed opacity-60`}>
        <DownloadIcon />
        {label}
      </button>
    );
  }

  return (
    <a
      href={item.fileUrl}
      download
      aria-label={name}
      className={`brand-focusable ${CONTROL} text-[color:var(--surface-link)]`}
    >
      <DownloadIcon />
      {label}
    </a>
  );
};

/**
 * `#documents`: the papers the committee was formed and works under.
 *
 * Hidden entirely when there are none — the design states that rule outright.
 * Rows rather than the kit's `DocumentCard`, which requires a view and a
 * download address for every card, and these documents have no file yet.
 */
export const CommitteeDocuments = ({
  documents,
  number,
  title,
  lead,
  downloadLabel,
  locale,
}: {
  documents: readonly CommitteeDocument[];
  number: number;
  title: string;
  lead: string;
  downloadLabel: string;
  locale: AppLocale;
}) => {
  if (documents.length === 0) return null;

  return (
    <Surface kind="raised" id="documents" className={ANCHOR_OFFSET}>
      <div className={`${CONTAINER} flex flex-col gap-[var(--space-8)] py-12 md:py-16 lg:py-24`}>
        <ChapterHeading number={number} title={title} lead={lead} />

        <ul data-field="documents" className="flex flex-col gap-[var(--space-3)]">
          {documents.map((item, index) => {
            const subtitle = say(item.subtitle, locale);
            const size = formatFileSize(item.fileSizeBytes ?? undefined, locale);
            return (
              <li
                key={item.id}
                data-part="document"
                className="gov-pop flex flex-col gap-[var(--space-4)] rounded-[var(--radius-lg)] border border-[color:var(--surface-border)] bg-[color:var(--surface-bg)] p-[var(--space-4)] sm:flex-row sm:items-center md:p-[var(--space-5)]"
                style={revealStep(index)}
              >
                <span
                  aria-hidden="true"
                  className="inline-flex min-h-[var(--space-12)] min-w-[var(--space-12)] shrink-0 items-center justify-center gap-[var(--space-1)] self-start rounded-[var(--radius-sm)] bg-[color:var(--surface-tile-fill)] px-[var(--space-2)] text-label font-bold text-[color:var(--surface-icon)] sm:self-center"
                >
                  {item.fileType ? item.fileType.toUpperCase() : <FileIcon />}
                </span>

                <div className="flex min-w-0 flex-1 flex-col gap-[var(--space-1)]">
                  <h3 className="text-body font-bold">{say(item.title, locale)}</h3>
                  {subtitle ? (
                    <p className="text-body-sm text-[color:var(--surface-text-muted)]">{subtitle}</p>
                  ) : null}
                </div>

                {size ? <span className="text-label text-[color:var(--surface-text-muted)]">{size}</span> : null}

                <DownloadControl item={item} label={downloadLabel} locale={locale} />
              </li>
            );
          })}
        </ul>
      </div>
    </Surface>
  );
};
