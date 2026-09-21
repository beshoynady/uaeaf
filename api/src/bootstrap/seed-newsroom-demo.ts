import { Types, type Model } from 'mongoose';
import type { ArticleCategory } from '../modules/public-communication/articles/schemas/article.schema.js';

/**
 * A newsroom with people in it and work in every state.
 *
 * What this is for: the design and the workflow cannot be judged against an
 * empty database. A list screen with no rows, a review queue with nothing in
 * it and a public feed with one article each say nothing about whether the
 * thing works — so this puts a realistic newsroom on a development machine in
 * one command.
 *
 * Every record it writes is marked. Users carry `isDemo` and say "تجريبي /
 * Demo" in their own names; articles carry the same marker in their titles.
 * Nothing here should ever be mistaken for the federation's real content, and
 * nothing here may be seeded anywhere but a development database — the entry
 * point refuses any other target.
 *
 * Idempotent by fixed ids: a record already present is left exactly as it is,
 * including any edit someone made to it since.
 */

/** Marked in the name itself, not only in a flag: a flag is invisible on the
 *  screen where the mistake would actually be made. */
const DEMO_MARK = { ar: 'تجريبي', en: 'Demo' } as const;

export interface DemoPerson {
  _id: Types.ObjectId;
  email: string;
  name: { ar: string; en: string };
  /** The permission pairs this person's role holds. */
  grants: [string, string][];
}

/** Reads on everything the newsroom screens open with — held by all three, so
 *  what separates them is what they may CHANGE, which is the point. */
const NEWSROOM_READS: [string, string][] = [
  ['articles', 'Read'],
  ['revisions', 'Read'],
  ['publications', 'Read'],
  ['workflowInstances', 'Read'],
  ['mediaAssets', 'Read'],
];

/**
 * Three people, separated the way the platform separates them.
 *
 * Fixed ids so re-running changes nothing, and so the approval steps that name
 * them can be written without a lookup.
 */
export const DEMO_PEOPLE: DemoPerson[] = [
  {
    _id: new Types.ObjectId('000000000000000000de0001'),
    email: 'editor.demo@uaeaf.ae',
    name: { ar: 'محرر تجريبي', en: 'Demo Editor' },
    grants: [...NEWSROOM_READS, ['articles', 'Create'], ['articles', 'Update'], ['articles', 'Delete']],
  },
  {
    _id: new Types.ObjectId('000000000000000000de0002'),
    email: 'approver.demo@uaeaf.ae',
    name: { ar: 'معتمِد تجريبي', en: 'Demo Approver' },
    grants: [...NEWSROOM_READS, ['workflowInstances', 'Approve']],
  },
  {
    _id: new Types.ObjectId('000000000000000000de0003'),
    email: 'publisher.demo@uaeaf.ae',
    name: { ar: 'ناشر تجريبي', en: 'Demo Publisher' },
    grants: [...NEWSROOM_READS, ['articles', 'Publish']],
  },
];

const paragraph = (text: string) => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

/** A body with the shape a real article has: a lead, a subheading, a second
 *  passage and a pulled quote — enough to exercise every block the renderer
 *  draws and every wrap the column has to survive. */
const storyBody = (lead: string, heading: string, second: string, quote: string) => ({
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: lead }] },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: heading }] },
    { type: 'paragraph', content: [{ type: 'text', text: second }] },
    { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: quote }] }] },
  ],
});

/** Where an article should end up once the seed has walked it there. */
export type DemoDestination = 'draft' | 'awaitingApproval' | 'approved' | 'published' | 'hidden';

export interface DemoArticle {
  _id: Types.ObjectId;
  slug: string;
  category: ArticleCategory;
  destination: DemoDestination;
  title: { ar: string; en: string };
  body: { ar: unknown; en: unknown };
}

// An ObjectId is 24 hex characters, so the marker has to be spelled in
// hex-legal letters: `de` for demo, then the number.
const id = (n: number) => new Types.ObjectId(`00000000000000000000de${n.toString().padStart(2, '0')}`);

/**
 * Eight stories across both shelves and every state.
 *
 * Deliberately uneven: two waiting on the approver so the review queue has
 * something real in it, two already public so the site has a feed, one hidden
 * so the "archived but still addressable" behaviour is visible, and drafts so
 * the list screen shows more than one row type. Arabic and English both run
 * long enough to test wrapping in a narrow column.
 */
