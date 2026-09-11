import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/render";
import { TextField } from "@/components/auth/text-field";
import { SelectField } from "@/components/ui/select-field";

/**
 * One field, both applications — and the two halves of §F.4 that must never
 * travel alone.
 *
 * ── Why some of these render and some read source ─────────────────────────
 *
 * A source-text guard answers "is the right string present". That is the
 * weaker question, and it has already passed on a live defect here: the
 * public form's placeholder option carried `hidden`, which is spelled
 * correctly, reads correctly, and makes Chrome select the first *real* option
 * instead — a required question silently pre-answered. Nothing caught it
 * because nothing rendered it.
 *
 * So anything about *behaviour* is asserted by mounting the component, and
 * source scanning is kept for the one question rendering cannot answer: has a
 * control been written somewhere these components do not cover.
 */

const APP_SRC = join(dirname(fileURLToPath(import.meta.url)), "../..");

function sources(): { file: string; source: string }[] {
  const out: { file: string; source: string }[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.tsx?$/.test(entry) || /\.spec\.tsx?$/.test(entry)) continue;
      out.push({
        file: relative(APP_SRC, full).replace(/\\/g, "/"),
        source: readFileSync(full, "utf8"),
      });
    }
  };
  walk(APP_SRC);
  return out;
}

/** Block and line comments blanked, so a rule that scans for a declaration
 *  cannot be tripped by a doc-block that merely names one — `interactive.ts`
 *  discusses `<select>` at length and declares none. */
const code = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^[ 	]*\/\/.*$/gm, " ");

const FILES = sources().map((entry) => ({ ...entry, source: code(entry.source) }));

/** Guard the guard: a walker that silently stops finding files reports green
 *  on nothing, which is the failure mode that makes every other number here
 *  worthless. These four must always be in the sweep. */
it("is actually reading the application", () => {
  const names = FILES.map((entry) => entry.file);
  expect(names).toContain("components/auth/text-field.tsx");
  expect(names).toContain("components/ui/select-field.tsx");
  expect(names).toContain("components/admin/pages/media-picker.tsx");
  expect(names).toContain("components/admin/users/user-directory.tsx");
  expect(FILES.length).toBeGreaterThan(40);
});

describe("§F.4 — the glyph and the attribute travel together", () => {
  // Outside the `<label>`, inside `.field-label` — see `FieldLabel`. A glyph
  // found *inside* a `<label>` is the defect this selector exists to notice.
  const glyphs = (root: HTMLElement) => root.querySelectorAll(".field-label > span[aria-hidden]");

  it("marks a required text field both ways, from one prop", () => {
    const { container } = renderWithIntl(<TextField id="a" label="البريد" required />);
    expect(glyphs(container)).toHaveLength(1);
    expect(container.querySelector("input")?.getAttribute("aria-required")).toBe("true");
  });

  it("marks an optional text field neither way", () => {
    const { container } = renderWithIntl(<TextField id="a" label="البريد" />);
    expect(glyphs(container)).toHaveLength(0);
    expect(container.querySelector("input")?.getAttribute("aria-required")).toBeNull();
  });

  it("marks a required select both ways, from the same prop", () => {
    const { container } = renderWithIntl(
      <SelectField id="b" label="الحالة" required options={[{ value: "x", label: "س" }]} />,
    );
    expect(glyphs(container)).toHaveLength(1);
    expect(container.querySelector("select")?.getAttribute("aria-required")).toBe("true");
  });

  it("marks an optional select neither way", () => {
    const { container } = renderWithIntl(
      <SelectField id="b" label="الحالة" options={[{ value: "x", label: "س" }]} />,
    );
    expect(glyphs(container)).toHaveLength(0);
    expect(container.querySelector("select")?.getAttribute("aria-required")).toBeNull();
  });

  it("never puts the marker inside the label element", () => {
    // `<label>` holds the field's name and nothing else. Inside, the glyph
    // joined `label.textContent`, the field's name became "البريد *", and
    // forty-two tests that asked for a field by its name stopped finding it.
    const { container } = renderWithIntl(<TextField id="a" label="البريد" required />);
    expect(container.querySelector("label")?.textContent).toBe("البريد");
  });

  it("keeps the glyph out of the field's accessible name", () => {
    // The attribute is the half a screen reader is meant to hear. Left
    // exposed, the glyph joins the name and one requirement is announced
    // twice — "email star, required".
    renderWithIntl(<TextField id="a" label="البريد الإلكتروني" required />);
    expect(screen.getByRole("textbox", { name: "البريد الإلكتروني" })).toBeInTheDocument();
  });

  it("explains the glyph once per form and never per field", () => {
    // Every form that can show a glyph renders `RequiredHint`; a form that
    // shows the glyph without it states a convention it never explains.
    const offenders = FILES.filter(
      (entry) =>
        /<form[\s>]/.test(entry.source) &&
        /\brequired[\s\n=/>]/.test(entry.source) &&
        !entry.source.includes("<RequiredHint"),
    ).map((entry) => entry.file);
    expect(offenders).toEqual([]);
  });
});

