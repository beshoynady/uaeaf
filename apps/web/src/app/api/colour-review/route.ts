import { readFileSync } from "node:fs";
import { join } from "node:path";
import { contrastRatio } from "@uaeaf/design-tokens/testing/contrast";

/**
 * Internal review page for the colour batch of 2026-09-14: the two-mode lists
 * and the palette expansion. Not a public page: not in `PUBLIC_PAGES`, not in
 * the sitemap, not linked, `noindex`, and absent from production builds.
 *
 * A route handler rather than a `page.tsx`, for two reasons the guards make:
 * every `page.tsx` must have a registry entry (`seo-contract.spec.ts`), and a
 * registry entry puts a page in the sitemap. Under `/api` the locale proxy
 * leaves the path alone, so the page renders once, in Arabic.
 *
 * Nothing here is a token. The existing lists are read from the token build,
 * the proposed values from `proposal.css`, the candidate palettes from
 * `palettes.css`, all beside this file, and every contrast ratio and ΔE on the
 * page is computed from those files when it is requested. The one stored input
 * is `search.json`: a search over the whole hue circle, too slow to run per
 * request, kept with the method that produced it. `?format=json` returns the
 * same measurements for the proposal document; `?palette=` picks the palette
 * the lists show.
 */

export const dynamic = "force-dynamic";

type Mode = "light" | "dark";
const MODES: readonly Mode[] = ["light", "dark"];
const STEPS = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900"] as const;

const TOKENS = join(process.cwd(), "..", "..", "packages", "design-tokens", "build", "css");
const HERE = join(process.cwd(), "src", "app", "api", "colour-review");

type Values = Record<string, string>;
type Blocks = { invariant: Values; light: Values; dark: Values };

