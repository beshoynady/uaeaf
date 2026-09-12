import { PENDING_CONTENT_MARKER } from '../modules/workflow/publishing/pending-content.js';

/**
 * The approved copy for the first President's Message record.
 *
 * Every string here is transcribed verbatim from
 * `docs/design-specs/page-president-message.md` §3, which is the approved
 * source for this page's words. `president-message-content.spec.ts` re-reads
 * that document on every test run and compares the two character for
 * character, so this file cannot drift from the copy it claims to carry.
 *
 * Three things the client has not supplied are marked pending rather than
 * invented (ADR-0069 D5, owner decision Q16):
 *
 * - The English pull-quote. Two different translations exist in the Figma
 *   frames (PM-D04) and neither has been declared canonical, so the
 *   desktop one is stored as a candidate behind the marker.
 * - The clause English ¶5 drops (PM-D10).
 * - The master portrait. That one is an absent `featuredImageId`, which the
 *   marker cannot express — a missing image is not a string. The editor
 *   surfaces it; the publish guard does not.
 *
 * The H1 is NOT the Figma frames' "رئيس الاتحاد"/"Chairman's Message":
 * IA §8.1 rules the label is "كلمة الرئيس"/"President's Message", and a
 * higher source wins (CLAUDE.md §1).
 */

type TextNode = { type: 'text'; text: string; marks?: { type: string }[] };

const plain = (text: string): TextNode => ({ type: 'text', text });
const bold = (text: string): TextNode => ({ type: 'text', text, marks: [{ type: 'bold' }] });
const paragraph = (content: TextNode[]) => ({ type: 'paragraph', content });
const doc = (content: ReturnType<typeof paragraph>[]) => ({ type: 'doc', content });

/** The Arabic body: five paragraphs, each opening with a bold lead-in word. */
const ARABIC_BODY = doc([
    paragraph([bold("يتبنّى"), plain(" اتحاد الإمارات لألعاب القوى منظومة متكاملة ترسخ تمكين جميع لاعبي ولاعبات منتخباتنا الوطنية المختلفة بأفضل الممارسات لاكتشاف مواهبهم وتطوير قدراتهم وصقل تجاربهم، لإثراء الواقع الخاص بهذه اللعبة، لتحقيق نتائج واعدة تستشرف مستقبلها لرفع رايات دولتنا الغالية في منصات التتويج العالمية.")]),
    paragraph([bold("نسعى"), plain(" لترسيخ البرامج الاستراتيجية الداعمة لاستدامة التطور وجودة البرامج، لتحقيق المنجزات الوطنية في المنافسات الخارجية، بما يتماشى مع رؤية مجلس الإدارة التطويرية، لبلوغ الأهداف المرجوة و الغايات المنشودة حتى تستعيد \"أم الألعاب\" موقعها الذي يمكنها من العبور إلى آفاق المستقبل بالإرادة والمثابرة والتحدي.")]),
    paragraph([bold("لطالما"), plain(" حرصنا على تشارك الرؤى مع الأندية انطلاقاً من رغبتنا في إرساء القيم الداعمة لنهضة اللعبة، والعمل على تصميم برامج طموحة حتى نمضي قدماً في العمل معاً على تعزيز الجهود المرتبطة بالتطور الذي يكرّس ريادة البرامج وبناء خطط مستدامة وفق منظومة متكاملة، وبرامج متنوعة وتعاون بناء وإيجابي بين الجميع.")]),
    paragraph([bold("ندرك"), plain(" جيداً أن التحديات التي تواجهنا للوصول إلى المنجزات الوطنية يجب أن تمثل دافعاً لنا جميعاً حتى نرتقي بأهدافنا إلى مستوى تطلعاتنا، ونعمل معاً على رسم خريطة نستشعر من خلالها قدرتنا على الوفاء بكل المتطلبات التي نعول عليها للوصول إلى المخرجات التي تجسد الصورة المشرفة عن هذه اللعبة.")]),
    paragraph([bold("فخورون"), plain(" بالتفاعل الكبير والتجاوب اللافت من الأندية والفئات المجتمعية والمؤسسات الوطنية مع البرامج التي تم الإعلان عنها في الفترة الماضية، لاسيما على مستوى المسابقات المختلفة، ونؤكد أن أبوابنا مفتوحة لإثراء اللعبة بكل ما يمكن أن يعزز تطورها ورفعتها، انطلاقاً من مسؤوليتنا الوطنية التي ننطلق عبرها بثقة كبيرة في قدرة \"أم الألعاب\" على عكس الصورة المشرفة عن دولة الإمارات في المحافل الخارجية.")]),
]);

/** The English body: the same five paragraphs, with no bold lead-ins —
 *  the approved English copy does not carry them, and adding them would be
 *  a design decision made by a transcription. */