describe("the select is not a visual exception (ADR-0067 §D6)", () => {
  it("rests with no answer when it is given a placeholder", () => {
    const { container } = renderWithIntl(
      <SelectField
        id="c"
        label="النوع"
        placeholder
        required
        options={[
          { value: "one", label: "١" },
          { value: "two", label: "٢" },
        ]}
      />,
    );
    const select = container.querySelector("select") as HTMLSelectElement;
    expect(select.value).toBe("");
  });

  it("leaves the empty option plain, so the reset rule can land on it", () => {
    // Both obvious markers are traps, and this control has now been fixed
    // twice for them. `hidden` is `display: none`; `disabled` is skipped by
    // name — the HTML Standard's "ask for a reset" selects the first option
    // in tree order *that is not disabled*. Either one hands a required
    // field a real answer nobody gave it.
    const { container } = renderWithIntl(
      <SelectField id="c" label="النوع" placeholder options={[{ value: "one", label: "١" }]} />,
    );
    const first = (container.querySelector("select") as HTMLSelectElement).options[0];
    expect(first.value).toBe("");
    expect(first.disabled).toBe(false);
    expect(first.hidden).toBe(false);
    expect(first.dataset.placeholder).toBeDefined();
  });

  it("floats its label immediately when it already has an answer", () => {
    // A filter or a status has no unanswered state, so it gets no
    // placeholder — and `forms.css` reads exactly that: no *disabled* empty
    // option is checked, therefore the field is answered, therefore the label
    // belongs on the border rather than on top of the word it would cover.
    const { container } = renderWithIntl(
      <SelectField
        id="d"
        label="الحالة"
        value="all"
        onChange={() => {}}
        options={[{ value: "all", label: "الكل" }]}
      />,
    );
    const select = container.querySelector("select") as HTMLSelectElement;
    expect(select.querySelector("option[data-placeholder]")).toBeNull();
    expect(select.value).toBe("all");
  });
});

describe("one input pattern, not two", () => {
  /** Where a raw control is the component that *defines* the pattern, or a
   *  control the pattern does not cover — a checkbox is not a field. */
  const DEFINES_THE_PATTERN = new Set([
    "components/auth/text-field.tsx",
    "components/ui/select-field.tsx",
    "components/ui/search-field.tsx",
    "components/admin/bilingual-field.tsx",
    "components/admin/pages/media-picker.tsx",
  ]);

  it("declares every select through SelectField", () => {
    const offenders = FILES.filter(
      (entry) => /<select[\s>]/.test(entry.source) && !DEFINES_THE_PATTERN.has(entry.file),
    ).map((entry) => entry.file);
    expect(offenders).toEqual([]);
  });

  it("declares every text entry through TextField", () => {
    const offenders = FILES.filter((entry) => {
      if (DEFINES_THE_PATTERN.has(entry.file)) return false;
      return [...entry.source.matchAll(/<input\b[^>]*>/gs)].some(
        (match) => !/type=\{?["']?(checkbox|radio)/.test(match[0]),
      );
    }).map((entry) => entry.file);
    expect(offenders).toEqual([]);
  });

  it("never sets a field's height by hand", () => {
    // `--space-12` is the control height *and* the distance the label
    // travels; `forms.css` derives one from the other so they cannot drift.
    // A hand-set `h-10` breaks both at once — it put three of this
    // dashboard's five selects under WCAG 2.5.8's 44px floor and would have
    // landed their labels short of the border.
    // Every quoted run of class names, wherever it is written — a `className`
    // attribute, a `const` recipe in `interactive.ts`, a ternary branch. The
    // first draft of this rule matched `className=` only, and `FIELD_BOX` is
    // a `const`: it stayed green through a deliberately broken build. A rule
    // that cannot be made to fail is not a rule.
    const offenders: string[] = [];
    for (const entry of FILES) {
      for (const [, body] of entry.source.matchAll(/[`"']([^`"'\n]*)[`"']/g)) {
        if (!/\bfield-control\b|\bfield-shell\b/.test(body)) continue;
        if (/(^|[\s:])h-\d+(\.\d+)?(\s|$)/.test(body)) {
          offenders.push(`${entry.file}: ${body.slice(0, 70)}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