const declarations = (css: string): Values =>
  Object.fromEntries([...css.matchAll(/(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]));

const withoutComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** A selector naming a mode feeds that mode; a bare `:root` holds values that do not change with the mode. */
const blocks = (css: string): Blocks => {
  const out: Blocks = { invariant: {}, light: {}, dark: {} };
  for (const [, selector, body] of withoutComments(css).matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const target = selector.includes('"dark"') ? out.dark : selector.includes('"light"') ? out.light : out.invariant;
    Object.assign(target, declarations(body));
  }
  return out;
};

type PaletteMeta = { key: string; name: string; character: string; families: { name: string; why: string; hue: number; peak: number }[] };
type Search = {
  source: string;
  floor: number;
  grid: string;
  hueSwatches: string[];
  hueStrips: Record<string, { label: string; worst: number[] }>;
  capacity: { rampShaped: number; rampShapedBest: { hue: number; worst: number }; freeShape: number; freeShapePairs: number; freeShapeSharedHue: number; perCharacter: number };
  scenarios: { key: string; label: string; capacity: number; bestFour: { worst: number; hues: number[] } | null }[];
  palettes: PaletteMeta[];
};

type Context = { built: Record<Mode, Values>; proposal: Blocks; palettes: Blocks; search: Search; palette: string; css: string };

const load = (): Context => {
  const read = (dir: string, file: string) => readFileSync(join(dir, file), "utf-8");
  const base = declarations(read(TOKENS, "base.css"));
  const built = {
    light: { ...base, ...declarations(read(TOKENS, "light.css")) },
    dark: { ...base, ...declarations(read(TOKENS, "dark.css")) },
  };
  const proposalCss = read(HERE, "proposal.css");
  const palettesCss = read(HERE, "palettes.css");
  const search = JSON.parse(read(HERE, "search.json")) as Search;
  const tokenCss = ["base.css", "light.css", "dark.css"].map((file) => read(TOKENS, file)).join("\n");
  return {
    built,
    proposal: blocks(proposalCss),
    palettes: blocks(palettesCss),
    search,
    palette: search.palettes[0].key,
    css: [tokenCss, withoutComments(proposalCss), withoutComments(palettesCss), read(HERE, "review.css")].join("\n"),
  };
};

const proposedName = (token: string) => `--proposed-${token.slice(2)}`;
const VAR = /^var\((--[a-zA-Z0-9-]+)\)$/;
const SERIES = /^--color-series-(\d)-(surface|accent|on-accent|label)$/;

/** Card 1 is Federation Green and card 6 Federation Black in every palette; 2–5 are the palette's four new colours. */
const seriesSource = (palette: string, index: number, role: string) =>
  index === 1 ? `--proposed-card-green-${role}` : index === 6 ? `--proposed-card-black-${role}` : `--proposed-palette-${palette}-${index - 1}-${role}`;

/** A name's value in one mode: the proposal's when it proposes one, then the palettes', then the build's — with `var()` followed. */
const resolve = (ctx: Context, mode: Mode, token: string): string => {
  if (token.startsWith("#")) return token;
  const series = SERIES.exec(token);
  if (series) return resolve(ctx, mode, seriesSource(ctx.palette, Number(series[1]), series[2]));
  const value = ctx.proposal[mode][proposedName(token)] ?? ctx.palettes[mode][token] ?? ctx.palettes.invariant[token] ?? ctx.built[mode][token] ?? "";
  const bound = VAR.exec(value);
  return bound ? resolve(ctx, mode, bound[1]) : value;
};

/** The role a proposed value is bound to, when the proposal is a binding rather than a value. */
const bindingOf = (ctx: Context, mode: Mode, token: string) => VAR.exec(ctx.proposal[mode][proposedName(token)] ?? "")?.[1];

// ---- what each row is measured against

type Kind = "ground" | "text" | "shape" | "none";
type Spec = { token: string; role: string; kind: Kind; partners: string[]; min: number; note?: string };
type Group = { id: string; title: string; basis: string; rows: Spec[] };

const SURFACES = ["--color-surface-base", "--color-surface-raised", "--color-surface-sunken"];
const PAGE = ["--color-surface-base", "--color-surface-raised"];
const TEXTS = ["--color-text-primary", "--color-text-secondary", "--color-text-muted"];
const STATE_NAMES: Record<string, string> = { success: "النجاح", error: "الخطأ", warning: "التحذير", info: "المعلومة" };
const REGISTER_NAMES: Record<string, string> = { green: "الأخضر", red: "الأحمر", black: "الأسود" };

const paletteMeta = (ctx: Context, key: string) => ctx.search.palettes.find((p) => p.key === key) ?? ctx.search.palettes[0];

const groups = (ctx: Context): Group[] => [
  {
    id: "identity",
    title: "ألوان الهوية",
    basis: "ثابتة بين الوضعين: دليل الهوية §5.1 وChapter 1 ADR-0003 يمنعان تغييرها (ADR-0063 D1)",
    rows: [
      { token: "--color-brand-primary", role: "أخضر الاتحاد — تعبئة الفعل الأساسي", kind: "ground", partners: ["--color-text-on-brand"], min: 4.5 },
      { token: "--color-brand-secondary", role: "أحمر الاتحاد — المنافسة والأرقام القياسية", kind: "ground", partners: ["#FFFFFF"], min: 4.5 },
      { token: "--color-brand-black", role: "أسود الاتحاد — تعبئة مؤسسية", kind: "ground", partners: ["#FFFFFF"], min: 4.5 },
    ],
  },
  {
    id: "surfaces",
    title: "الأسطح",
    basis: "ADR-0059 D6 · ADR-0066",
    rows: [
      { token: "--color-surface-base", role: "أرضية الصفحة", kind: "ground", partners: [...TEXTS, "--color-text-link"], min: 4.5 },
      { token: "--color-surface-raised", role: "أرضية البطاقة", kind: "ground", partners: [...TEXTS, "--color-text-link"], min: 4.5 },
      { token: "--color-surface-sunken", role: "أرضية غائرة", kind: "ground", partners: [...TEXTS, "--color-text-link"], min: 4.5 },
    ],
  },
  {
    id: "text",
    title: "النصوص",
    basis: "ADR-0059 D4 · ADR-0063 D1.3",
    rows: [
      { token: "--color-text-primary", role: "النص الأساسي", kind: "text", partners: SURFACES, min: 4.5 },
      { token: "--color-text-secondary", role: "النص الثانوي", kind: "text", partners: SURFACES, min: 4.5 },
      { token: "--color-text-muted", role: "النص الخافت", kind: "text", partners: SURFACES, min: 4.5 },
      { token: "--color-text-link", role: "الرابط", kind: "text", partners: SURFACES, min: 4.5 },
      { token: "--color-text-on-brand", role: "نص على تعبئة الهوية", kind: "text", partners: ["--color-brand-primary", "--color-section-green-surface"], min: 4.5 },
      { token: "--color-text-disabled", role: "نص معطَّل", kind: "text", partners: SURFACES, min: 0, note: "مستثنى بنص WCAG 1.4.3 للعناصر غير الفعّالة" },
    ],
  },
  {
    id: "edges",
    title: "الحدود والتركيز",
    basis: "ADR-0066 D1 · WCAG 1.4.11",
    rows: [
      { token: "--color-border-strong", role: "حدّ العنصر وحافة البطاقة", kind: "shape", partners: PAGE, min: 3 },
      { token: "--color-border-default", role: "فاصل بين عناصر، لا حدّ عنصر", kind: "shape", partners: PAGE, min: 0, note: "لا يُرسم حافةً لعنصر (ADR-0066 D1)" },
      { token: "--color-focus-default", role: "حلقة التركيز", kind: "shape", partners: PAGE, min: 3 },
    ],
  },
  {
    id: "actions",
    title: "الأفعال",
    basis: "ADR-0065 D2 · ADR-0068 D1 — مقيسة على أرضيات السكون والمرور والضغط",
    rows: [
      {
        token: "--button-primary-text",
        role: "نص الزر الأساسي",
        kind: "text",
        partners: ["--button-primary-background", "--button-primary-background-hover", "--button-primary-background-pressed"],
        min: 4.5,
      },
      {
        token: "--button-danger-text",
        role: "نص زر الحذف",
        kind: "text",
        partners: ["--button-danger-background", "--button-danger-background-hover", "--button-danger-background-pressed"],
        min: 4.5,
        note: "السبب نفسه، وأرضيتا المرور والضغط ثابتتان بينما أرضية السكون تتبع الوضع: قرار مطلوب",
      },
    ],
  },
  {
    id: "states",
    title: "الحالات",
    basis: "ADR-0051 · دلالتها ثابتة: لا تُستعار لغير الحالة",
    rows: Object.keys(STATE_NAMES).flatMap((state) => [
      { token: `--color-semantic-${state}`, role: `${STATE_NAMES[state]} — أيقونة وحدّ`, kind: "shape" as const, partners: SURFACES, min: 3 },
      { token: `--color-semantic-${state}-text`, role: `${STATE_NAMES[state]} — نص`, kind: "text" as const, partners: SURFACES, min: 4.5 },
    ]),
  },
  {
    id: "registers",
    title: "أقسام الهوية",
    basis: "ADR-0059 D2 — أرضيات الدليل §6.1 الأربع",
    rows: ["green", "red", "black"].flatMap((register) => [
      { token: `--color-section-${register}-surface`, role: `أرضية القسم ${REGISTER_NAMES[register]}`, kind: "ground" as const, partners: [`--color-section-${register}-text`, `--color-section-${register}-text-muted`], min: 4.5 },
      { token: `--color-section-${register}-border`, role: `حدّ عنصر داخل القسم ${REGISTER_NAMES[register]}`, kind: "shape" as const, partners: [`--color-section-${register}-surface`], min: 3 },
    ]),
  },
  {
    id: "categories",
    title: "التصنيفات",
    basis: "ADR-0065 D3a — ثابتة بين الوضعين عمدًا",
    rows: [1, 2, 3, 4, 5].map((index) => ({ token: `--color-category-${index}`, role: `تصنيف ${index} — شارة`, kind: "ground" as const, partners: ["#FFFFFF"], min: 4.5 })),
  },
  {
    id: "series",
    title: `ألوان بنود المجموعة — اللوحة ${paletteMeta(ctx, ctx.palette).name}`,
    basis: "البند 1 أخضر الهوية، والبند 6 أسودها، والبنود 2–5 ألوان اللوحة الأربعة",
    rows: [1, 2, 3, 4, 5, 6].flatMap((index) => [
      { token: `--color-series-${index}-surface`, role: `البند ${index} — أرضية البطاقة`, kind: "ground" as const, partners: TEXTS, min: 4.5 },
      { token: `--color-series-${index}-accent`, role: `البند ${index} — الحافة والشارة`, kind: "shape" as const, partners: [`--color-series-${index}-surface`, ...PAGE], min: 3 },
      { token: `--color-series-${index}-on-accent`, role: `البند ${index} — نص على الشارة`, kind: "text" as const, partners: [`--color-series-${index}-accent`], min: 4.5 },
      { token: `--color-series-${index}-label`, role: `البند ${index} — نص بلون البند`, kind: "text" as const, partners: [`--color-series-${index}-surface`], min: 4.5 },
    ]),
  },
];

const round = (value: number) => Math.round(value * 100) / 100;
const fixed = (value: number) => round(value).toFixed(2);

type Measured = { value: string; partner: string; partnerValue: string; ratio: number; pass: boolean };

const measure = (ctx: Context, mode: Mode, spec: Spec): Measured => {
  const value = resolve(ctx, mode, spec.token);
  const worst = spec.partners
    .map((partner) => ({ partner, partnerValue: resolve(ctx, mode, partner) }))
    .map((entry) => ({ ...entry, ratio: contrastRatio(value, entry.partnerValue) }))
    .reduce((a, b) => (a.ratio <= b.ratio ? a : b));
  return { value, partner: worst.partner, partnerValue: worst.partnerValue, ratio: round(worst.ratio), pass: worst.ratio >= spec.min };
};

const statusOf = (ctx: Context, token: string) => {
  if (ctx.built.light[token] === undefined) return "new";
  return MODES.some((mode) => ctx.proposal[mode][proposedName(token)] !== undefined && resolve(ctx, mode, token) !== ctx.built[mode][token]) ? "changed" : "existing";
};

// ---- colour-vision simulation: Viénot, Brettel & Mollon 1999, as ADR-0065 D3a and colour-role-contract.spec.ts use it

type Vision = "normal" | "deutan" | "protan";
const VISIONS: readonly Vision[] = ["normal", "deutan", "protan"];

const channels = (hex: string) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const RGB_TO_LMS = [
  [17.8824, 43.5161, 4.11935],
  [3.45565, 27.1554, 3.86714],
  [0.0299566, 0.184309, 1.46709],
];
const LMS_TO_RGB = [
  [0.0809444479, -0.130504409, 0.116721066],
  [-0.0102485335, 0.0540193266, -0.113614708],
  [-0.000365296938, -0.00412161469, 0.693511405],
];
const PROJECTION: Record<Exclude<Vision, "normal">, number[][]> = {
  protan: [
    [0, 2.02344, -2.52581],
    [0, 1, 0],
    [0, 0, 1],
  ],
  deutan: [
    [1, 0, 0],
    [0.494207, 0, 1.24827],
    [0, 0, 1],
  ],
};
const multiply = (a: number[][], b: number[][]) => a.map((row) => b[0].map((_, j) => row.reduce((sum, value, k) => sum + value * b[k][j], 0)));
const apply = (m: number[][], v: number[]) => m.map((row) => row.reduce((sum, value, k) => sum + value * v[k], 0));
/** One linear-RGB matrix per dichromacy: the same transform the SVG filters apply. */
const SIMULATION: Record<Exclude<Vision, "normal">, number[][]> = {
  protan: multiply(LMS_TO_RGB, multiply(PROJECTION.protan, RGB_TO_LMS)),
  deutan: multiply(LMS_TO_RGB, multiply(PROJECTION.deutan, RGB_TO_LMS)),
};

const lab = (rgb: number[]) => {
  const [r, g, b] = rgb.map((c) => Math.min(1, Math.max(0, c)));
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047), f(0.2126 * r + 0.7152 * g + 0.0722 * b), f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
};

