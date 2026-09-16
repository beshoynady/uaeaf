import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render";
import { ToastProvider } from "@/components/ui/toast";
import type { StrategicPlanResponse } from "@/lib/admin/strategic-plan";
import { StrategicPlanEditor } from "./editor";

/**
 * The Strategic Plan screen (ADR-0075) on the two things its save must get
 * right: a changed list goes whole, with every stored `_id` kept and
 * `displayOrder` renumbered, and nothing else goes with it; and the screen
 * offers no control over section order or section visibility, because the
 * page rules guard the composition and an editor cannot be asked to.
 */

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

afterEach(() => {
  vi.unstubAllGlobals();
});

/** The save answers 200; the version panel's own read is refused, which costs
 *  the panel and not the form. */
const stubFetch = () => {
  const mock = vi.fn(async (_url: string, init?: RequestInit) =>
    init?.method === "PATCH" ? new Response("{}", { status: 200 }) : new Response("{}", { status: 503 }),
  );
  vi.stubGlobal("fetch", mock);
  return mock;
};

const text = (value: string) => ({ ar: value, en: value });

const FIRST_PILLAR = { _id: "6aa5001000000000000000p1", title: text("المحور الأول"), description: text("وصف"), displayOrder: 1, isVisible: true };
const SECOND_PILLAR = { _id: "6aa5001000000000000000p2", title: text("المحور الثاني"), description: text("وصف"), displayOrder: 2, isVisible: true };
const STEP = { _id: "6aa5001000000000000000s1", title: text("الخطوة"), description: null, displayOrder: 1, isVisible: true };

const RECORD: StrategicPlanResponse = {
  _id: "6aa5001000000000000000c1",
  heroImageId: null,
  heroTitle: text("الخطة الاستراتيجية"),
  heroSubtitle: text("العنوان الفرعي"),
  introHeading: text("خارطة طريق"),
  introText: text("نص"),
  introImageId: null,
  phasesTitle: null,
  phases: [{ _id: "6aa5001000000000000000h1", title: text("التأسيس"), description: text("وصف"), iconKey: "layers", displayOrder: 1, isVisible: true }],
  pillarsTitle: text("المحاور"),
  pillarsText: null,
  pillars: [FIRST_PILLAR, SECOND_PILLAR],
  objectivesTitle: text("الأهداف"),
  objectivesImageId: null,
  objectives: [],
  metricsTitle: text("المؤشرات"),
  metricsImageId: null,
  metrics: [{ _id: "6aa5001000000000000000m1", value: "2030", label: text("الأفق"), displayOrder: 1, isVisible: true }],
  executionTitle: text("مسار التنفيذ"),
  executionText: null,
  executionSteps: [STEP],
  ctaTitle: text("الدعوة"),
  ctaText: null,
  ctaImageId: null,
  seo: null,
  publicationState: "Live",
  createdAt: "2026-09-15T08:00:00.000Z",
  updatedAt: "2026-09-15T08:00:00.000Z",
};

const mount = () =>
  renderWithIntl(
    <ToastProvider>
      <StrategicPlanEditor record={RECORD} images={[]} canEdit canReadMedia={false} locale="ar" editorial={null} />
    </ToastProvider>,
  );

const save = async () => userEvent.click(screen.getByRole("button", { name: "حفظ المسودة" }));

const patchBody = async (requests: ReturnType<typeof stubFetch>) => {
  await waitFor(() => expect(requests.mock.calls.some(([, init]) => init?.method === "PATCH")).toBe(true));
  const [, init] = requests.mock.calls.find(([, call]) => call?.method === "PATCH")!;
  return JSON.parse(String(init?.body)) as Record<string, unknown>;
};

const pillar = (number: number, total = 2) => screen.getByRole("group", { name: `المحور ${number} من ${total}` });

/** The save bar's own status line: after a save the success toast is a
 *  second `status` on the screen. */
const saveStatus = () => screen.getAllByRole("status").find((node) => node.hasAttribute("data-dirty"))!;

