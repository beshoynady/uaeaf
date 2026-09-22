import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render";
import { ToastProvider } from "@/components/ui/toast";
import { PageEditor } from "./page-editor";
import { findStaticPage } from "@/lib/admin/static-pages";
import type { MediaAssetOption } from "./media-picker";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

afterEach(() => {
  vi.unstubAllGlobals();
});

const stubFetch = (response: Response) => {
  const mock = vi.fn(async (_url: string, _init: RequestInit) => response);
  vi.stubGlobal("fetch", mock);
  return mock;
};

const ok = () => new Response("{}", { status: 200 });

const IMAGES: MediaAssetOption[] = [
  { id: "f".repeat(24), caption: { ar: "صورة الملعب", en: "Track photo" }, url: "https://cdn.test/a.jpg" },
];

const news = findStaticPage("news")!;
const contact = findStaticPage("contact-us")!;

const render = (over: Partial<React.ComponentProps<typeof PageEditor>> = {}) =>
  renderWithIntl(
    // The provider comes from the `(app)` layout in production; the form is
    // rendered here on its own, so the harness supplies it.
    <ToastProvider>
      <PageEditor page={news} record={null} images={IMAGES} canEdit locale="ar" {...over} />
    </ToastProvider>,
  );

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

  /**
   * This form writes to a live public page with no review step — its own
   * success message says so ("يظهر على الموقع العام فورًا"). A save with
   * nothing to save is therefore not harmless: it restamps a published page
   * on a stray press. The Reset button beside it already refuses when the
   * form is clean; the one that publishes did not.
   */
  it("does not offer to save a page nothing has changed on", async () => {
    const fetchMock = stubFetch(ok());
    const user = userEvent.setup();
    render({
      record: { heroTitle: { ar: "الأخبار", en: "News" }, heroSubtitle: { ar: "آخر", en: "Latest" } },
    });

    expect(screen.getByRole("button", { name: "حفظ الصفحة" })).toBeDisabled();

    await user.type(screen.getByLabelText("عنوان الترويسة — بالعربية"), "!");
    expect(screen.getByRole("button", { name: "حفظ الصفحة" })).toBeEnabled();
    expect(fetchMock).not.toHaveBeenCalled();
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

  /**
   * The result of an action is announced once, in the region the whole shell
   * shares (ADR-0016). Kept in the form as well, it would be said twice to a
   * screen reader for one save — and it would still be sitting there,
   * reading as current, after the next three edits.
   */
  it("announces a save in the toast region and nowhere else", async () => {
    stubFetch(ok());
    const user = userEvent.setup();
    render({
      record: { heroTitle: { ar: "الأخبار", en: "News" }, heroSubtitle: { ar: "آخر", en: "Latest" } },
    });

    await user.type(screen.getByLabelText("عنوان الترويسة — بالعربية"), "!");
    await user.click(screen.getByRole("button", { name: "حفظ الصفحة" }));

    const region = await screen.findByRole("region", { name: "إشعارات الإجراءات" });
    expect(await within(region).findByText("حُفظت الصفحة")).toBeInTheDocument();
    expect(screen.getAllByText("حُفظت الصفحة")).toHaveLength(1);
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
      <ToastProvider>
        <PageEditor page={contact} record={null} images={IMAGES} canEdit locale="ar" />
      </ToastProvider>,
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
      <ToastProvider>
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
        />
      </ToastProvider>,
    );

    await user.type(screen.getByLabelText("المدينة"), "أبوظبي");
    await user.click(screen.getByRole("button", { name: "حفظ الصفحة" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.address).toEqual({ city: "أبوظبي" });
    expect(body.email).toBe("info@uaeaf.ae");
  });

  describe("a social link's own icon", () => {
    const record = (socialLinks: unknown[]) => ({
      heroTitle: { ar: "اتصل بنا", en: "Contact us" },
      heroSubtitle: { ar: "نحن هنا", en: "We are here" },
      email: "info@uaeaf.ae",
      socialLinks,
    });

    const renderContact = (socialLinks: unknown[]) =>
      renderWithIntl(
        <ToastProvider>
          <PageEditor page={contact} record={record(socialLinks)} images={IMAGES} canEdit locale="ar" />
        </ToastProvider>,
      );

    const savedLinks = async (fetchMock: ReturnType<typeof stubFetch>) => {
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      return JSON.parse(fetchMock.mock.calls[0][1].body as string).socialLinks;
    };

    it("offers each link an icon and saves the one chosen", async () => {
      const fetchMock = stubFetch(ok());
      const user = userEvent.setup();
      renderContact([{ platform: "Instagram", url: "https://instagram.com/uaeaf" }]);

      const icon = screen.getByRole("group", { name: "الأيقونة" });
      await user.click(within(icon).getByRole("button", { name: "اختر صورة" }));
      await user.click(within(icon).getByRole("button", { name: /صورة الملعب/ }));
      await user.click(screen.getByRole("button", { name: "حفظ الصفحة" }));

      expect(await savedLinks(fetchMock)).toEqual([
        { platform: "Instagram", url: "https://instagram.com/uaeaf", iconId: "f".repeat(24) },
      ]);
    });

    it("keeps a stored icon through a save that changed something else", async () => {
      const fetchMock = stubFetch(ok());
      const user = userEvent.setup();
      renderContact([{ platform: "Instagram", url: "https://instagram.com/uaeaf", iconId: "f".repeat(24) }]);

      // Read into the form, or the next save would quietly drop it.
      await user.type(screen.getByLabelText("المدينة"), "أبوظبي");
      await user.click(screen.getByRole("button", { name: "حفظ الصفحة" }));

      expect(await savedLinks(fetchMock)).toEqual([
        { platform: "Instagram", url: "https://instagram.com/uaeaf", iconId: "f".repeat(24) },
      ]);
    });

    it("goes back to the built-in icon when the chosen one is removed", async () => {
      const fetchMock = stubFetch(ok());
      const user = userEvent.setup();
      renderContact([{ platform: "Instagram", url: "https://instagram.com/uaeaf", iconId: "f".repeat(24) }]);

      const icon = screen.getByRole("group", { name: "الأيقونة" });
      await user.click(within(icon).getByRole("button", { name: "بلا صورة" }));
      await user.click(screen.getByRole("button", { name: "حفظ الصفحة" }));

      // The form sends its state as it stands; the route handler's
      // `readPageBody` drops the empty icon before the API sees it
      // (`static-pages.spec.ts`), and the API stores it as none.
      expect(await savedLinks(fetchMock)).toEqual([
        { platform: "Instagram", url: "https://instagram.com/uaeaf", iconId: "" },
      ]);
    });

    it("uploads a new icon as an icon, not as a page image", async () => {
      // Held to the page floor (200px), a 128px icon was refused; the icon
      // purpose is what lets the API apply its own floor (88px).
      const fetchMock = stubFetch(
        Response.json({ _id: "n1", caption: { ar: "", en: "" }, file: { url: "https://cdn.test/n1.png" } }, { status: 201 }),
      );
      const user = userEvent.setup();
      renderContact([{ platform: "Instagram", url: "https://instagram.com/uaeaf" }]);

      const icon = screen.getByRole("group", { name: "الأيقونة" });
      await user.click(within(icon).getByRole("button", { name: "اختر صورة" }));
      await user.upload(within(icon).getByLabelText(/الملف/), new File([new Uint8Array([1])], "icon.png", { type: "image/png" }));
      await user.type(within(icon).getByLabelText(/النص البديل \(عربي\)/), "إنستغرام");
      await user.type(within(icon).getByLabelText(/النص البديل \(إنجليزي\)/), "Instagram");
      await user.click(within(icon).getByRole("button", { name: "رفع الصورة" }));

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/media-assets/upload?purpose=icon");
    });
  });
});

describe("PageEditor — the contact map's coordinates (owner request 2026-09-22)", () => {
  const renderMap = (map: Record<string, unknown>) =>
    renderWithIntl(
      <ToastProvider>
        <PageEditor
          page={contact}
          record={{
            heroTitle: { ar: "اتصل بنا", en: "Contact us" },
            heroSubtitle: { ar: "نحن هنا", en: "We are here" },
            email: "info@uaeaf.ae",
            map,
          }}
          images={IMAGES}
          canEdit
          locale="ar"
        />
      </ToastProvider>,
    );

  it("offers the map's coordinates, filled from the record, and no map picture", () => {
    renderMap({ latitude: 25.286069, longitude: 55.3642228 });

    const group = screen.getByRole("group", { name: "إحداثيات الخريطة" });
    expect(within(group).getByLabelText("خط العرض")).toHaveValue("25.286069");
    expect(within(group).getByLabelText("خط الطول")).toHaveValue("55.3642228");
    expect(screen.queryByRole("group", { name: "صورة الخريطة" })).toBeNull();
  });

  it("sends the coordinates as the editor typed them", async () => {
    // As typed: the route handler's `readPageBody` turns them into numbers
    // and refuses a pair that is not one (`static-pages.spec.ts`).
    const fetchMock = stubFetch(ok());
    const user = userEvent.setup();
    renderMap({});

    const group = screen.getByRole("group", { name: "إحداثيات الخريطة" });
    await user.type(within(group).getByLabelText("خط العرض"), "25.286069");
    await user.type(within(group).getByLabelText("خط الطول"), "55.3642228");
    await user.click(screen.getByRole("button", { name: "حفظ الصفحة" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)["map.coordinates"]).toEqual({
      latitude: "25.286069",
      longitude: "55.3642228",
    });
  });
});