const deltaE = (a: string, b: string, vision: Vision) => {
  const view = (hex: string) => {
    const rgb = channels(hex).map(linear);
    return vision === "normal" ? rgb : apply(SIMULATION[vision], rgb);
  };
  const [p, q] = [lab(view(a)), lab(view(b))];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
};

// ---- every colour that already has a role, as each mode resolves it: what a new colour must stay apart from

const REFERENCE_TOKENS: readonly (readonly [string, string])[] = [
  ["أخضر الهوية", "--color-brand-primary"], ["أحمر الهوية", "--color-brand-secondary"], ["أسود الهوية", "--color-brand-black"], ["أبيض الهوية", "--color-brand-white"],
  ["قسم أخضر", "--color-section-green-surface"], ["قسم أحمر", "--color-section-red-surface"], ["قسم أسود", "--color-section-black-surface"],
  ["الرابط", "--color-text-link"], ["الزر الأساسي مرورًا", "--button-primary-background-hover"], ["الزر الأساسي ضغطًا", "--button-primary-background-pressed"],
  ["زر الحذف", "--button-danger-background"], ["زر الحذف مرورًا", "--button-danger-background-hover"], ["زر الحذف ضغطًا", "--button-danger-background-pressed"],
  ["البيانات (فولاذي)", "--color-accent-information"], ["التصنيف (فيروزي)", "--color-accent-classification"], ["التحرير (رملي)", "--color-accent-featured"],
  ["تصنيف 1", "--color-category-1"], ["تصنيف 2", "--color-category-2"], ["تصنيف 3", "--color-category-3"], ["تصنيف 4", "--color-category-4"], ["تصنيف 5", "--color-category-5"],
  ["ذهبي (الهوية)", "--color-brand-medal-gold"], ["فضي (الهوية)", "--color-brand-medal-silver"], ["برونزي (الهوية)", "--color-brand-medal-bronze"],
  ["ذهبي", "--color-semantic-medal-gold"], ["فضي", "--color-semantic-medal-silver"], ["برونزي", "--color-semantic-medal-bronze"],
  ["النجاح", "--color-semantic-success"], ["النجاح مرورًا", "--color-semantic-success-hover"], ["الخطأ", "--color-semantic-error"], ["الخطأ مرورًا", "--color-semantic-error-hover"],
  ["التحذير", "--color-semantic-warning"], ["المعلومة", "--color-semantic-info"], ["الحالة المحايدة", "--color-semantic-neutral"],
];
const APPROVED_REFERENCES: readonly (readonly [string, string])[] = [
  ["التحذير (المصحَّح)", "--proposed-color-semantic-warning"], ["نص النجاح", "--proposed-color-semantic-success-text"], ["نص الخطأ", "--proposed-color-semantic-error-text"],
  ["نص التحذير", "--proposed-color-semantic-warning-text"], ["نص المعلومة", "--proposed-color-semantic-info-text"],
];
const STATE_WORDS = ["النجاح", "الخطأ", "التحذير", "المعلومة"];

