import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/render";
import { TextField } from "./text-field";

describe("TextField direction", () => {
  it("forces LTR by default", () => {
    // An email address and a password are LTR strings whatever the page
    // language is. Rendering them RTL puts the caret and the punctuation in
    // the wrong place inside an otherwise correct Arabic layout.
    renderWithIntl(<TextField id="email" label="Email" type="email" />);

    expect(screen.getByLabelText("Email")).toHaveAttribute("dir", "ltr");
  });

  it("follows the page when asked to", () => {
    // An Arabic personal name is not an LTR string. Forcing LTR on it would
    // reverse the reading order of the field the administrator is typing
    // their colleague's name into.
    renderWithIntl(<TextField id="name-ar" label="الاسم" dir="rtl" />);

    expect(screen.getByLabelText("الاسم")).toHaveAttribute("dir", "rtl");
  });

  it("can be left to inherit", () => {
    renderWithIntl(<TextField id="name" label="Name" dir="auto" />);

    expect(screen.getByLabelText("Name")).toHaveAttribute("dir", "auto");
  });
});
