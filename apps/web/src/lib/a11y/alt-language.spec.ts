import { altLanguageProblem } from "./alt-language";

/**
 * Page rule 6's automated half: an alternative text is written in the language
 * it is declared in (ADR-0085 D3.4).
 *
 * The rule's text is unchanged — "each field in its own language; a proper noun
 * as its record writes it". What changed is that the check reads `lang`: a
 * sponsor whose only name is English is named in English on the Arabic page,
 * inside an element that says `lang="en"`. The negative cases are the owner's
 * condition for the change: a foreign text that does not declare its language,
 * or declares the wrong one, still fails.
 */
describe("altLanguageProblem", () => {
  describe("with no declared language, the page's language governs", () => {
    it("accepts Arabic on the Arabic page and English on the English page", () => {
      expect(altLanguageProblem({ alt: "مضمار أحمر عند الغروب", lang: null, pageLocale: "ar" })).toBeNull();
      expect(altLanguageProblem({ alt: "A red track at dusk", lang: null, pageLocale: "en" })).toBeNull();
    });

    it("fails an English alt on the Arabic page that declares no language", () => {
      expect(altLanguageProblem({ alt: "Ultimate Power Solution", lang: null, pageLocale: "ar" })).toMatch(/Arabic/);
    });

    it("fails an Arabic alt on the English page that declares no language", () => {
      expect(altLanguageProblem({ alt: "شعار الاتحاد", lang: null, pageLocale: "en" })).toMatch(/English/);
    });

    it("treats a lang equal to the page's own language as no exception", () => {
      expect(altLanguageProblem({ alt: "Ultimate Power Solution", lang: "ar", pageLocale: "ar" })).toMatch(/Arabic/);
    });
  });

  describe("with a declared language, that language governs", () => {
    it("accepts an English name on the Arabic page inside lang=\"en\"", () => {
      expect(altLanguageProblem({ alt: "Ultimate Power Solution", lang: "en", pageLocale: "ar" })).toBeNull();
    });

    it("accepts an Arabic name on the English page inside lang=\"ar\"", () => {
      expect(altLanguageProblem({ alt: "مؤسسة الرمال الذهبية", lang: "ar", pageLocale: "en" })).toBeNull();
    });

    it("reads a regional subtag as its language", () => {
      expect(altLanguageProblem({ alt: "Ultimate Power Solution", lang: "en-GB", pageLocale: "ar" })).toBeNull();
    });

    it("fails an Arabic text that declares lang=\"en\"", () => {
      expect(altLanguageProblem({ alt: "شعار الراعي", lang: "en", pageLocale: "ar" })).toMatch(/English/);
    });

    it("fails an English text that declares lang=\"ar\" on the English page", () => {
      expect(altLanguageProblem({ alt: "Sponsor logo", lang: "ar", pageLocale: "en" })).toMatch(/Arabic/);
    });

    it("fails a language this site does not publish in", () => {
      expect(altLanguageProblem({ alt: "Logo du sponsor", lang: "fr", pageLocale: "ar" })).toMatch(/lang="fr"/);
    });
  });

  it("fails an empty alt, whatever it declares", () => {
    expect(altLanguageProblem({ alt: "  ", lang: "en", pageLocale: "ar" })).toMatch(/alternative text/);
  });
});