type Reference = { value: string; names: string[] };
type Nearest = { value: number; names: string[]; refValue: string; vision: Vision };

const references = (ctx: Context, mode: Mode): Reference[] => {
  const entries = [
    ...REFERENCE_TOKENS.map(([name, token]) => [name, ctx.built[mode][token]] as const),
    ...APPROVED_REFERENCES.map(([name, token]) => [name, ctx.proposal[mode][token]] as const),
  ];
  const byValue = new Map<string, Reference>();
  for (const [name, value] of entries) {
    if (!value?.startsWith("#")) continue;
    const key = value.toUpperCase();
    const found = byValue.get(key);
    if (found) found.names.push(name);
    else byValue.set(key, { value: key, names: [name] });
  }
  return [...byValue.values()];
};
const isState = (ref: Reference) => ref.names.some((name) => STATE_WORDS.some((word) => name.includes(word)));

/** The closest reference under the worst of the three visions. */
const nearest = (hex: string, refs: Reference[]): Nearest => {
  let best: Nearest = { value: Infinity, names: [], refValue: "", vision: "normal" };
  for (const ref of refs)
    for (const vision of VISIONS) {
      const value = deltaE(hex, ref.value, vision);
      if (value < best.value) best = { value, names: ref.names, refValue: ref.value, vision };
    }
  return best;
};

// ---- one palette, measured

type RoleSet = { surface: string; accent: string; onAccent: string; label: string };
type ModeReport = {
  roles: RoleSet;
  steps: { surface: string; accent: string; label: string };
  ratios: { text: number; accentOnSurface: number; accentOnPage: number; onAccent: number; label: number };
  contrastPass: boolean;
  nearest: Nearest;
  nearestState: Nearest;
  cards: Nearest;
};
type ColourReport = { index: number; name: string; why: string; hue: number; peak: number; ramp: string[]; light: ModeReport; dark: ModeReport };
type PaletteReport = {
  meta: PaletteMeta;
  colours: ColourReport[];
  pairs: { mode: Mode; pair: string; value: number; vision: Vision }[];
  summary: { contrastPass: boolean; amongThemselves: number; againstCards: number; againstStates: number; againstExisting: number; worst: number };
};

const modeReport = (ctx: Context, mode: Mode, key: string, index: number, refs: Reference[]): ModeReport => {
  const name = (role: string) => `--proposed-palette-${key}-${index}-${role}`;
  const roles: RoleSet = {
    surface: resolve(ctx, mode, name("surface")),
    accent: resolve(ctx, mode, name("accent")),
    onAccent: resolve(ctx, mode, name("on-accent")),
    label: resolve(ctx, mode, name("label")),
  };
  const step = (role: string) => /-(\d+)\)$/.exec(ctx.palettes[mode][name(role)] ?? "")?.[1] ?? "—";
  const text = Math.min(...TEXTS.map((token) => contrastRatio(resolve(ctx, mode, token), roles.surface)));
  const accentOnSurface = contrastRatio(roles.accent, roles.surface);
  const accentOnPage = Math.min(...PAGE.map((token) => contrastRatio(roles.accent, resolve(ctx, mode, token))));
  const onAccent = contrastRatio(roles.onAccent, roles.accent);
  const label = contrastRatio(roles.label, roles.surface);
  const cards: Reference[] = [
    { value: resolve(ctx, mode, "--proposed-card-green-accent"), names: ["بطاقة الأخضر"] },
    { value: resolve(ctx, mode, "--proposed-card-black-accent"), names: ["بطاقة الأسود"] },
  ];
  return {
    roles,
    steps: { surface: step("surface"), accent: step("accent"), label: step("label") },
    ratios: { text: round(text), accentOnSurface: round(accentOnSurface), accentOnPage: round(accentOnPage), onAccent: round(onAccent), label: round(label) },
    // Compared unrounded: a 2.996 must not pass as "3.00".
    contrastPass: text >= 4.5 && accentOnSurface >= 3 && accentOnPage >= 3 && onAccent >= 4.5 && label >= 4.5,
    nearest: nearest(roles.accent, refs),
    nearestState: nearest(roles.accent, refs.filter(isState)),
    cards: nearest(roles.accent, cards),
  };
};