export const DEMO_ARTICLES: DemoArticle[] = [
  {
    _id: id(1),
    slug: 'demo-asian-championship-medal',
    category: 'General',
    destination: 'published',
    title: {
      ar: '(تجريبي) ميدالية برونزية للمنتخب الوطني في بطولة آسيا لألعاب القوى',
      en: '(Demo) Bronze for the national team at the Asian athletics championship',
    },
    body: {
      ar: storyBody(
        'حصد المنتخب الوطني لألعاب القوى الميدالية البرونزية في سباق التتابع أربعة في مئة متر ضمن منافسات بطولة آسيا، في إنجاز هو الأول من نوعه للفريق في هذه المسافة.',
        'تفاصيل السباق',
        'انطلق الفريق في المركز الخامس وتقدّم تدريجيًا خلال المرحلتين الثالثة والرابعة، ليعبر خط النهاية ثالثًا بفارق أربعة أجزاء من المئة من الثانية عن صاحب المركز الرابع.',
        'هذه الميدالية ثمرة ثلاث سنوات من العمل المتواصل مع هذا الجيل من العدّائين.',
      ),
      en: storyBody(
        'The national athletics team took bronze in the 4x100m relay at the Asian championship, a first for the squad at this distance.',
        'How the race unfolded',
        'The team started fifth and moved up through the third and fourth legs, crossing four hundredths of a second ahead of the fourth-placed side.',
        'This medal is the result of three years of continuous work with this generation of sprinters.',
      ),
    },
  },
  {
    _id: id(2),
    slug: 'demo-federation-in-the-press-september',
    category: 'FederationInMedia',
    destination: 'published',
    title: {
      ar: '(تجريبي) الاتحاد في الإعلام: حصاد التغطيات الصحفية لشهر سبتمبر',
      en: '(Demo) The federation in the media: September press round-up',
    },
    body: {
      ar: storyBody(
        'تناولت عدة صحف محلية ودولية خلال شهر سبتمبر أنشطة الاتحاد وبرامجه التطويرية، مع تركيز خاص على مشاركات المنتخب الوطني الخارجية.',
        'أبرز ما نُشر',
        'ركّزت التغطيات على برنامج اكتشاف المواهب في المدارس، وعلى استضافة الدولة لبطولة الأندية الخليجية في الربع الأخير من العام.',
        'الاهتمام الإعلامي المتزايد مؤشر على أن ألعاب القوى تستعيد موقعها في المشهد الرياضي المحلي.',
      ),
      en: storyBody(
        'Local and international outlets covered the federation and its development programmes through September, with particular attention to the national team abroad.',
        'What was published',
        'Coverage focused on the schools talent-identification programme and on the country hosting the Gulf club championship in the final quarter of the year.',
        'Growing media interest is a sign that athletics is regaining its place in the domestic sporting picture.',
      ),
    },
  },
  {
    _id: id(3),
    slug: 'demo-youth-development-programme',
    category: 'General',
    destination: 'awaitingApproval',
    title: {
      ar: '(تجريبي) انطلاق برنامج تطوير الناشئين في ستة أندية',
      en: '(Demo) Youth development programme opens at six clubs',
    },
    body: {
      ar: storyBody(
        'أعلن الاتحاد انطلاق المرحلة الأولى من برنامج تطوير الناشئين، الذي يشمل ستة أندية في أربع إمارات ويستهدف الفئة العمرية من اثني عشر إلى ستة عشر عامًا.',
        'محاور البرنامج',
        'يقوم البرنامج على ثلاثة محاور: الإعداد البدني العام، والتقييم الدوري للأداء، ومتابعة طبية منتظمة تضمن سلامة اللاعبين خلال مراحل النمو.',
        'نريد أن يصل اللاعب إلى المنتخب وقد بُني بشكل صحيح من البداية.',
      ),
      en: storyBody(
        'The federation has opened the first phase of its youth development programme, covering six clubs across four emirates and aimed at ages twelve to sixteen.',
        'What the programme covers',
        'It rests on three strands: general physical preparation, periodic performance assessment, and regular medical follow-up to keep athletes safe through their growth years.',
        'We want an athlete to reach the national team having been built properly from the start.',
      ),
    },
  },
  {
    _id: id(4),
    slug: 'demo-press-coverage-of-schools-league',
    category: 'FederationInMedia',
    destination: 'awaitingApproval',
    title: {
      ar: '(تجريبي) الصحافة المحلية تسلّط الضوء على دوري المدارس',
      en: '(Demo) Local press turns its attention to the schools league',
    },
    body: {
      ar: storyBody(
        'خصّصت عدة منصات إعلامية محلية مساحات موسّعة لتغطية الجولة الافتتاحية من دوري المدارس لألعاب القوى، مع حوارات مع المدربين وأولياء الأمور.',
        'ما الذي لفت الانتباه',
        'توقّفت التغطيات عند ارتفاع أعداد المشاركات من الطالبات هذا الموسم مقارنة بالموسم الماضي، وعند تنظيم المنافسات في توقيت مسائي يناسب الأسر.',
        'الدوري المدرسي هو المكان الذي تبدأ منه كل مسيرة.',
      ),
      en: storyBody(
        'Several local outlets gave extended coverage to the opening round of the schools athletics league, including interviews with coaches and parents.',
        'What drew attention',
        'Reporting noted the rise in girls competing this season compared with last, and the move to evening sessions that suit families.',
        'The schools league is where every career begins.',
      ),
    },
  },
  {
    _id: id(5),
    slug: 'demo-coaching-licence-renewals',
    category: 'General',
    destination: 'approved',
    title: {
      ar: '(تجريبي) فتح باب تجديد رخص التدريب للموسم الجديد',
      en: '(Demo) Coaching licence renewals open for the new season',
    },
    body: {
      ar: storyBody(
        'فتح الاتحاد باب تجديد رخص التدريب للموسم الرياضي الجديد، على أن يُغلق التسجيل نهاية الشهر المقبل دون تمديد.',
        'شروط التجديد',
        'يشترط للتجديد إتمام عشر ساعات من التعليم المستمر خلال الموسم المنقضي، وتقديم شهادة إسعافات أولية سارية.',
        'الرخصة ليست إجراءً إداريًا، بل ضمان لمستوى من يتعامل مع اللاعبين.',
      ),
      en: storyBody(
        'The federation has opened coaching licence renewals for the new season, closing at the end of next month with no extension.',
        'What renewal requires',
        'Renewal requires ten hours of continuing education completed during the past season, and a valid first-aid certificate.',
        'A licence is not an administrative formality; it is a guarantee of the standard of the people working with athletes.',
      ),
    },
  },
  {
    _id: id(6),
    slug: 'demo-stadium-track-resurfacing',
    category: 'General',
    destination: 'hidden',
    title: {
      ar: '(تجريبي) إعادة تأهيل مضمار الاستاد الرئيسي',
      en: '(Demo) Main stadium track resurfacing',
    },
    body: {
      ar: storyBody(
        'بدأت أعمال إعادة تأهيل مضمار الاستاد الرئيسي، وتستغرق نحو عشرة أسابيع يُغلق خلالها المضمار أمام التدريبات.',
        'البديل خلال الأعمال',
        'خُصّص مضمار النادي المجاور لتدريبات المنتخبات الوطنية طوال فترة الإغلاق، بجدول زمني وُزّع على الأندية مسبقًا.',
        'الاستثمار في المنشأة استثمار في كل رقم سيُسجَّل عليها لاحقًا.',
      ),
      en: storyBody(
        'Work has begun on resurfacing the main stadium track, taking around ten weeks during which the track is closed to training.',
        'Where training moves',
        'The neighbouring club track has been allocated to national squad sessions for the closure, on a schedule circulated to clubs in advance.',
        'Investing in the facility is investing in every result that will later be set on it.',
      ),
    },
  },
  {
    _id: id(7),
    slug: 'demo-officials-workshop-draft',
    category: 'General',
    destination: 'draft',
    title: {
      ar: '(تجريبي) ورشة الحكام الإقليمية — مسودة قيد الإعداد',
      en: '(Demo) Regional officials workshop — draft in preparation',
    },
    body: {
      ar: storyBody(
        'يعدّ الاتحاد لورشة إقليمية للحكام تستضيفها الدولة مطلع العام المقبل، بمشاركة متوقعة من ستة اتحادات خليجية.',
        'ما زال قيد الإعداد',
        'لم تُعتمد بعد قائمة المحاضرين ولا الجدول الزمني النهائي، وسيصدر الإعلان الرسمي فور اكتمالهما.',
        'هذه مسودة تجريبية لعرض حالة المسودة في لوحة التحكم.',
      ),
      en: storyBody(
        'The federation is preparing a regional officials workshop to be hosted early next year, with six Gulf federations expected to take part.',
        'Still in preparation',
        'Neither the list of instructors nor the final schedule has been settled; the official announcement follows once both are.',
        'This is a demo draft, here to show what a draft looks like in the dashboard.',
      ),
    },
  },
  {
    _id: id(8),
    slug: 'demo-media-accreditation-draft',
    category: 'FederationInMedia',
    destination: 'draft',
    title: {
      ar: '(تجريبي) اعتماد وسائل الإعلام للموسم — مسودة',
      en: '(Demo) Media accreditation for the season — draft',
    },
    body: {
      ar: storyBody(
        'يجري إعداد آلية جديدة لاعتماد وسائل الإعلام لتغطية منافسات الموسم، تبسّط الإجراءات الحالية وتختصر مدة الرد.',
        'ما الذي سيتغيّر',
        'ستُستبدل الاستمارة الورقية بنموذج إلكتروني واحد، مع اعتماد موسمي بدل الاعتماد لكل بطولة على حدة.',
        'هذه مسودة تجريبية ولم تُعتمد بعد.',
      ),
      en: storyBody(
        'A new media accreditation process for the season is being prepared, simplifying the current steps and shortening response times.',
        'What changes',
        'The paper form is replaced by a single online one, with season-long accreditation instead of per-championship approval.',
        'This is a demo draft and has not been approved.',
      ),
    },
  },
];