const ENGLISH_BODY = doc([
    paragraph([plain("The UAE Athletics Federation adopts an integrated system that consolidates the empowerment of all male and female players of our various national teams with the best practices to discover their talents, develop their capabilities and refine their experiences, to enrich the reality of this game, to achieve promising results that look forward to its future, to raise the flags of our dear country on the international podiums.")]),
    paragraph([plain("We seek to consolidate strategic programs that support the sustainability of development and the quality of programs, to achieve national achievements in external competitions, in line with the developmental vision of the Board of Directors, to achieve the desired goals and objectives so that the \"mother of games\" can regain its position that enables it to cross into future horizons with will, perseverance and challenge.")]),
    paragraph([plain("We have always been keen to share visions with clubs based on our desire to establish values that support the renaissance of the game, and to work on designing ambitious programs in order to move forward in working together to enhance efforts related to development that devote leadership to programs and build sustainable plans according to an integrated system, diverse programs and constructive and positive cooperation between everyone.")]),
    paragraph([plain("We are well aware that the challenges we face in order to reach the national achievements must be a motive for all of us in order to raise our goals to the level of our aspirations, and we work together to draw a map through which we feel our ability to fulfill all the requirements that we count on to reach the outputs that embody the honorable image of this game.")]),
    // ¶5 omits a clause the Arabic carries (PM-D10). The approved English
    // is stored verbatim and the gap is marked, so the page cannot publish
    // until the client supplies the missing translation.
    paragraph([plain("We are proud of the great interaction and remarkable response of clubs, community groups and national institutions to the programs that were announced in the last period, especially at the level of various competitions, and of the ability of the \"Mother of Games\" to reflect the honorable image of the UAE in foreign forums." + ` ${PENDING_CONTENT_MARKER}`)]),
]);

export const PRESIDENT_MESSAGE_CONTENT = {
  heroTitle: { ar: 'كلمة الرئيس', en: "President's Message" },
  heroSubtitle: {
    ar: 'كلمة رئيس اتحاد الإمارات لألعاب القوى',
    en: 'President of the UAE Athletics Federation',
  },
  signatoryName: {
    ar: 'سعادة اللواء الدكتور محمد عبدالله المر',
    en: 'Dr. Muhammad Abdullah Al-Murr',
  },
  signatoryTitle: { ar: 'رئيس الاتحاد', en: 'President' },
  pullQuote: {
    ar: '«نعمل على بناء منظومة متكاملة لرفع مستوى ألعاب القوى في الإمارات، من خلال برامج استكشاف المواهب وتطوير الكوادر التدريبية والرياضية، لرفع راية دولتنا عالياً في المحافل العالمية.»',
    // Candidate only — the EN desktop frame's wording. The EN mobile frame
    // carries a different translation and neither is canonical (PM-D04).
    en: `${PENDING_CONTENT_MARKER} "We are working to build an integrated system to raise the level of athletics in the UAE, through talent discovery programs, training cadre development, and athletic development, to raise our country's flag high in international forums."`,
  },
  valuesTitle: { ar: 'قيمنا وتوجهاتنا', en: 'Our Values & Direction' },
  values: [
    {
      iconKey: 'eye',
      title: { ar: 'الرؤية', en: 'Vision' },
      description: {
        ar: 'استشراف مستقبل ألعاب القوى ورفع راية الإمارات عالياً',
        en: 'Envisioning the future of athletics and raising the UAE flag high',
      },
      displayOrder: 1,
    },
    {
      iconKey: 'users',
      title: { ar: 'التعاون', en: 'Cooperation' },
      description: {
        ar: 'الشراكة البناءة مع الأندية والمؤسسات الوطنية لتحقيق الأهداف',
        en: 'Building constructive partnerships with clubs and national institutions to achieve our goals',
      },
      displayOrder: 2,
    },
    {
      iconKey: 'star',
      title: { ar: 'القيادة', en: 'Leadership' },
      description: {
        ar: 'قيادة فاعلة وملهمة تدفع نحو الريادة والتميز الرياضي',
        en: 'Effective, inspiring leadership driving sporting excellence and pioneering achievement',
      },
      displayOrder: 3,
    },
    {
      iconKey: 'award',
      title: { ar: 'التميز', en: 'Excellence' },
      description: {
        ar: 'السعي نحو الإنجاز وتحقيق أعلى المستويات في المنافسات',
        en: 'Striving for achievement and reaching the highest levels of competition',
      },
      displayOrder: 4,
    },
    {
      iconKey: 'zap',
      title: { ar: 'الابتكار', en: 'Innovation' },
      description: {
        ar: 'تبني الأساليب الحديثة لتطوير قدرات الرياضيين وبرامج الاتحاد',
        en: "Embracing modern methods to develop athletes' capabilities and federation programs",
      },
      displayOrder: 5,
    },
  ],
  messageBody: { ar: ARABIC_BODY, en: ENGLISH_BODY },
} as const;
