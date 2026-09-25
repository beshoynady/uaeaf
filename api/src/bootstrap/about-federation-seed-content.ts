/**
 * The approved first content of the About page (owner brief, 2026-09-25 §14-ب).
 *
 * Transcribed, not composed: every Arabic string is the federation's own
 * wording as the owner supplied it. The English is a draft translation the
 * owner has flagged for human review before the page is switched on — which is
 * one of the reasons the page is seeded switched off.
 *
 * Every picture is left empty. The owner uploads them from the dashboard, and
 * an empty slot prints an identity-coloured surface rather than a broken
 * image, so the page is coherent before a single photograph exists.
 *
 * `**text**` inside a paragraph is emphasis. It is not HTML and is never
 * parsed as HTML — see the page's own renderer.
 */

const text = (ar: string, en: string) => ({ ar, en });

export const ABOUT_SEED = {
  hiddenSections: [],

  hero: {
    eyebrow: text('منذ أبريل 1974', 'Since April 1974'),
    title: text('نبذة عن الاتحاد', 'About the Federation'),
    description: text(
      'أكثر من نصف قرن من رعاية ألعاب القوى في دولة الإمارات — من جمعية أُشهرت بمرسوم من المغفور له الشيخ زايد بن سلطان آل نهيان، إلى اتحاد وطني عضو في المنظومتين الدولية والآسيوية.',
      'More than half a century of nurturing athletics in the UAE — from an association established by decree of the late Sheikh Zayed bin Sultan Al Nahyan to a national federation that is a member of both the global and Asian governing bodies.',
    ),
    imageId: null,
  },

  facts: {
    items: [
      {
        value: '1974',
        badge: text('أبريل', 'April'),
        label: text('إشهار جمعية الإمارات لألعاب القوى', 'UAE Athletics Association established'),
        tone: 'green',
        displayOrder: 1,
      },
      {
        value: '1976',
        badge: text('15 يناير', '15 January'),
        label: text('تأسيس الاتحاد وإشهاره', 'Federation founded and proclaimed'),
        tone: 'black',
        displayOrder: 2,
      },
      {
        value: '1976',
        badge: text('عضوية دولية', 'Global membership'),
        label: text('الانضمام إلى الاتحاد الدولي', 'Joined World Athletics'),
        tone: 'red',
        displayOrder: 3,
      },
      {
        value: '1977',
        badge: text('عضوية قارية', 'Continental membership'),
        label: text('الانضمام إلى الاتحاد الآسيوي', 'Joined the Asian Athletics Association'),
        tone: 'tri',
        displayOrder: 4,
      },
    ],
  },

  story: {
    eyebrow: text('البدايات · من جمعية إلى اتحاد', 'The beginnings · From association to federation'),
    title: text(
      'مسيرة بدأت بمرسوم، وتواصلت برؤية وطنية',
      'A journey that began with a decree and continued with a national vision',
    ),
    paragraphs: [
      text(
        'صدر مرسوم من المغفور له بإذن الله الشيخ زايد بن سلطان آل نهيان، طيّب الله ثراه، بإشهار **جمعية الإمارات لألعاب القوى** اعتبارًا من شهر **أبريل 1974م**، وتولّى رئاستها الأولى سعادة أحمد عبدالله الخرجي.',
        'A decree issued by the late Sheikh Zayed bin Sultan Al Nahyan established the **UAE Athletics Association** as of **April 1974**, with H.E. Ahmed Abdullah Al Kharji as its first president.',
      ),
      text(
        'وفي **يناير 1976م** تأسّس الاتحاد، وأُشهر رسميًا في **15 يناير 1976م**، لينضم في العام نفسه إلى **الاتحاد الدولي لألعاب القوى**، ثم إلى الاتحاد الآسيوي لألعاب القوى في عام **1977م**.',
        'In **January 1976** the Federation was founded and officially proclaimed on **15 January 1976**, joining **World Athletics** that same year and the Asian Athletics Association in **1977**.',
      ),
    ],
    imageId: null,
    docCard: {
      label: text('وثيقة التأسيس', 'Founding document'),
      title: text(
        'مرسوم إشهار جمعية الإمارات لألعاب القوى',
        'Decree establishing the UAE Athletics Association',
      ),
      date: text('أبريل 1974م', 'April 1974'),
    },
  },

  timeline: {
    eyebrow: text('سنوات التأسيس · 1974–1977', 'The founding years · 1974–1977'),
    title: text('محطات صنعت تاريخ الاتحاد', 'Milestones that shaped the Federation'),
    description: text(
      'من إشهار الجمعية إلى العضوية الدولية والقارية — المحطات الموثّقة في سنوات التأسيس.',
      'From the Association’s establishment to global and continental membership — the documented milestones of the founding years.',
    ),
    items: [
      {
        datePrecision: 'monthYear',
        year: 1974,
        month: 4,
        day: null,
        category: 'association',
        title: text(
          'مرسوم إشهار جمعية الإمارات لألعاب القوى',
          'Decree establishing the UAE Athletics Association',
        ),
        description: text(
          'صدر مرسوم من المغفور له الشيخ زايد بن سلطان آل نهيان، رحمه الله، بإشهار الجمعية اعتبارًا من أبريل 1974م.',
          'A decree by the late Sheikh Zayed bin Sultan Al Nahyan established the Association as of April 1974.',
        ),
        featured: false,
        imageId: null,
        displayOrder: 1,
      },
      {
        datePrecision: 'year',
        year: 1974,
        month: null,
        day: null,
        category: 'firstLeadership',
        title: text('أول رئيس للجمعية', 'The Association’s first president'),
        description: text(
          'تولّى سعادة أحمد عبدالله الخرجي رئاسة جمعية الإمارات لألعاب القوى في مرحلتها التأسيسية.',
          'H.E. Ahmed Abdullah Al Kharji led the Association through its founding phase.',
        ),
        featured: false,
        imageId: null,
        displayOrder: 2,
      },
      {
        // The federation documented this participation but never confirmed its
        // year. `unknown` withholds it from the page until someone can; the
        // alternative is printing a date nobody stands behind.
        datePrecision: 'unknown',
        year: null,
        month: null,
        day: null,
        category: 'firstParticipation',
        title: text('بطولة الخليج — البصرة', 'Gulf Championship — Basra'),
        description: text(
          'أول مشاركة خارجية للجمعية، ومثّلها السيد علي حميد عضو مجلس إدارة الجمعية.',
          'The Association’s first external participation, represented by board member Mr. Ali Humaid.',
        ),
        featured: false,
        imageId: null,
        displayOrder: 3,
      },
      {
        datePrecision: 'monthYear',
        year: 1976,
        month: 1,
        day: null,
        category: 'federation',
        title: text('تأسيس اتحاد الإمارات لألعاب القوى', 'Founding of the UAE Athletics Federation'),
        description: text(
          'تأسّس الاتحاد في يناير 1976م، وأُشهر رسميًا بتاريخ 15/01/1976م.',
          'The Federation was founded in January 1976 and officially proclaimed on 15/01/1976.',
        ),
        featured: true,
        imageId: null,
        displayOrder: 4,
      },
      {
        datePrecision: 'year',
        year: 1976,
        month: null,
        day: null,
        category: 'globalMembership',
        title: text('الانضمام إلى الاتحاد الدولي لألعاب القوى', 'Joining World Athletics'),
        description: text(
          'في عام تأسيسه نفسه، أصبح الاتحاد عضوًا في الاتحاد الدولي لألعاب القوى، ليفتح الباب أمام الرياضيين الإماراتيين للمنافسة عالميًا.',
          'In its founding year, the Federation became a member of World Athletics, opening the door for Emirati athletes to compete globally.',
        ),
        featured: false,
        imageId: null,
        displayOrder: 5,
      },
      {
        datePrecision: 'year',
        year: 1977,
        month: null,
        day: null,
        category: 'continentalMembership',
        title: text(
          'الانضمام إلى الاتحاد الآسيوي لألعاب القوى',
          'Joining the Asian Athletics Association',
        ),
        description: text(
          'انضم الاتحاد إلى المنظومة القارية، لتبدأ مشاركات الإمارات في البطولات الآسيوية.',
          'The Federation joined the continental body, beginning the UAE’s participation in Asian championships.',
        ),
        featured: false,
        imageId: null,
        displayOrder: 6,
      },
    ],
  },

  achievements: {
    eyebrow: text('لحظات ذهبية', 'Golden moments'),
    title: text('إنجازات رفعت علم الإمارات', 'Achievements that raised the UAE flag'),
    description: text(
      'من أول ذهبية في دورة الألعاب الآسيوية إلى جيل جديد يحصد الذهب ويحطم الأرقام القياسية.',
      'From the first Asian Games gold to a new generation winning gold and breaking records.',
    ),
    items: [
      {
        year: 2014,
        place: text('إنشيون', 'Incheon'),
        medalKind: 'gold',
        medalLabel: null,
        title: text(
          'أول ذهبية إماراتية في ألعاب القوى بدورة الألعاب الآسيوية',
          'The UAE’s first Asian Games athletics gold',
        ),
        description: text(
          'علياء سعيد محمد — سباق 10,000م، بزمن 31:51.86 ورقم وطني جديد.',
          'Alia Saeed Mohammed — 10,000m in 31:51.86, a new national record.',
        ),
        athleteId: null,
        imageId: null,
        displayOrder: 1,
      },
      {
        year: 2015,
        place: text('ووهان', 'Wuhan'),
        medalKind: 'gold',
        medalLabel: null,
        title: text('بطلة آسيا في سباق 10,000م', 'Asian champion over 10,000m'),
        description: text(
          'علياء سعيد محمد تتوّج بذهبية بطولة آسيا لألعاب القوى في ووهان.',
          'Alia Saeed Mohammed wins gold at the Asian Athletics Championships in Wuhan.',
        ),
        athleteId: null,
        imageId: null,
        displayOrder: 2,
      },
      {
        year: 2017,
        place: text('عشق آباد', 'Ashgabat'),
        medalKind: 'gold',
        medalLabel: null,
        title: text('ذهبية آسيا داخل الصالات', 'Asian indoor gold'),
        description: text(
          'علياء سعيد محمد تحرز ذهبية 3000م في بطولة آسيا داخل الصالات.',
          'Alia Saeed Mohammed wins the 3000m at the Asian Indoor Championships.',
        ),
        athleteId: null,
        imageId: null,
        displayOrder: 3,
      },
      {
        year: 2025,
        place: text('البحرين', 'Bahrain'),
        medalKind: 'bronze',
        medalLabel: null,
        title: text(
          'أول ميدالية إماراتية في تاريخ الألعاب الآسيوية للشباب',
          'The UAE’s first-ever Asian Youth Games medal',
        ),
        description: text(
          'محمد عادل العلي — رمي المطرقة، 62.03م، في النسخة الثالثة.',
          'Mohammed Adel Al Ali — hammer throw, 62.03m, at the 3rd edition.',
        ),
        athleteId: null,
        imageId: null,
        displayOrder: 4,
      },
      {
        year: 2026,
        place: text('هونغ كونغ', 'Hong Kong'),
        medalKind: 'gold',
        medalLabel: text('5 ذهبيات', '5 golds'),
        title: text(
          'المركز الثالث في بطولة آسيا للشباب تحت 20 عامًا',
          'Third overall at the Asian U20 Championships',
        ),
        description: text(
          '5 ذهبيات ورقمان قياسيان للبطولة، أبرزها سليمان عبدالرحمن في 400م بزمن 44.85ث.',
          'Five golds and two championship records, led by Suleiman Abdulrahman’s 44.85s in the 400m.',
        ),
        athleteId: null,
        imageId: null,
        displayOrder: 5,
      },
    ],
  },

  pioneers: {
    eyebrow: text('روّاد البدايات', 'The pioneers'),
    title: text('الأسماء التي وضعت حجر الأساس', 'The names that laid the foundation'),
    items: [
      {
        name: text('سعادة أحمد عبدالله الخرجي', 'H.E. Ahmed Abdullah Al Kharji'),
        badge: text('أول رئيس للجمعية · 1974', 'First president of the Association · 1974'),
        description: text(
          'أول رئيس لجمعية الإمارات لألعاب القوى، قاد الجمعية في مرحلتها التأسيسية الأولى بعد إشهارها في أبريل 1974م.',
          'The first president of the UAE Athletics Association, who led it through its founding phase after its establishment in April 1974.',
        ),
        imageId: null,
        featured: true,
        displayOrder: 1,
      },
      {
        name: text('السيد علي حميد', 'Mr. Ali Humaid'),
        badge: text('أول مشاركة خارجية', 'First external participation'),
        description: text(
          'عضو مجلس إدارة الجمعية، ارتبط اسمه بأول مشاركة للجمعية في بطولة الخليج بالبصرة.',
          'A board member of the Association, associated with its first participation at the Gulf Championship in Basra.',
        ),
        imageId: null,
        featured: false,
        displayOrder: 2,
      },
    ],
  },

  leadership: {
    eyebrow: text('القيادة اليوم', 'Leadership today'),
    title: text(
      'قيادة تدفع ألعاب القوى نحو العالمية',
      'Leadership driving athletics to the world stage',
    ),
    quote: text(
      'طموحنا أن تكون ألعاب القوى الإماراتية حاضرة بصورة دائمة في كبرى البطولات العالمية والأولمبية.',
      'Our ambition is for Emirati athletics to be a constant presence at the world’s biggest championships and the Olympic Games.',
    ),
    priorities: [
      text(
        'تطوير المنتخبات الوطنية والارتقاء بمستوى الرياضيين',
        'Developing national teams and raising athletes’ performance',
      ),
      text(
        'اكتشاف المواهب وصقلها عبر البرامج والمسابقات',
        'Discovering and nurturing talent through programmes and competitions',
      ),
      text('تطوير الكوادر الفنية والتحكيمية', 'Developing technical and officiating staff'),
      text('الاستعداد لاستحقاقات 2028 و2032 الأولمبية', 'Preparing for the 2028 and 2032 Olympic Games'),
    ],
  },

  governance: {
    eyebrow: text('الحوكمة والشفافية', 'Governance and transparency'),
    title: text(
      'منظومة مؤسسية قائمة على الحوكمة والمساءلة',
      'An institution built on governance and accountability',
    ),
    description: text(
      'في سبتمبر 2026 اعتمدت الجمعية العمومية غير العادية تعديلات النظام الأساسي للاتحاد، انسجامًا مع الإطار التنظيمي الموحّد للجنة الأولمبية الوطنية.',
      'In September 2026 an extraordinary General Assembly approved amendments to the Federation’s statutes, in line with the National Olympic Committee’s unified regulatory framework.',
    ),
    cards: [
      {
        title: text('لجنة انتخابات مركزية', 'Central Elections Committee'),
        text: text('لائحة موحّدة تنظّم العملية الانتخابية.', 'A unified regulation governing elections.'),
        tone: 'green',
        displayOrder: 1,
      },
      {
        title: text('لجنة استئناف انتخابية', 'Electoral Appeals Committee'),
        text: text('جهة مستقلة للنظر في الطعون.', 'An independent body to hear appeals.'),
        tone: 'black',
        displayOrder: 2,
      },
      {
        title: text('مسؤوليات واضحة', 'Clear responsibilities'),
        text: text(
          'أولوية لتطوير الرياضة وخدمة الرياضيين.',
          'Priority on developing the sport and serving athletes.',
        ),
        tone: 'red',
        displayOrder: 3,
      },
    ],
    link: {
      label: text('اللوائح والسياسات', 'Regulations and policies'),
      href: '/about/governance/policies',
    },
  },

  ecosystem: {
    eyebrow: text('منظومة الاتحاد', 'The Federation’s ecosystem'),
    title: text(
      'منظومة ألعاب القوى الإماراتية اليوم',
      'Emirati athletics today',
    ),
  },

  cta: {
    title: text(
      'نعمل معًا من أجل مستقبل ألعاب القوى الإماراتية',
      'Working together for the future of Emirati athletics',
    ),
    description: text(
      'تعرّف على البطولات القادمة، أو تواصل مع فريق الاتحاد.',
      'Explore upcoming championships or get in touch with the Federation team.',
    ),
    primary: { label: text('استكشف البطولات', 'Explore championships'), href: '/championships' },
    secondary: { label: text('تواصل معنا', 'Contact us'), href: '/contact' },
  },

  seo: {
    metaTitle: text(
      'نبذة عن الاتحاد | اتحاد الإمارات لألعاب القوى',
      'About the Federation | UAE Athletics Federation',
    ),
    metaDescription: text(
      'تاريخ اتحاد الإمارات لألعاب القوى منذ إشهار الجمعية عام 1974، وتأسيس الاتحاد 1976، وعضويته الدولية والآسيوية وأبرز إنجازاته.',
      'The history of the UAE Athletics Federation since the Association’s establishment in 1974, the Federation’s founding in 1976, its global and Asian memberships and key achievements.',
    ),
    ogImageId: null,
  },
} as const;