const paletteReport = (ctx: Context, meta: PaletteMeta): PaletteReport => {
  const refs = { light: references(ctx, "light"), dark: references(ctx, "dark") };
  const colours = meta.families.map((family, i) => ({
    index: i + 1,
    ...family,
    ramp: STEPS.map((s) => ctx.palettes.invariant[`--palette-${meta.key}-${i + 1}-${s}`]),
    light: modeReport(ctx, "light", meta.key, i + 1, refs.light),
    dark: modeReport(ctx, "dark", meta.key, i + 1, refs.dark),
  }));
  const pairs = MODES.flatMap((mode) =>
    colours.flatMap((a, i) =>
      colours.slice(i + 1).map((b) => {
        const n = nearest(a[mode].roles.accent, [{ value: b[mode].roles.accent, names: [] }]);
        return { mode, pair: `${a.index} ↔ ${b.index}`, value: n.value, vision: n.vision };
      }),
    ),
  );
  const least = (pick: (r: ModeReport) => number) => Math.min(...colours.flatMap((c) => MODES.map((mode) => pick(c[mode]))));
  const summary = {
    contrastPass: colours.every((c) => c.light.contrastPass && c.dark.contrastPass),
    amongThemselves: Math.min(...pairs.map((p) => p.value)),
    againstCards: least((r) => r.cards.value),
    againstStates: least((r) => r.nearestState.value),
    againstExisting: least((r) => r.nearest.value),
  };
  return { meta, colours, pairs, summary: { ...summary, worst: Math.min(summary.amongThemselves, summary.againstCards, summary.againstExisting) } };
};

// ---- rendering

const escape = (text: string) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
const MODE_NAMES: Record<Mode, string> = { light: "الفاتح", dark: "الغامق" };
const VISION_NAMES: Record<Vision, string> = { normal: "طبيعية", deutan: "ديوترانوبيا", protan: "بروتانوبيا" };
const verdictWord = (pass: boolean) => (pass ? "يجتاز" : "يسقط");
/** A numeric range inside Arabic text keeps its reading order: "0.09–0.16" must not render as "0.16–0.09". */
const withNumbers = (text: string) => escape(text).replace(/\d[\d.°]*(?:\s*[–-]\s*\d[\d.°]*)+/g, (range) => `<span dir="ltr">${range}</span>`);

const specimen = (kind: Kind, m: Measured) => {
  if (kind === "ground") return `<span class="cr-specimen" style="background:${m.value};color:${m.partnerValue}" aria-hidden="true">نص</span>`;
  if (kind === "text") return `<span class="cr-specimen" style="background:${m.partnerValue};color:${m.value}" aria-hidden="true">نص</span>`;
  return `<span class="cr-specimen" style="background:${m.partnerValue}" aria-hidden="true"><span class="cr-specimen__shape" style="background:${m.value}"></span></span>`;
};

const wing = (ctx: Context, mode: Mode, spec: Spec) => {
  const m = measure(ctx, mode, spec);
  const verdict = spec.min === 0 ? "لا حدّ مطلوب" : verdictWord(m.pass);
  // A corrected token shows what it replaces, measured against the same partner, and the role it is now bound to.
  const built = ctx.built[mode][spec.token];
  const was =
    built !== undefined && built !== m.value
      ? `<span class="cr-was">كان <span dir="ltr">${escape(built)} · ${fixed(contrastRatio(built, m.partnerValue))}:1</span></span>`
      : "";
  const binding = bindingOf(ctx, mode, spec.token);
  return `<div class="cr-wing" data-theme="${mode}" data-pass="${spec.min === 0 ? "exempt" : m.pass}">
    ${specimen(spec.kind, m)}
    <span class="cr-hex" dir="ltr">${escape(m.value)}</span>
    <span class="cr-ratio"><b dir="ltr">${m.ratio.toFixed(2)}:1</b> <span class="cr-verdict">${verdict}${spec.min ? ` · الحد ${spec.min}:1` : ""}</span></span>
    <span class="cr-partner">أضعفه مقابل <span dir="ltr">${escape(m.partner)}</span></span>
    ${binding ? `<span class="cr-binding">مربوط بـ <span dir="ltr">${escape(binding)}</span></span>` : ""}
    ${was}
  </div>`;
};

const STATUS_NAMES: Record<string, string> = { new: "جديد", changed: "قيمة مقترحة", existing: "قائم" };

const listTable = (ctx: Context) =>
  groups(ctx)
    .map(
      (group) => `<section class="cr-group" aria-labelledby="g-${group.id}">
  <header class="cr-group__head"><h3 id="g-${group.id}">${escape(group.title)}</h3><p>${escape(group.basis)}</p></header>
  <div class="cr-spine" role="table" aria-label="${escape(group.title)}">
    <div class="cr-spine__row cr-spine__row--head" role="row">
      <span role="columnheader">الوضع ${MODE_NAMES.light}</span><span role="columnheader">الاسم والدور</span><span role="columnheader">الوضع ${MODE_NAMES.dark}</span>
    </div>
    ${group.rows
      .map((spec) => {
        const status = statusOf(ctx, spec.token);
        return `<div class="cr-spine__row" role="row" data-status="${status}">
      <div role="cell">${wing(ctx, "light", spec)}</div>
      <div role="cell" class="cr-name"><code dir="ltr">${escape(spec.token)}</code><span>${escape(spec.role)}</span><em class="cr-status">${STATUS_NAMES[status]}</em>${spec.note ? `<small>${escape(spec.note)}</small>` : ""}</div>
      <div role="cell">${wing(ctx, "dark", spec)}</div>
    </div>`;
      })
      .join("\n")}
  </div>
</section>`,
    )
    .join("\n");

const GOALS = [
  ["تطوير المواهب الوطنية", "اكتشاف ورعاية المواهب الرياضية الإماراتية وتأهيلها للمنافسة على المستوى الدولي."],
  ["التميز في البطولات الدولية", "تحقيق نتائج متقدمة في البطولات العربية والآسيوية والأولمبية في ألعاب القوى."],
  ["بناء بنية تحتية رياضية", "توفير منشآت ومرافق تدريبية عالمية المستوى لدعم الرياضيين والمدربين."],
  ["تعزيز الحوكمة والشفافية", "تطبيق أعلى معايير الحوكمة والنزاهة في إدارة الاتحاد وعملياته."],
  ["توسيع قاعدة المشاركة", "زيادة عدد الممارسين لرياضات ألعاب القوى على مستوى الدولة وفي جميع الإمارات."],
  ["شراكات استراتيجية فاعلة", "بناء شراكات مع المؤسسات المحلية والدولية لدعم تطوير الرياضة في الإمارات."],
];

