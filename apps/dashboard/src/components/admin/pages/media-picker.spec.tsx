import { afterEach, describe, expect, it, vi } from "vitest";
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

const renderPicker = (purpose?: "icon") =>
  renderWithIntl(
    <MediaPicker
      label="صورة الترويسة"
      value=""
      images={IMAGES}
      canRead
      disabled={false}
      locale="ar"
      purpose={purpose}
      onChange={() => {}}
    />,
  );

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

/**
 * ADR-0086 D4: a logo drawn above half its source is a blurred logo, so the
 * editor is told when the file they chose is too small for the largest place
 * it will be drawn. It is a notice, never a refusal — a federation that only
 * has a small file still has to be able to publish, and a warning that stops
 * the work gets worked around.
 */
describe("MediaPicker resolution notice", () => {
  const withSize = (width: number, height: number) => [
    { id: "a1", caption: { ar: "صورة", en: "Image" }, url: "https://cdn.example/a1.png", width, height },
  ];

  const renderChosen = (images: readonly { id: string; caption: { ar: string; en: string }; url: string; width?: number; height?: number }[]) =>
    renderWithIntl(
      <MediaPicker
        label="الشعار"
        value="a1"
        images={images}
        canRead
        disabled={false}
        locale="ar"
        minSourcePx={240}
        onChange={() => {}}
      />,
    );

  it("says what the file has and what the largest place needs, when it is too small", () => {
    renderChosen(withSize(180, 180));

    const notice = screen.getByRole("note");
    expect(notice).toHaveTextContent("180");
    expect(notice).toHaveTextContent("240");
  });

  it("stays quiet when the file is large enough", () => {
    renderChosen(withSize(480, 240));

    expect(screen.queryByRole("note")).toBeNull();
  });

  it("stays quiet when the record carries no measurement to judge", () => {
    renderChosen([{ id: "a1", caption: { ar: "صورة", en: "Image" }, url: "https://cdn.example/a1.png" }]);

    expect(screen.queryByRole("note")).toBeNull();
  });

  it("never blocks the choice: the picker still offers to change it", () => {
    renderChosen(withSize(180, 180));

    expect(screen.getByRole("button", { name: "اختر صورة" })).toBeEnabled();
  });
});

/**
 * A social channel's icon is held to the icon floor (88px) rather than the
 * page-image floor (200px), and only the API knows either number: the
 * picker says what the picture is for and nothing more.
 */
describe("MediaPicker purpose (owner request 2026-09-22)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const uploadedTo = async (purpose?: "icon") => {
    const fetchSpy = vi.fn(async () =>
      Response.json(
        { _id: "n1", caption: { ar: "أيقونة", en: "Icon" }, file: { url: "https://cdn.example/n1.png" } },
        { status: 201 },
      ),
    );
    vi.stubGlobal("fetch", fetchSpy);
    renderPicker(purpose);
    const user = await open();

    await user.upload(screen.getByLabelText(/الملف/), new File([new Uint8Array([1])], "icon.png", { type: "image/png" }));
    await user.type(screen.getByLabelText(/النص البديل \(عربي\)/), "أيقونة");
    await user.type(screen.getByLabelText(/النص البديل \(إنجليزي\)/), "Icon");
    await user.click(screen.getByRole("button", { name: "رفع الصورة" }));

    return (fetchSpy.mock.calls[0] as unknown[] | undefined)?.[0];
  };

  it("uploads an icon under the icon purpose", async () => {
    expect(await uploadedTo("icon")).toBe("/api/admin/media-assets/upload?purpose=icon");
  });

  it("uploads anything else as a page image", async () => {
    expect(await uploadedTo()).toBe("/api/admin/media-assets/upload");
  });
});
