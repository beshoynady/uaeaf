import { useRef } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useFocusTrap } from "./use-focus-trap";

/** Two buttons: one plays the trigger the trap should restore to, the other
 *  lives inside the trapped region. `hideTrigger` models the trigger losing
 *  its box while the trap is still active — real-world via a stylesheet rule
 *  (`xl:hidden`), reproduced here with the `hidden` attribute so jsdom's own
 *  `getComputedStyle` resolves it the same way. */
const Harness = ({ active, hideTrigger }: { active: boolean; hideTrigger?: boolean }) => {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, active);
  return (
    <div>
      <button type="button" hidden={hideTrigger}>
        trigger
      </button>
      <div ref={ref}>
        <button type="button">inside</button>
      </div>
    </div>
  );
};

describe("useFocusTrap — restoring focus once the trap deactivates", () => {
  it("restores focus to the trigger when it is still rendered", () => {
    const { rerender } = render(<Harness active={false} />);
    const trigger = screen.getByRole("button", { name: "trigger" });
    trigger.focus();

    rerender(<Harness active />);
    rerender(<Harness active={false} />);

    expect(trigger).toHaveFocus();
  });

  it("skips the restore when the trigger is no longer rendered, leaving focus where the trap left it", () => {
    const { rerender } = render(<Harness active={false} />);
    const trigger = screen.getByRole("button", { name: "trigger" });
    trigger.focus();

    rerender(<Harness active />);
    const inside = screen.getByRole("button", { name: "inside" });
    inside.focus();

    // The trigger disappears while the trap is still active — this is the
    // exact shape of the row breakpoint hiding the drawer's menu button.
    rerender(<Harness active hideTrigger />);
    rerender(<Harness active={false} hideTrigger />);

    expect(trigger).not.toHaveFocus();
    expect(inside).toHaveFocus();
  });
});