const cards = (palette: string) => `<ol class="cr-cards" data-palette="${palette}">
${GOALS.map(
  ([title, text], index) => `  <li class="cr-card" data-series="${index + 1}">
    <span class="cr-card__head"><span class="cr-card__badge" dir="ltr">${String(index + 1).padStart(2, "0")}</span><span class="cr-card__kicker">الهدف الاستراتيجي</span></span>
    <h4 class="cr-card__title">${title}</h4>
    <p class="cr-card__text">${text}</p>
  </li>`,
).join("\n")}
</ol>`;

const stage = (label: string, palette: string, mode: Mode, note = "") => `<div class="cr-stage" data-theme="${mode}">
  <p class="cr-stage__label">${label}</p>
  ${note ? `<p class="cr-stage__note">${note}</p>` : ""}
  ${cards(palette)}
</div>`;

const readableOn = (hex: string) => (contrastRatio("#000000", hex) >= contrastRatio("#FFFFFF", hex) ? "#000000" : "#FFFFFF");

const rampRow = (name: string, detail: string, values: string[], labels: readonly string[], use = "") => `<div class="cr-ramp">
  <p class="cr-ramp__name">${escape(name)} <span dir="ltr">${escape(detail)}</span></p>
  <ol class="cr-ramp__steps" dir="ltr">${values.map((value, i) => `<li style="background:${value};color:${readableOn(value)}"><span>${labels[i]}</span></li>`).join("")}</ol>
  ${use ? `<p class="cr-ramp__use">${use}</p>` : ""}
</div>`;

const nearestCell = (n: Nearest, floor: number) =>
  `<td data-pass="${n.value >= floor}"><b dir="ltr">${fixed(n.value)}</b> ${verdictWord(n.value >= floor)}<small>${escape(n.names.join(" / "))} <span dir="ltr">${n.refValue}</span> · ${VISION_NAMES[n.vision]}</small></td>`;

const ratioLine = (value: number, min: number, label: string) => `<span data-pass="${value >= min}"><b dir="ltr">${value.toFixed(2)}</b> ${label}</span>`;

const paletteSection = (ctx: Context, report: PaletteReport) => {
  const { meta, colours, pairs, summary } = report;
  const floor = ctx.search.floor;
  const figmaWhite = [1, 2, 3, 4, 5, 6].map((i) => contrastRatio("#FFFFFF", ctx.palettes.invariant[`--figma-card-${i}-accent`]));
  const chip = (label: string, value: number) => `<div data-pass="${value >= floor}"><dt>${label}</dt><dd><b dir="ltr">ΔE ${fixed(value)}</b> ${verdictWord(value >= floor)}</dd></div>`;
  const identityRamp = (family: string) => STEPS.map((s) => ctx.built.light[`--color-${family}-${s}`]);
  const weakest = (mode: Mode) => pairs.filter((p) => p.mode === mode).reduce((a, b) => (a.value <= b.value ? a : b));
  return `<section class="cr-block cr-palette" id="palette-${meta.key}" aria-labelledby="palette-${meta.key}-title">
  <header class="cr-palette__head">
    <h2 id="palette-${meta.key}-title">اللوحة ${escape(meta.name)}</h2>
    <p class="cr-lead">${withNumbers(meta.character)}. ${withNumbers(colours.map((c) => `${c.index + 1}. ${c.name}: ${c.why}`).join(" · "))}</p>
    <dl class="cr-verdicts">
      <div data-pass="${summary.contrastPass}"><dt>التباين بأدواره الأربعة، في الوضعين</dt><dd><strong>${verdictWord(summary.contrastPass)}</strong></dd></div>
      ${chip("بين الألوان الأربعة", summary.amongThemselves)}
      ${chip("عن بطاقتي الأخضر والأسود", summary.againstCards)}
      ${chip("عن ألوان الحالات", summary.againstStates)}
      ${chip("عن كل لون قائم", summary.againstExisting)}
    </dl>
  </header>
  <div class="cr-vision-target">
    <div class="cr-ramps">
      <p class="cr-ramps__title">ألوان الهوية</p>
      ${rampRow("أخضر الاتحاد", "Pantone 348 C = 500", identityRamp("green"), STEPS)}
      ${rampRow("أحمر الاتحاد", "Pantone 186 C = 500", identityRamp("red"), STEPS)}
      ${rampRow("أسود الاتحاد، والمحايد الدافئ", "black · neutral-warm", [ctx.built.light["--color-black"], ...["900", "800", "700", "600", "500", "400", "300", "100", "50"].map((s) => ctx.built.light[`--color-neutral-warm-${s}`])], ["black", "900", "800", "700", "600", "500", "400", "300", "100", "50"])}
      <p class="cr-ramps__title">الألوان الأربعة الجديدة</p>
      ${colours
        .map((c) =>
          rampRow(
            `${c.index + 1}. ${c.name}`,
            `${c.hue}° · C ${c.peak}`,
            c.ramp,
            STEPS,
            `الفاتح: أرضية ${c.light.steps.surface} · شارة ${c.light.steps.accent} · نص ${c.light.steps.label} — الغامق: أرضية ${c.dark.steps.surface} · شارة ${c.dark.steps.accent} · نص ${c.dark.steps.label}`,
          ),
        )
        .join("\n")}
    </div>
    <div class="cr-compare">
      ${stage("Figma كما رُسم — فاتح فقط", "figma", "light", `لا إطار غامق لهذه البطاقات في Figma. سطر «الهدف الاستراتيجي» ليس في Figma، ولُوِّن هنا بلون الشارة للمقارنة. الأبيض على الشارات بين ${fixed(Math.min(...figmaWhite))} و${fixed(Math.max(...figmaWhite))}، والحد 4.5.`)}
      ${stage(`اللوحة ${escape(meta.name)} — الوضع الفاتح`, meta.key, "light")}
      ${stage(`اللوحة ${escape(meta.name)} — الوضع الغامق`, meta.key, "dark")}
    </div>
  </div>
  <div class="cr-table-wrap">
    <table class="cr-measure">
      <caption>الألوان الأربعة مقيسةً في كل وضع على أرضياته. ترتيب البطاقة في العمود الأول.</caption>
      <thead><tr><th scope="col">اللون</th><th scope="col">الوضع</th><th scope="col">الأرضية</th><th scope="col">الحافة والشارة</th><th scope="col">نص الشارة</th><th scope="col">نص بلون البند</th><th scope="col">أقرب لون قائم</th><th scope="col">أقرب حالة</th><th scope="col">أقرب بطاقة هوية</th></tr></thead>
      <tbody>
      ${colours
        .flatMap((c) =>
          MODES.map((mode) => {
            const r = c[mode];
            return `<tr>
        ${mode === "light" ? `<th scope="row" rowspan="2">البطاقة ${c.index + 1}<br>${escape(c.name)}</th>` : ""}
        <td>${MODE_NAMES[mode]}</td>
        <td><span dir="ltr">${r.steps.surface} · ${r.roles.surface}</span>${ratioLine(r.ratios.text, 4.5, "أضعف نص")}</td>
        <td><span dir="ltr">${r.steps.accent} · ${r.roles.accent}</span>${ratioLine(r.ratios.accentOnSurface, 3, "مع الأرضية")}${ratioLine(r.ratios.accentOnPage, 3, "مع الصفحة")}</td>
        <td><span dir="ltr">${r.roles.onAccent}</span>${ratioLine(r.ratios.onAccent, 4.5, "على الشارة")}</td>
        <td><span dir="ltr">${r.steps.label} · ${r.roles.label}</span>${ratioLine(r.ratios.label, 4.5, "على الأرضية")}</td>
        ${nearestCell(r.nearest, floor)}
        ${nearestCell(r.nearestState, floor)}
        ${nearestCell(r.cards, floor)}
      </tr>`;
          }),
        )
        .join("\n")}
      </tbody>
    </table>
  </div>
  <p class="cr-pairs">بين الألوان الأربعة، أضعف زوج بترتيب اللوحة: ${MODES.map((mode) => {
    const w = weakest(mode);
    return `في ${MODE_NAMES[mode]} <span dir="ltr">${w.pair}</span> <b dir="ltr">ΔE ${fixed(w.value)}</b> (${VISION_NAMES[w.vision]})`;
  }).join("، و")}.</p>
</section>`;
};

