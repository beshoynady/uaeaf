import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { navigation } from "@/test/next-navigation";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render";
import { ToastProvider } from "@/components/ui/toast";
import { VALUE_ICON_KEYS } from "@/lib/icons/value-icons";
import type { VisionMissionResponse } from "@/lib/admin/vision-mission";
import { VisionMissionEditor } from "./editor";

/**
 * A strategic goal carries one of the twelve icon keys, as a core value does
 * (owner decision 2026-09-15), so the goals list offers the same icon control
 * the values list does.
 */

// `EditorShell` reads the selected tab from the URL and writes it back, so a
// screen on the shell needs `useSearchParams` and `replace` as well as
// `refresh` (ADR-0102 §D1). The three come from one helper.
vi.mock("next/navigation", () => import("@/test/next-navigation"));

beforeEach(() => {
  // The mocked router holds the URL in module state, so a test that opened a
  // tab would otherwise leave the next one on it.
  navigation.reset();
});


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

const FIRST_GOAL = { title: text("الهدف الأول"), description: text("وصف"), iconKey: "star", displayOrder: 1 };
const SECOND_GOAL = { title: text("الهدف الثاني"), description: text("وصف"), iconKey: "trophy", displayOrder: 2 };

const RECORD: VisionMissionResponse = {
  _id: "6aa5001000000000000000c1",
  heroImageId: null,
  heroTitle: text("الرؤية والرسالة"),
  heroSubtitle: text("العنوان الفرعي"),
  visionTitle: null,
  visionText: text("الرؤية"),
  visionImageId: null,
  missionTitle: null,
  missionText: text("الرسالة"),
  missionImageId: null,
  goalsTitle: null,
  strategicGoals: [FIRST_GOAL, SECOND_GOAL],
  coreValues: [{ title: text("التميز"), description: text("وصف"), iconKey: "award", displayOrder: 1 }],
  valuesImageId: null,
  ctaImageId: null,
  seo: null,
  publicationState: "Live",
  createdAt: "2026-09-14T08:00:00.000Z",
  updatedAt: "2026-09-14T08:00:00.000Z",
};

const mount = () =>
  renderWithIntl(
    <ToastProvider>
      <VisionMissionEditor record={RECORD} images={[]} canEdit canPublish={false} canReadMedia={false} locale="ar" editorial={null} />
    </ToastProvider>,
  );

/** Each goal row's icon control, told apart from the values' by the id its
 *  list gives it. */
const goalIcons = () =>
  screen
    .getAllByRole("combobox", { name: "الأيقونة" })
    .filter((select): select is HTMLSelectElement => select.id.startsWith("goal-"));

describe("VisionMissionEditor — strategic goals", () => {
  it("offers an icon for every goal, starting from the one stored", () => {
    stubFetch();
    mount();

    expect(goalIcons().map((select) => select.value)).toEqual(["star", "trophy"]);
  });

  it("starts a new goal on a real icon key, since the API requires one", async () => {
    stubFetch();
    mount();

    await userEvent.click(screen.getByRole("button", { name: "إضافة هدف" }));

    expect(goalIcons()).toHaveLength(3);
    expect(goalIcons()[2].value).toBe(VALUE_ICON_KEYS[0]);
  });

  it("saves the icon an editor picks for a goal", async () => {
    const requests = stubFetch();
    mount();

    await userEvent.selectOptions(goalIcons()[0], "flag");
    await userEvent.click(screen.getByRole("button", { name: "حفظ المسودة" }));

    await waitFor(() => expect(requests.mock.calls.some(([, init]) => init?.method === "PATCH")).toBe(true));
    const [, init] = requests.mock.calls.find(([, call]) => call?.method === "PATCH")!;
    expect(JSON.parse(String(init?.body))).toEqual({
      strategicGoals: [{ ...FIRST_GOAL, iconKey: "flag" }, SECOND_GOAL],
    });
  });
});