describe("StrategicPlanEditor", () => {
  it("draws the nine sections in the order the page prints them", () => {
    stubFetch();
    mount();

    expect(screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual([
      "الواجهة",
      "النظرة العامة",
      "مراحل الخطة",
      "المحاور",
      "الأهداف",
      "المؤشرات",
      "مسار التنفيذ",
      "الدعوة",
      "البحث والمشاركة",
    ]);
  });

  it("starts clean, with nothing to save", () => {
    stubFetch();
    mount();

    expect(screen.getByRole("status")).toHaveTextContent("كل التغييرات محفوظة");
    expect(screen.getByRole("button", { name: "حفظ المسودة" })).toBeDisabled();
  });

  // A generous budget: computing an accessible name for every control on a
  // nine-section form is slow under jsdom, and slower on a loaded machine.
  it("offers no control over section order or section visibility", () => {
    stubFetch();
    mount();

    // A text input cannot reorder or hide a section, so only the roles a
    // control of that kind could have are swept.
    const forbidden = /ترتيب الأقسام|ترتيب القسم|إخفاء القسم|section order|hide section|hide this section/i;
    for (const role of ["button", "checkbox", "combobox", "switch", "radio"]) {
      expect(screen.queryAllByRole(role, { name: forbidden })).toEqual([]);
    }
    // The only checkboxes on the screen are the per-item visibility boxes.
    for (const box of screen.getAllByRole("checkbox")) {
      expect(box).toHaveAccessibleName("ظاهر على الصفحة");
    }
  }, 20000);

  it("sends only the changed list, whole, with every _id kept and displayOrder renumbered", async () => {
    const requests = stubFetch();
    mount();

    await userEvent.click(within(pillar(1)).getByRole("button", { name: "تحريك لأسفل" }));
    await save();

    expect(await patchBody(requests)).toEqual({
      pillars: [
        { ...SECOND_PILLAR, displayOrder: 1 },
        { ...FIRST_PILLAR, displayOrder: 2 },
      ],
    });
  });

  it("sends a new pillar without an _id, after the stored ones", async () => {
    const requests = stubFetch();
    mount();

    await userEvent.click(screen.getByRole("button", { name: "إضافة محور" }));
    await userEvent.type(within(pillar(3, 3)).getByLabelText("العنوان — بالعربية"), "الثالث");
    await save();

    const body = await patchBody(requests);
    expect(Object.keys(body)).toEqual(["pillars"]);
    const pillars = body.pillars as Record<string, unknown>[];
    expect(pillars).toHaveLength(3);
    expect(pillars[0]).toEqual(FIRST_PILLAR);
    expect(pillars[1]).toEqual(SECOND_PILLAR);
    expect("_id" in pillars[2]).toBe(false);
    expect(pillars[2]).toMatchObject({ title: { ar: "الثالث", en: "" }, displayOrder: 3, isVisible: true });
  }, 20000);

  // Two steps: the last visible item cannot be hidden (ADR-0075), so hiding
  // one of two is the case a save carries.
  it("sends a hidden step with isVisible false and its blank description as null", async () => {
    const requests = stubFetch();
    const SECOND_STEP = { ...STEP, _id: "6aa5001000000000000000s2", title: text("الخطوة الثانية"), displayOrder: 2 };
    renderWithIntl(
      <ToastProvider>
        <StrategicPlanEditor
          record={{ ...RECORD, executionSteps: [STEP, SECOND_STEP] }}
          images={[]}
          canEdit
          canReadMedia={false}
          locale="ar"
          editorial={null}
        />
      </ToastProvider>,
    );

    const step = screen.getByRole("group", { name: "الخطوة 1 من 2" });
    await userEvent.click(within(step).getByRole("checkbox", { name: "ظاهر على الصفحة" }));
    await save();

    expect(await patchBody(requests)).toEqual({
      executionSteps: [{ ...STEP, isVisible: false }, SECOND_STEP],
    });
  }, 20000);

  // After a save the page re-reads the record, and a new item comes back with
  // the id the API gave it. The form takes that record as its baseline, or it
  // stays "unsaved" and the next save sends the item without its id again —
  // and the API gives it another one.
  it("takes the saved record as its baseline, so a new item's id from the server leaves the form clean", async () => {
    const requests = stubFetch();
    const view = mount();

    await userEvent.click(screen.getByRole("button", { name: "إضافة محور" }));
    await userEvent.type(within(pillar(3, 3)).getByLabelText("العنوان — بالعربية"), "الثالث");
    await save();
    await patchBody(requests);

    const saved: StrategicPlanResponse = {
      ...RECORD,
      pillars: [
        FIRST_PILLAR,
        SECOND_PILLAR,
        { _id: "6aa5001000000000000000p3", title: { ar: "الثالث", en: "" }, description: text(""), displayOrder: 3, isVisible: true },
      ],
      updatedAt: "2026-09-15T09:00:00.000Z",
    };
    view.rerender(
      <ToastProvider>
        <StrategicPlanEditor record={saved} images={[]} canEdit canReadMedia={false} locale="ar" editorial={null} />
      </ToastProvider>,
    );

    await waitFor(() => expect(saveStatus()).toHaveTextContent("كل التغييرات محفوظة"));
    expect(screen.getByRole("button", { name: "حفظ المسودة" })).toBeDisabled();
  }, 20000);

  // CLAUDE.md §31: what is typed while the save is in flight is not part of
  // that save, so the record that comes back must not overwrite it.
  it("keeps an edit typed after the save was sent when the saved record arrives", async () => {
    const requests = stubFetch();
    const view = mount();

    await userEvent.click(within(pillar(1)).getByRole("button", { name: "تحريك لأسفل" }));
    await save();
    await patchBody(requests);
    await userEvent.type(screen.getByLabelText("عنوان المحاور — بالإنجليزية"), "!");

    const saved: StrategicPlanResponse = {
      ...RECORD,
      pillars: [
        { ...SECOND_PILLAR, displayOrder: 1 },
        { ...FIRST_PILLAR, displayOrder: 2 },
      ],
      updatedAt: "2026-09-15T09:00:00.000Z",
    };
    view.rerender(
      <ToastProvider>
        <StrategicPlanEditor record={saved} images={[]} canEdit canReadMedia={false} locale="ar" editorial={null} />
      </ToastProvider>,
    );

    await waitFor(() => expect(screen.getByLabelText("عنوان المحاور — بالإنجليزية")).toHaveValue("المحاور!"));
    // The move was saved and comes back in the record; only the title is left to save.
    await waitFor(() => expect(saveStatus()).toHaveTextContent("تغييرات غير محفوظة"));
    expect(within(pillar(1)).getByLabelText("العنوان — بالعربية")).toHaveValue("المحور الثاني");
  }, 20000);

  it("sends an edited scalar on its own, without any list", async () => {
    const requests = stubFetch();
    mount();

    await userEvent.type(screen.getByLabelText("عنوان المحاور — بالإنجليزية"), "!");
    await save();

    expect(await patchBody(requests)).toEqual({ pillarsTitle: { ar: "المحاور", en: "المحاور!" } });
  }, 20000);
});