const stripRow = (label: string, worst: number[], floor: number) => {
  const passing = worst.filter((w) => w >= floor).length;
  return `<div class="cr-strip">
    <p class="cr-strip__label">${escape(label)} · <b dir="ltr">${passing}/${worst.length}</b></p>
    <div class="cr-strip__cells" dir="ltr" aria-hidden="true">${worst.map((w) => `<span data-state="${w >= floor ? "pass" : w >= 15 ? "near" : "fail"}"></span>`).join("")}</div>
  </div>`;
};

const verdictSection = (ctx: Context, reports: PaletteReport[]) => {
  const { search } = ctx;
  const normalPassing = search.hueStrips.normal.worst.filter((w) => w >= search.floor).length;
  return `<section class="cr-block" aria-labelledby="verdict-title">
  <h2 id="verdict-title">قبل اللوحات: ما يسمح به القياس</h2>
  <p class="cr-lead">الشروط كما طُلبت لا تقبل أربعة ألوان جديدة معًا. هذا بحث لا تقدير: دائرة الصبغات كلها، بكل إضاءة وتشبّع يحمل نصًا ويقف على الصفحة، مقابل كل لون له دور: ${references(ctx, "light").length} في الفاتح و${references(ctx, "dark").length} في الغامق، ومعها لونا بطاقتي الهوية.</p>
  <ul class="cr-facts">
    <li><b dir="ltr">${search.capacity.rampShaped}</b><span>لون جديد يجتاز كل الشروط إن تبع سلّمه درجات سلالم الهوية: الصبغة ${search.capacity.rampShapedBest.hue}°، أسوأ ΔE ${fixed(search.capacity.rampShapedBest.worst)}.</span></li>
    <li><b dir="ltr">${search.capacity.freeShape}</b><span>لونان على الأكثر بأي شكل للسلّم: ${search.capacity.freeShapePairs} زوجًا تجتاز، وكلها تضم الصبغة ${search.capacity.freeShapeSharedHue}°، فلا يجتمع ثلاثة.</span></li>
    <li><b dir="ltr">0</b><span>مجموعات من أربعة. الشرط الحاكم عمى الألوان: بالرؤية الطبيعية وحدها تجتاز ${normalPassing} صبغة من ${search.hueStrips.normal.worst.length}.</span></li>
  </ul>
  <figure class="cr-strips">
    <figcaption>كل عمود صبغة كل 3°. العمود الممتلئ يجتاز ΔE ${search.floor} عن كل لون قائم في الوضعين، ونصف العمود بين 15 و${search.floor}، والخط دون 15.</figcaption>
    <div class="cr-strip">
      <p class="cr-strip__label">الصبغة</p>
      <div class="cr-strip__cells cr-strip__hues" dir="ltr" aria-hidden="true">${search.hueSwatches.map((hex) => `<span style="background:${hex}"></span>`).join("")}</div>
      <p class="cr-strip__axis" dir="ltr" aria-hidden="true"><span>0°</span><span>90°</span><span>180°</span><span>270°</span><span>360°</span></p>
    </div>
    ${["all", "no-protan", "normal"].map((key) => stripRow(search.hueStrips[key].label, search.hueStrips[key].worst, search.floor)).join("\n")}
  </figure>
  <div class="cr-table-wrap">
    <table class="cr-measure cr-scenarios">
      <caption>الحد ${search.floor} في كل صف. الذي يتغيّر هو ما يُقارَن به اللون الجديد بالرؤى الثلاث. السلالم بدرجات سلالم الهوية.</caption>
      <thead><tr><th scope="col">نطاق المقارنة</th><th scope="col">أقصى عدد من الألوان الجديدة</th><th scope="col">أفضل أربعة: أضعف ΔE · الصبغات</th></tr></thead>
      <tbody>${search.scenarios
        .map((s) => `<tr><th scope="row">${escape(s.label)}</th><td><b dir="ltr">${s.capacity}</b></td><td>${s.bestFour ? `<b dir="ltr">${fixed(s.bestFour.worst)}</b> · <span dir="ltr">${s.bestFour.hues.map((h) => `${h}°`).join(" ")}</span>` : "لا أربعة"}</td></tr>`)
        .join("")}</tbody>
    </table>
  </div>
  <p class="cr-lead">لذلك بُنيت اللوحات الثلاث أدناه بما طُلب: أربع عائلات لكل طابع، واختيرت درجة كل عائلة وتشبّعها بالقياس لتقترب من الشروط كلها. التباين بأدواره الأربعة لم يُتنازل عنه في أي لون. أما ΔE فمعروض كما قيس، بما يسقط منه. الأقرب إلى الشروط: <a href="#palette-${reports.reduce((a, b) => (a.summary.worst >= b.summary.worst ? a : b)).meta.key}">اللوحة ${escape(reports.reduce((a, b) => (a.summary.worst >= b.summary.worst ? a : b)).meta.name)}</a>.</p>
</section>`;
};

