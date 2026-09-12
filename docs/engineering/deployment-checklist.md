# قائمة النشر

استراتيجية النشر نفسها ما زالت مفتوحة: فصل بيئات Atlas، و`autoIndex` في الإنتاج، وإدارة الـ secrets. هي البند B9 في `docs/audits/project-status-and-frontend-kickoff-2026-09-07.md`. هذه القائمة تحمل ما يُعرف حتى الآن من خطوات قبل النشر وبعده.

## قبل أول تشغيل للـ API على Atlas

- [ ] **شغّل استعلامات الملحق ب** من `docs/engineering/reviews/workflow-integrity-review.md` على Atlas عبر `mongosh`. هي استعلامات قراءة فقط.
  - **استعلام `revisions` خصوصًا يجب ألا يعيد شيئًا.** عند التشغيل يبني Mongoose الفهرس الفريد المعلَن `entityType_1_entityId_1_versionNumber_-1`. لو وُجدت أرقام نسخ مكررة يفشل بناء الفهرس، ويبدأ التطبيق مع ذلك، فيفقد ترقيم النسخ ضمانه دون أي خطأ ظاهر. تجربة على قاعدة في الذاكرة (2026-09-11) أظهرت ذلك: الخطأ يصل فقط كحدث `index` على الـ model، ولا يستمع له أحد، ثم تُقبل نسخة مكررة ثالثة.
  - **لو أعاد أي استعلام نتائج:** لا تنشر، واعرضها لقرار التنظيف أولًا.

## بعد النشر على Atlas

- [ ] **تحقق أن الفهرس الفريد على `revisions` بُني فعلًا.** فشل بنائه صامت: التطبيق يعمل، ولا شيء في السجلات يقول إنه غير موجود. وسيكون غائبًا أيضًا لو عُطّل `autoIndex` في الإنتاج (البند B9). في `mongosh` متصلًا بقاعدة Atlas الخاصة بالبيئة:

  ```js
  db.revisions.getIndexes().filter((i) => i.name === 'entityType_1_entityId_1_versionNumber_-1').map((i) => ({ name: i.name, unique: i.unique === true }))
  ```

  - **الناتج المطلوب حرفيًا:** `[ { name: 'entityType_1_entityId_1_versionNumber_-1', unique: true } ]`. هذا ما يعيده الأمر على القاعدة المحلية في 2026-09-11.
  - **لو أعاد `[]` أو `unique: false`:** الفهرس غير موجود. شغّل استعلام `revisions` من الملحق ب لمعرفة المكررات، وقرّر تنظيفها، ثم أعد تشغيل الـ API ليبنيه Mongoose، وأعد هذا الفحص.

## قبل نشر ADR-0069: الفهرس الفريد على `workflowPolicies`

ADR-0069 D4 يجعل `{entityType, operation}` فريدًا وجزئيًا على `archivedAt: null` (نتيجة التدقيق H4). الترتيب إلزامي: **افحص المكرر ← احذف الفهرس القديم صراحةً ← ابنِ الجديد.** Mongoose لا يحذف الفهرس المستبدَل وحده، فيبقى الاثنان معًا والقديم لا يضمن شيئًا.

### ١. فحص المكرر

- **محليًا:** `npm run check:policy-duplicates` داخل `api/`. قراءة فقط، ويخرج بـ 1 لو وجد مكررًا، ويطبع أيضًا فهارس المجموعة الحالية.
  - **نتيجة 2026-09-12 على القاعدة المحلية:** لا مكررات. والفهرس القديم `entityType_1_operation_1` **ما زال موجودًا** غير فريد.
- **على Atlas:** الاستعلام التالي جاهز للنسخ في `mongosh`. قراءة فقط، ولم يُنفَّذ من جهاز التطوير — لا يوجد رابط Atlas مهيّأ فيه، والسكربتات ترفض أي قاعدة غير محلية:

  ```js
  db.workflowPolicies.aggregate([
    { $match: { archivedAt: null } },
    { $group: {
        _id: { entityType: '$entityType', operation: '$operation' },
        count: { $sum: 1 },
        rows: { $push: { id: '$_id', workflowRequired: '$workflowRequired', workflowDefinitionId: '$workflowDefinitionId', updatedAt: '$updatedAt' } }
    } },
    { $match: { count: { $gt: 1 } } },
    { $sort: { '_id.entityType': 1, '_id.operation': 1 } }
  ]).toArray()
  ```

  - **الناتج المطلوب:** `[]`.
  - **لو أعاد أي مجموعة:** لا تنشر. كل مجموعة تعني سياستين متناقضتين لنفس العملية، وأيّهما الصحيحة **قرار بشري** لا يقرره سكربت. أرشِف أو احذف الخاطئة، ثم أعد الفحص.

### ٢. حذف الفهرس القديم

بعد أن يعيد الفحص `[]`، وفي كل بيئة على حدة:

```js
db.workflowPolicies.getIndexes()
db.workflowPolicies.dropIndex('entityType_1_operation_1')
```

### ٣. التحقق بعد النشر

```js
db.workflowPolicies.getIndexes().filter((i) => i.key.entityType === 1 && i.key.operation === 1).map((i) => ({ name: i.name, unique: i.unique === true, partial: i.partialFilterExpression !== undefined }))
```

- **الناتج المطلوب:** صف واحد فقط، `unique: true` و`partial: true`.
- **لو ظهر صفّان:** الفهرس القديم لم يُحذف. عد إلى الخطوة ٢.
- **لو أعاد `[]` أو `unique: false`:** لم يُبنَ الفهرس. السبب المرجّح مكرر ظهر بين الفحص والنشر، أو `autoIndex` معطّل في الإنتاج (البند B9). الفشل صامت كما في حالة `revisions`.

## قرار مفتوح: الفهرس القديم الزائد على `revisions`

- **ما هو:** `entityType_1_entityId_1`.
- **أين يوجد:** محليًا، وقد تحقّقنا منه في 2026-09-11. وعلى Atlas بحسب المالك، لكن لم يُتحقَّق منه من جهاز التطوير لأنه لا يوجد رابط Atlas مهيّأ فيه.
- **لماذا هو زائد:** الـ schema لم يعد يعلنه. الفهرس الفريد `(entityType, entityId, versionNumber)` يخدم الاستعلامات نفسها عبر بادئته.
- **لماذا ما زال موجودًا:** Mongoose لا يحذف فهرسًا غير معلَن أبدًا، فيبقى حتى يُحذف صراحةً.
- **الحذف يحتاج قرارًا صريحًا** من المالك قبل تنفيذه، في كل بيئة على حدة، ولا يُحذف كأثر جانبي لأي مهمة أخرى. الأمر، بعد القرار: `db.revisions.dropIndex('entityType_1_entityId_1')`.
