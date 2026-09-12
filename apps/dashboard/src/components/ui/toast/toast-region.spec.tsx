import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render";
import { ToastProvider, useToast } from "./toast-provider";
import type { ToastSpec } from "./toast-store";

/**
 * The region, rendered against the real message catalogue — so a missing
 * translation key fails here rather than reaching a screen as its own name.
 */

/** A page with one button per message the test wants raised. */
function Harness({ specs }: { specs: ToastSpec[] }) {
  const toast = useToast();
  return (
    <div>
      {specs.map((spec, index) => (
        <button
          key={spec.title + String(index)}
          type="button"
          onClick={() => {
            toast.show(spec);
          }}
        >
          {`raise ${String(index)}`}
        </button>
      ))}
    </div>
  );
}

function renderRegion(specs: ToastSpec[], locale: "ar" | "en" = "ar") {
  return renderWithIntl(
    <ToastProvider>
      <Harness specs={specs} />
    </ToastProvider>,
    locale,
  );
}

const saved: ToastSpec = { tone: "success", title: "حُفظت المسودة", source: "api" };
const failed: ToastSpec = { tone: "error", title: "تعذّر الحفظ", source: "api" };

describe("ToastRegion", () => {
  it("is present before any message arrives, so the first one is announced", () => {
    renderRegion([]);

    expect(screen.getByRole("region", { name: "إشعارات الإجراءات" })).toBeInTheDocument();
  });

  it("shows a raised message", async () => {
    const user = userEvent.setup();
    renderRegion([saved]);

    await user.click(screen.getByRole("button", { name: "raise 0" }));

    expect(screen.getByText("حُفظت المسودة")).toBeInTheDocument();
  });

  // FB.7: the two are announced with the urgency they have.
  it("announces an error assertively and everything else politely", async () => {
    const user = userEvent.setup();
    renderRegion([saved, failed]);

    await user.click(screen.getByRole("button", { name: "raise 0" }));
    await user.click(screen.getByRole("button", { name: "raise 1" }));

    expect(within(screen.getByRole("status")).getByText("حُفظت المسودة")).toBeInTheDocument();
    expect(within(screen.getByRole("alert")).getByText("تعذّر الحفظ")).toBeInTheDocument();
  });

  // Chapter 6 §6.2: an icon distinguishes the tones for a sighted reader, and
  // this text distinguishes them for everyone else.
  it("states the tone in words, not only in colour", async () => {
    const user = userEvent.setup();
    renderRegion([failed]);

    await user.click(screen.getByRole("button", { name: "raise 0" }));

    expect(within(screen.getByRole("alert")).getByText(/خطأ/)).toBeInTheDocument();
  });

  it("dismisses on the close button", async () => {
    const user = userEvent.setup();
    renderRegion([saved]);
    await user.click(screen.getByRole("button", { name: "raise 0" }));

    await user.click(screen.getByRole("button", { name: "إغلاق الإشعار" }));

    expect(screen.queryByText("حُفظت المسودة")).not.toBeInTheDocument();
  });

  // FB.16: eight identical failures are one message with a counter.
  it("counts a repeat instead of stacking it", async () => {
    const user = userEvent.setup();
    renderRegion([{ ...failed, dedupeKey: "save-failed" }]);

    await user.click(screen.getByRole("button", { name: "raise 0" }));
    await user.click(screen.getByRole("button", { name: "raise 0" }));

    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getByText("(×2)")).toBeInTheDocument();
  });

  // FB.6: the fourth message waits, and the reader is told it is waiting
  // rather than left to wonder whether it was lost.
  it("shows three and says how many are waiting", async () => {
    const user = userEvent.setup();
    renderRegion([
      { ...saved, title: "واحد" },
      { ...saved, title: "اثنان" },
      { ...saved, title: "ثلاثة" },
      { ...saved, title: "أربعة" },
    ]);

    for (const index of [0, 1, 2, 3]) {
      await user.click(screen.getByRole("button", { name: `raise ${String(index)}` }));
    }

    expect(screen.getAllByRole("status")).toHaveLength(3);
    expect(screen.queryByText("أربعة")).not.toBeInTheDocument();
    expect(screen.getByText("رسالة واحدة في الانتظار")).toBeInTheDocument();
  });

  it("reads in English too", async () => {
    const user = userEvent.setup();
    renderRegion([saved], "en");

    await user.click(screen.getByRole("button", { name: "raise 0" }));

    expect(screen.getByRole("region", { name: "Action notifications" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dismiss notification" })).toBeInTheDocument();
  });
});

describe("useToast outside a provider", () => {
  // A toast that silently goes nowhere leaves a screen looking as though it
  // saved and said nothing.
  it("refuses rather than doing nothing", () => {
    expect(() => renderWithIntl(<Harness specs={[saved]} />)).toThrow(/ToastProvider/);
  });
});