const matrixValues = (m: number[][]) => [...m.map((row) => [...row, 0, 0].join(" ")), "0 0 0 1 0"].join(" ");

const html = (ctx: Context, reports: PaletteReport[]) => `<!doctype html>
<html lang="ar" dir="rtl" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>مراجعة الألوان — داخلي</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alexandria:wght@400;600;700;900&family=IBM+Plex+Mono:wght@500;700&display=swap">
<style>
${ctx.css}
</style>
</head>
<body class="cr">
<svg width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute">
  <filter id="cr-deutan" color-interpolation-filters="linearRGB"><feColorMatrix type="matrix" values="${matrixValues(SIMULATION.deutan)}"/></filter>
  <filter id="cr-protan" color-interpolation-filters="linearRGB"><feColorMatrix type="matrix" values="${matrixValues(SIMULATION.protan)}"/></filter>
</svg>
<header class="cr-bar">
  <div class="cr-bar__title"><h1>توسيع اللوحة، وقائمتا الوضعين</h1><p>مراجعة داخلية · ليست صفحة عامة · لا شيء هنا token بعد</p></div>
  <nav class="cr-jump" aria-label="أقسام الصفحة">
    ${reports.map((r) => `<a href="#palette-${r.meta.key}">${escape(r.meta.name)}</a>`).join("")}
    <a href="#lists-title">القائمتان</a>
  </nav>
  <div class="cr-controls">
    <div class="cr-switch" role="group" aria-label="وضع الصفحة والقائمتين">
      <button type="button" data-set-theme="light" aria-pressed="true">فاتح</button>
      <button type="button" data-set-theme="dark" aria-pressed="false">غامق</button>
    </div>
    <div class="cr-switch" role="group" aria-label="محاكاة عمى الألوان على السلالم والبطاقات">
      ${VISIONS.map((vision, index) => `<button type="button" data-set-vision="${vision}" aria-pressed="${index === 0}">${VISION_NAMES[vision]}</button>`).join("")}
    </div>
  </div>
</header>
<main class="cr-main">
  ${verdictSection(ctx, reports)}
  ${reports.map((report) => paletteSection(ctx, report)).join("\n")}
  <section aria-labelledby="lists-title" class="cr-block">
    <h2 id="lists-title">القائمتان جنبًا إلى جنب</h2>
    <p class="cr-lead">لكل لون اسم واحد في المنتصف، وقيمته في كل وضع على جانبه، مقيسةً على الأرضية التي يقع عليها في ذلك الوضع. يُعرض أضعف قياس من أرضياته.</p>
    <nav class="cr-palette-pick" aria-label="اللوحة التي تعرضها ألوان البنود">
      ${reports.map((r) => `<a href="?palette=${r.meta.key}#g-series"${r.meta.key === ctx.palette ? ' aria-current="page"' : ""}>${escape(r.meta.name)}</a>`).join("")}
    </nav>
    ${listTable(ctx)}
  </section>
</main>
<script>
(() => {
  const root = document.documentElement;
  const targets = document.querySelectorAll(".cr-vision-target");
  const press = (attr, value) => document.querySelectorAll("[" + attr + "]").forEach((b) => b.setAttribute("aria-pressed", String(b.getAttribute(attr) === value)));
  document.querySelectorAll("[data-set-theme]").forEach((button) => button.addEventListener("click", () => {
    const value = button.getAttribute("data-set-theme");
    root.setAttribute("data-theme", value);
    press("data-set-theme", value);
  }));
  document.querySelectorAll("[data-set-vision]").forEach((button) => button.addEventListener("click", () => {
    const value = button.getAttribute("data-set-vision");
    targets.forEach((target) => target.setAttribute("data-vision", value));
    press("data-set-vision", value);
  }));
})();
</script>
</body>
</html>`;

export const GET = (request: Request) => {
  if (process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 });
  const loaded = load();
  const reports = loaded.search.palettes.map((meta) => paletteReport(loaded, meta));
  const url = new URL(request.url);
  const requested = url.searchParams.get("palette");
  const closest = reports.reduce((a, b) => (a.summary.worst >= b.summary.worst ? a : b)).meta.key;
  const ctx: Context = { ...loaded, palette: reports.some((r) => r.meta.key === requested) ? (requested as string) : closest };
  const headers = { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" };
  if (url.searchParams.get("format") === "json") {
    const body = {
      palette: ctx.palette,
      groups: groups(ctx).map((group) => ({
        ...group,
        rows: group.rows.map((spec) => ({
          ...spec,
          status: statusOf(ctx, spec.token),
          binding: { light: bindingOf(ctx, "light", spec.token) ?? null, dark: bindingOf(ctx, "dark", spec.token) ?? null },
          light: measure(ctx, "light", spec),
          dark: measure(ctx, "dark", spec),
        })),
      })),
      palettes: reports,
      search: ctx.search,
    };
    return Response.json(body, { headers });
  }
  return new Response(html(ctx, reports), { headers: { ...headers, "Content-Type": "text/html; charset=utf-8" } });
};
