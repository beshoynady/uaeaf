import { expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, sep } from "node:path";

/**
 * No form that carries a credential may be able to submit it as a URL.
 *
 * ── The window this closes ────────────────────────────────────────────────
 *
 * Every form in this application prevents its own default and sends the
 * values itself with `fetch`. That handler is attached by React during
 * hydration, and the server-rendered HTML is interactive *before* hydration
 * finishes — the fields accept typing and the submit button submits. In that
 * window there is no `onSubmit` to call `preventDefault`, so the browser
 * performs the native submission.
 *
 * HTML's default for a `<form>` with no `method` is GET, and its default for
 * one with no `action` is the current URL. So the native submission in that
 * window navigates to `…/login?email=…&password=…`, which writes the
 * password into the address bar, the session history, the server's access
 * log, and the `Referer` header of every subsequent same-origin request the
 * page makes. Measured against the running dashboard on 2026-09-18, that GET
 * is answered `200` — the page renders and keeps the URL.
 *
 * `method="post"` is not a guard that has to be remembered at the moment of
 * submission; it removes the unsafe submission from the machine (CLAUDE.md
 * §31). There is no sequence of events — slow network, failed chunk, JS
 * disabled, submit during hydration — that lets this form put a field value
 * in a URL.
 *
 * ── Why this is a source sweep ────────────────────────────────────────────
 *
 * Each form's own spec mounts it and asserts the rendered element's method,
 * which is the stronger check. This file answers the one question mounting
 * cannot: has a *new* credential form been written somewhere, by someone who
 * did not know this rule. Same division as `design-system/field-standard.spec.tsx`.
 */

const APP_SRC = join(dirname(fileURLToPath(import.meta.url)), "../..");

const sources = () => {
  const out: { file: string; source: string }[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.tsx?$/.test(entry) || /\.spec\.tsx?$/.test(entry)) continue;
      out.push({ file: relative(APP_SRC, full).split(sep).join("/"), source: readFileSync(full, "utf8") });
    }
  };
  walk(APP_SRC);
  return out;
};

/** Comments blanked, so a doc-block that merely discusses a password field
 *  cannot make its file look like one. */
const code = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^[ \t]*\/\/.*$/gm, " ");

/**
 * The text of each `<form …>` opening tag, from `<form` to the `>` that ends
 * it. Deliberately not a regex: a JSX tag's attributes hold arrow functions,
 * so in `onSubmit={(event) => …}` the first `>` in the source belongs to the
 * arrow, and `<form[^>]*>` would read a truncated tag and report a missing
 * `method` on a form that has one — or miss one that does not.
 */
const formTags = (source: string): string[] => {
  const tags: string[] = [];
  for (let start = source.indexOf("<form"); start !== -1; start = source.indexOf("<form", start + 1)) {
    // `<formation …>` is not a form element.
    if (/[A-Za-z0-9_-]/.test(source[start + 5] ?? "")) continue;
    let depth = 0;
    let quote = "";
    for (let i = start + 5; i < source.length; i += 1) {
      const character = source[i];
      if (quote) {
        if (character === quote && source[i - 1] !== "\\") quote = "";
        continue;
      }
      if (character === '"' || character === "'" || character === "`") quote = character;
      else if (character === "{") depth += 1;
      else if (character === "}") depth -= 1;
      else if (character === ">" && depth === 0) {
        tags.push(source.slice(start, i + 1));
        break;
      }
    }
  }
  return tags;
};

/** What makes a form a credential form: a password control, or a field
 *  declaring one of the credential autofill tokens. */
const CARRIES_A_CREDENTIAL =
  /<PasswordInput|type="password"|autoComplete="(?:username|current-password|new-password)"/;

const FILES = sources()
  .map((entry) => ({ ...entry, source: code(entry.source) }))
  .map((entry) => ({ ...entry, tags: formTags(entry.source) }));

it("is actually reading the application's forms", () => {
  // A sweep that silently stops finding files reports green on nothing.
  const withForms = FILES.filter((entry) => entry.tags.length > 0).map((entry) => entry.file);
  expect(FILES.length).toBeGreaterThan(40);
  expect(withForms).toContain("components/auth/login-form.tsx");
  expect(withForms).toContain("components/auth/reset-password-form.tsx");
  expect(withForms).toContain("components/admin/users/create-user-form.tsx");
});

it("reads a whole opening tag, past the arrow functions in its attributes", () => {
  // Guards the scanner above, not the application: `create-user-form` is the
  // file whose `<form>` holds an inline `onSubmit={(event) => …}`, so if the
  // scanner ever regresses to stopping at the first `>`, this fails here
  // rather than quietly passing every rule below on a truncated tag.
  const [tag] = FILES.find((entry) => entry.file === "components/admin/users/create-user-form.tsx")!.tags;
  expect(tag).toContain("onSubmit");
  expect(tag).toContain("className");
  expect(tag.endsWith(">")).toBe(true);
});

it("never leaves a credential form able to submit as a URL", () => {
  const offenders = FILES.filter(
    (entry) => entry.tags.length > 0 && CARRIES_A_CREDENTIAL.test(entry.source),
  )
    .flatMap((entry) => entry.tags.map((tag) => ({ file: entry.file, tag })))
    .filter(({ tag }) => !/\bmethod="post"/.test(tag))
    .map(({ file }) => file);

  expect(offenders).toEqual([]);
});
