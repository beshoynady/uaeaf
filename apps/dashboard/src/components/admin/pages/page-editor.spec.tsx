import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render";
import { PageEditor } from "./page-editor";
import { findStaticPage } from "@/lib/admin/static-pages";
import type { MediaAssetOption } from "./media-picker";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(response: Response) {
  const mock = vi.fn(async (_url: string, _init: RequestInit) => response);
  vi.stubGlobal("fetch", mock);
  return mock;
}

const ok = () => new Response("{}", { status: 200 });

const IMAGES: MediaAssetOption[] = [
  { id: "f".repeat(24), caption: { ar: "صورة الملعب", en: "Track photo" }, url: "https://cdn.test/a.jpg" },
];

const news = findStaticPage("news")!;
const contact = findStaticPage("contact-us")!;

function render(over: Partial<React.ComponentProps<typeof PageEditor>> = {}) {
  return renderWithIntl(
    <PageEditor
      page={news}
      record={null}
      images={IMAGES}
      canEdit
      locale="ar"
      {...over}
    />,
  );
}

describe("PageEditor", () => {
  it("renders only the fields the page declares", () => {
    render();

    expect(screen.getByLabelText("عنوان الترويسة — بالعربية")).toBeInTheDocument();
    expect(screen.getByLabelText("العنوان الفرعي — بالإنجليزية")).toBeInTheDocument();
    // `introHeading` belongs to the committees page, not this one. Sending it
    // would fail the whole save upstream on `forbidNonWhitelisted`.
    expect(screen.queryByLabelText("عنوان التمهيد — بالعربية")).not.toBeInTheDocument();
  });

  it("starts from the stored record", () => {
    render({
      record: {
        heroTitle: { ar: "الأخبار", en: "News" },
        heroSubtitle: { ar: "آخر ما لدينا", en: "The latest" },
      },
    });

    expect(screen.getByLabelText("عنوان الترويسة — بالعربية")).toHaveValue("الأخبار");
    expect(screen.getByLabelText("العنوان الفرعي — بالإنجليزية")).toHaveValue("The latest");
  });

  it("refuses to save a required field filled in only one language", async () => {
    const fetchMock = stubFetch(ok());
    const user = userEvent.setup();
    render();

    await user.type(screen.getByLabelText("عنوان الترويسة — بالعربية"), "الأخبار");
    await user.type(screen.getByLabelText("العنوان الفرعي — بالعربية"), "آخر ما لدينا");
    await user.type(screen.getByLabelText("العنوان الفرعي — بالإنجليزية"), "The latest");
    await user.click(screen.getByRole("button", { name: "حفظ الصفحة" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(await screen.findByText(/أكمل الحقول المطلوبة/)).toBeInTheDocument();
  });

  it("upserts the page at its own route", async () => {
    const fetchMock = stubFetch(ok());
    const user = userEvent.setup();
    render();

    await user.type(screen.getByLabelText("عنوان الترويسة — بالعربية"), "الأخبار");
    await user.type(screen.getByLabelText("عنوان الترويسة — بالإنجليزية"), "News");
    await user.type(screen.getByLabelText("العنوان الفرعي — بالعربية"), "آخر ما لدينا");
    await user.type(screen.getByLabelText("العنوان الفرعي — بالإنجليزية"), "The latest");
    await user.click(screen.getByRole("button", { name: "حفظ الصفحة" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/admin/pages/news");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body as string)).toEqual({
      heroTitle: { ar: "الأخبار", en: "News" },
      heroSubtitle: { ar: "آخر ما لدينا", en: "The latest" },
      heroImageId: "",
    });
  });

  it("says nothing has changed until something does", async () => {
    const user = userEvent.setup();
    render({
      record: {
        heroTitle: { ar: "الأخبار", en: "News" },
        heroSubtitle: { ar: "آخر", en: "Latest" },
      },
    });

    expect(screen.getByText("لا تغييرات غير محفوظة")).toBeInTheDocument();
    await user.type(screen.getByLabelText("عنوان الترويسة — بالعربية"), "!");
    expect(await screen.findByText("تغييرات غير محفوظة")).toBeInTheDocument();
  });

  it("shows the content but no controls without the update grant", () => {
    render({
      canEdit: false,
      record: { heroTitle: { ar: "الأخبار", en: "News" }, heroSubtitle: { ar: "آخر", en: "Latest" } },
    });

    expect(screen.getByLabelText("عنوان الترويسة — بالعربية")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "حفظ الصفحة" })).not.toBeInTheDocument();
    expect(screen.getByText(/يحتاج صلاحية تحديثها/)).toBeInTheDocument();
  });

  it("reports the API's own refusal", async () => {
    stubFetch(new Response(JSON.stringify({ code: "forbidden" }), { status: 403 }));
    const user = userEvent.setup();
    render({
      record: { heroTitle: { ar: "الأخبار", en: "News" }, heroSubtitle: { ar: "آخر", en: "Latest" } },
    });

    await user.type(screen.getByLabelText("عنوان الترويسة — بالعربية"), "!");
    await user.click(screen.getByRole("button", { name: "حفظ الصفحة" }));

    expect(await screen.findByText(/لا تملك الصلاحية/)).toBeInTheDocument();
  });
});

describe("PageEditor — the contact page's repeatable rows", () => {
  it("adds and removes a phone number", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <PageEditor page={contact} record={null} images={IMAGES} canEdit locale="ar" />,
    );

    // Scoped to the phone group: the contact page has two repeatable lists
    // and both say the same thing while empty.
    const phones = screen.getByRole("group", { name: "أرقام الهاتف" });
    expect(within(phones).getByText("لا صفوف بعد.")).toBeInTheDocument();

    await user.click(within(phones).getByRole("button", { name: "أضف رقمًا" }));
    expect(within(phones).getByLabelText("الرقم")).toBeInTheDocument();

    await user.click(within(phones).getByRole("button", { name: "احذف هذا الصف" }));
    expect(within(phones).getByText("لا صفوف بعد.")).toBeInTheDocument();
  });

  it("sends the address parts that were filled in", async () => {
    const fetchMock = stubFetch(ok());
    const user = userEvent.setup();
    renderWithIntl(
      <PageEditor
        page={contact}
        record={{
          heroTitle: { ar: "اتصل بنا", en: "Contact us" },
          heroSubtitle: { ar: "نحن هنا", en: "We are here" },
          email: "info@uaeaf.ae",
        }}
        images={IMAGES}
        canEdit
        locale="ar"
      />,
    );

    await user.type(screen.getByLabelText("المدينة"), "أبوظبي");
    await user.click(screen.getByRole("button", { name: "حفظ الصفحة" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.address).toEqual({ city: "أبوظبي" });
    expect(body.email).toBe("info@uaeaf.ae");
  });
});
