import {
  AthleteResultBadge,
  FEATURE_CYCLE,
  FeatureCard,
  GlassTile,
  InfoCard,
  StatCard,
  StepBadge,
  TableHeader,
  BRAND_DRAW_LINE,
  BrandAccentBar,
  BrandBorder,
  BrandStreaks,
  Button,
  CtaBand,
  DocumentCard,
  EmptyState,
  IconButton,
  LinkTile,
  PageHero,
  SectionHeading,
  StatHighlight,
  TricolorDivider,
} from "@uaeaf/brand-ui";

import { SurfaceMatrix } from "./surface-matrix";
import { InteractiveSpecimens } from "./interactive-specimens";

/**
 * The specimens.
 *
 * Content here is deliberately obvious placeholder text, in Latin, marked as
 * such. Nothing on this page may look like a real federation record: a Brand
 * Kit screenshot escaping into a review thread with plausible athlete names and
 * dates on it is the fabricated-data failure root `CLAUDE.md` §7 forbids, and
 * the page's own purpose is colour and geometry, not copy.
 */

const ACCENTS = (
  <>
    <BrandAccentBar />
    <TricolorDivider />
    <div className="brand-kit-streak-box">
      <BrandStreaks placement="corner" />
      <span>streaks / corner</span>
    </div>
  </>
);

const BORDERS = (
  <div className="brand-kit-row">
    {(["static", "hover", "live"] as const).map((variant) =>
      (["tricolor", "green", "red"] as const).map((tone) => (
        <BrandBorder key={`${variant}-${tone}`} variant={variant} tone={tone}>
          <p className="brand-kit-chip">
            {variant} / {tone}
          </p>
        </BrandBorder>
      )),
    )}
    <BrandBorder variant="static" shape="circle" className="brand-kit-ring">
      <span aria-hidden="true">ring</span>
    </BrandBorder>
  </div>
);

const BUTTONS = (
  <div className="brand-kit-row">
    <Button variant="primary">Primary</Button>
    <Button variant="secondary">Secondary</Button>
    <Button variant="ghost">Ghost</Button>
    <Button variant="primary" href="/brand-kit">
      As a link
    </Button>
    <IconButton aria-label="Specimen icon button">
      <span aria-hidden="true">+</span>
    </IconButton>
  </div>
);

const HEADINGS = (
  <>
    <SectionHeading title="Section heading" description="Plain variant, with a description." />
    <SectionHeading title="Plate variant" variant="plate" />
  </>
);

const STAT_CARDS = (
  <div className="brand-kit-card-grid">
    {(["neutral", "action", "attention", "positive", "live"] as const).map((tone) => (
      <StatCard
        key={tone}
        value="00"
        label={`Tone: ${tone}`}
        detail="The edge carries the meaning"
        tone={tone}
      />
    ))}
  </div>
);

const INFO_CARDS = (
  <div className="brand-kit-card-grid">
    <InfoCard label="Placeholder label" value="Placeholder value" accent />
    <InfoCard label="With a link" value="Placeholder link" href="/brand-kit" />
  </div>
);

const TABLE = (
  <table className="brand-kit-table">
    <TableHeader>
      <tr>
        <th scope="col">Column</th>
        <th scope="col">Another</th>
      </tr>
    </TableHeader>
    <tbody>
      <tr>
        <td>Row value</td>
        <td>Row value</td>
      </tr>
    </tbody>
  </table>
);

const STEPS = (
  <div className="brand-kit-row">
    {["1", "2", "3"].map((step) => (
      <StepBadge key={step} step={step} stepLabel="Step" />
    ))}
  </div>
);

const GLASS = (
  <div className="brand-kit-card-grid">
    <GlassTile title="Placeholder value" description="Translucent on a coloured ground, a plate on a light one." />
    <GlassTile title="Second tile" />
  </div>
);

const FIGURES = (
  <div className="brand-kit-row">
    <StatHighlight value="00.00" unit="unit" label="Placeholder figure" />
    <AthleteResultBadge name="Placeholder name" detail="Placeholder event" place={1} placeLabel="First place" />
  </div>
);

const DRAW_LINE = (
  <div className={`brand-kit-draw-target ${BRAND_DRAW_LINE}`}>
    <p>Hover or focus me — the tricolour draws from the inline start.</p>
    <a className="brand-kit-control" href="/brand-kit">
      A focusable child, so focus-within works too
    </a>
  </div>
);