export interface NewsroomDemoModels {
  users: Model<Record<string, unknown>>;
  roles: Model<Record<string, unknown>>;
  permissions: Model<Record<string, unknown>>;
  articles: Model<Record<string, unknown>>;
}

export interface NewsroomDemoReport {
  people: { created: number; existing: number };
  articles: { created: number; existing: number };
}

/**
 * Creates the demo people and the demo articles as DRAFTS.
 *
 * Walking them into their destination states is the entry point's job, because
 * it takes HTTP calls through the real submit/approve/publish routes — a seed
 * that wrote `publicationState: 'Live'` directly would produce a feed the
 * workflow never touched, which is exactly the thing that must not be
 * demonstrated.
 */
export const seedNewsroomDemo = async (
  models: NewsroomDemoModels,
  passwordHash: string,
): Promise<NewsroomDemoReport> => {
  const report: NewsroomDemoReport = {
    people: { created: 0, existing: 0 },
    articles: { created: 0, existing: 0 },
  };

  for (const person of DEMO_PEOPLE) {
    const existing = await models.users.findOne({ _id: person._id }).lean();
    if (existing) {
      report.people.existing += 1;
      continue;
    }

    const permissionIds = await Promise.all(
      person.grants.map(async ([resourceType, action]) => {
        const found = await models.permissions.findOne({ resourceType, action }).lean<{ _id: Types.ObjectId }>();
        return found?._id ?? null;
      }),
    );

    const role = await models.roles.create({
      name: { ar: `${person.name.ar} — دور`, en: `${person.name.en} role` },
      // A missing pair means the catalogue has not been seeded on this
      // database; the role is still created with what does exist rather than
      // failing, and the entry point reports the shortfall.
      permissionIds: permissionIds.filter(Boolean),
      isSystemRole: false,
    });

    await models.users.create({
      _id: person._id,
      name: person.name,
      email: person.email,
      accountStatus: 'Active',
      roleIds: [role._id],
      authMethods: [{ provider: 'Local', passwordHash, linkedAt: new Date() }],
    });
    report.people.created += 1;
  }

  const author = DEMO_PEOPLE[0]._id;

  for (const article of DEMO_ARTICLES) {
    const existing = await models.articles.findOne({ _id: article._id }).lean();
    if (existing) {
      report.articles.existing += 1;
      continue;
    }

    await models.articles.create({
      _id: article._id,
      title: article.title,
      slug: article.slug,
      category: article.category,
      body: article.body,
      authorDisplayName: { ar: `القسم الإعلامي (${DEMO_MARK.ar})`, en: `Media office (${DEMO_MARK.en})` },
      seo: {
        metaTitle: article.title,
        metaDescription: {
          ar: 'محتوى تجريبي من اتحاد الإمارات لألعاب القوى — لأغراض العرض فقط.',
          en: 'Demo content from the UAE Athletics Federation — for presentation only.',
        },
        ogImageId: null,
      },
      publicationState: 'Draft',
      archived: false,
      publishDate: null,
      createdBy: author,
      updatedBy: author,
    });
    report.articles.created += 1;
  }

  return report;
};
