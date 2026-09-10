import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render";
import { MediaPicker } from "./media-picker";

/**
 * The picker's upload panel, checked for the two things that broke it.
 *
 * Both were found in a browser rather than in review, and neither surfaces
 * as a type error or a failed render — the editor simply navigated away with
 * every upload field in the query string, saving nothing. These assertions
 * are the reason that cannot happen again quietly.
 */

const IMAGES = [
  { id: "a1", caption: { ar: "صورة", en: "Image" }, url: "https://cdn.example/a1.png" },
];

function renderPicker() {
  return renderWithIntl(
    <MediaPicker
      label="صورة الترويسة"
      value=""
      images={IMAGES}
      canRead
      disabled={false}
      locale="ar"
      onChange={() => {}}
    />,
  );
}

const open = async () => {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "اختر صورة" }));
  return user;
};

describe("MediaPicker upload panel", () => {
  it("renders no form of its own", async () => {
    // The page editor hosting this picker is itself a form, and HTML has no
    // nested forms: the parser drops the inner tag, so a <form> here became
    // part of the editor's own and its button submitted that instead —
    // navigating away with the upload fields as a query string.
    const { container } = renderPicker();
    await open();

    expect(container.querySelector("form")).toBeNull();
  });

  it("gives the upload button an explicit type", async () => {
    // A <button> with no type is a submit button. Inside the editor's form
    // that saves the whole page as a side effect of adding a picture.
    renderPicker();
    await open();

    expect(screen.getByRole("button", { name: "رفع الصورة" }).getAttribute("type")).toBe("button");
  });

  it("requires alternative text in both languages", async () => {
    // WCAG 1.1.1 is an acceptance gate here, and the upload screen is the
    // only moment anyone knows what the picture actually shows.
    renderPicker();
    await open();

    expect(screen.getByLabelText(/النص البديل \(عربي\)/)).toBeTruthy();
    expect(screen.getByLabelText(/النص البديل \(إنجليزي\)/)).toBeTruthy();
  });

  it("accepts only the three formats the API can verify from bytes", async () => {
    renderPicker();
    await open();

    const file = screen.getByLabelText(/الملف/) as HTMLInputElement;
    expect(file.getAttribute("accept")).toBe("image/png,image/jpeg,image/webp");
  });

  it("shows no upload panel until the library is opened", () => {
    // Opening a page to change its wording should not cost a wall of upload
    // fields.
    renderPicker();
    expect(screen.queryByRole("button", { name: "رفع الصورة" })).toBeNull();
  });
});