const DOCUMENT_CARDS = (
  <div className="brand-kit-card-grid">
    <DocumentCard
      title="Placeholder regulation"
      description="Green header: the regulation category."
      typeLabel="PDF"
      category="regulation"
      date="01/01/2026"
      dateLabel="Published"
      size="1.0 MB"
      sizeLabel="File size"
      viewHref="/brand-kit"
      viewLabel="View document"
      downloadHref="/brand-kit"
      downloadLabel="Download placeholder regulation"
      borderVariant="hover"
    />
    <DocumentCard
      title="Placeholder policy"
      description="Red header: the policy category."
      typeLabel="PDF"
      category="policy"
      viewHref="/brand-kit"
      viewLabel="View document"
      downloadHref="/brand-kit"
      downloadLabel="Download placeholder policy"
      borderVariant="hover"
    />
    <DocumentCard
      title="Placeholder featured regulation"
      description="Ink header with a mesh, static tricolour edge, extra badge."
      typeLabel="PDF"
      category="regulation"
      featured
      featuredBadge="Core"
      date="01/01/2026"
      dateLabel="Published"
      viewHref="/brand-kit"
      viewLabel="View document"
      downloadHref="/brand-kit"
      downloadLabel="Download placeholder featured regulation"
    />
  </div>
);

/**
 * The second card above has no `date` and no `size`, on purpose: it is the
 * specimen that shows absent metadata rendering as **nothing** rather than as a
 * dash. Compare it with the first.
 */
export const Specimens = () => (
  <>
    <PageHero
      title="Brand UI Kit"
      description="Every component in @uaeaf/brand-ui, on every surface. Internal reference — never linked, never indexed, absent outside development."
      breadcrumb={[{ label: "Internal", href: "/brand-kit" }, { label: "Brand UI Kit" }]}
      breadcrumbLabel="Breadcrumb"
    />

    <SurfaceMatrix title="Accents — bar, divider, streaks">{ACCENTS}</SurfaceMatrix>
    <SurfaceMatrix title="BrandBorder — 3 variants x 3 tones, plus the ring">{BORDERS}</SurfaceMatrix>
    <SurfaceMatrix title="Buttons and IconButton">{BUTTONS}</SurfaceMatrix>
    <SurfaceMatrix title="SectionHeading">{HEADINGS}</SurfaceMatrix>
    <SurfaceMatrix title="StatHighlight and AthleteResultBadge">{FIGURES}</SurfaceMatrix>
    <SurfaceMatrix title="StatCard — the tone is an edge, never a fill">{STAT_CARDS}</SurfaceMatrix>
    <SurfaceMatrix title="InfoCard">{INFO_CARDS}</SurfaceMatrix>
    <SurfaceMatrix title="TableHeader">{TABLE}</SurfaceMatrix>
    <SurfaceMatrix title="StepBadge">{STEPS}</SurfaceMatrix>
    <SurfaceMatrix title="GlassTile">{GLASS}</SurfaceMatrix>

    <section className="brand-kit-specimen">
      <h2 className="brand-kit-specimen__title">
        FeatureCard — alternating, so no one identity colour becomes the ground
      </h2>
      <div className="brand-kit-card-grid brand-kit-card-grid--three">
        {FEATURE_CYCLE.map((tone, index) => (
          <FeatureCard
            key={tone}
            tone={tone}
            ordinal={String(index + 1)}
            title={`Tone: ${tone}`}
            description="One ink, white, on every tone."
          />
        ))}
      </div>
    </section>
    <SurfaceMatrix title="Hover draw line (a utility class, not a component)">{DRAW_LINE}</SurfaceMatrix>
    <SurfaceMatrix title="DocumentCard — the middle card has no date and no size">
      {DOCUMENT_CARDS}
    </SurfaceMatrix>

    <InteractiveSpecimens />

    <section className="brand-kit-specimen">
      <h2 className="brand-kit-specimen__title">CtaBand — full-bleed, on both tones</h2>
      <div className="brand-kit-specimen__grid">
        {(["brand-green", "brand-red"] as const).map((kind) => (
          <CtaBand
            key={kind}
            tone={kind === "brand-green" ? "green" : "red"}
            title="A call to action"
            description="One ink, hierarchy from size and weight."
            action={<Button variant="primary">Act</Button>}
          />
        ))}
      </div>
    </section>

    <section className="brand-kit-specimen">
      <h2 className="brand-kit-specimen__title">CtaBand as an inset card (ADR-0098 §8.6)</h2>
      <CtaBand
        tone="red"
        layout="card"
        title="Inset, so a canvas gutter separates it from any green section"
        action={<Button variant="primary">Act</Button>}
      />
    </section>

    <section className="brand-kit-specimen">
      <h2 className="brand-kit-specimen__title">Tiles on a brand ground</h2>
      <CtaBand
        tone="green"
        title="Governance and strategy"
        action={
          <div className="brand-kit-row">
            <LinkTile title="First tile" description="Translucent fill and edge." href="/brand-kit" />
            <LinkTile title="Second tile" href="/brand-kit" />
          </div>
        }
      />
    </section>

    <SurfaceMatrix title="EmptyState">
      <EmptyState
        title="No document matches this filter"
        description="Named cause, and a way out."
        action={<Button variant="secondary">Show all documents</Button>}
      />
    </SurfaceMatrix>
  </>
);
