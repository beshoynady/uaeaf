# تقرير Deep Security Audit — نظام Authentication & Authorization في UAEAF Backend

**تنويه:** هذا تقرير Audit فقط. لم يتم تعديل أو إنشاء أو حذف أي ملف. كل نتيجة أدناه مبنية على قراءة فعلية للكود (مع ذكر المسار والسطر) وليس افتراضًا.

---

## 1. Executive Summary

البنية العامة للـ Authentication معقولة التصميم في نقاط أساسية: JWT بعمر قصير جدًا (15 دقيقة) للـ access token، صلاحيات مُجمَّدة (flattened) داخل الـ token نفسه بدل استعلام DB في كل request، account lockout حقيقي، rate limiting مستقل عن الـ lockout، RBAC بدون أي "bypass" مبرمج لدور معيّن (لا يوجد `if role === 'SUPER_ADMIN'` في أي guard)، و Zod validation صارم على متغيرات البيئة.

لكن يوجد **عدد من الثغرات الحرجة (P0) الموثّقة بدقة من الكود مباشرة**:

1. **تسريب password hash فعليًا عبر API** — `GET /users`, `GET /users/:id`, `GET /users/me` تُعيد الـ Mongoose document الخام بدون أي DTO أو `toJSON` transform أو `select: false`، فيظهر `authMethods[].passwordHash` (bcrypt hash) في الـ JSON response لأي مستخدم يملك صلاحية `users:Read`.
2. **سلسلة Privilege Escalation كاملة وقابلة للتنفيذ**: أي مستخدم يملك `roles:Create` + `users:Update` (فقط) يستطيع إنشاء دور جديد بكل الصلاحيات الموجودة، ثم إسناده لنفسه، ليصبح فعليًا Super Admin — بدون أي تحقق "لا يمكنك منح صلاحية لا تملكها بالفعل".
3. **لا يوجد Logout ولا أي آلية Revocation على الإطلاق.** الـ refresh token عبارة عن JWT خام بدون أي تخزين في DB — لا rotation، لا reuse detection، لا سبيل لإبطال جلسة قبل انتهاء صلاحيتها الطبيعية (7 أيام).
4. **Refresh token يمكن استخدامه كـ Access token** على أي route لا يحمل `@RequirePermission()` (مثل `GET /users/me`) بسبب غياب claim من نوع `type` يميّز بين النوعين.
5. **Password Reset غير مُنفَّذ إطلاقًا** رغم وجود الحقول (`passwordResetToken`, `passwordResetExpiresAt`) في الـ Schema — تم التأكد عبر grep على المشروع بالكامل أنها غير مستخدمة في أي controller أو service.
6. **MFA و OAuth (Google/Microsoft) غير منفذين إطلاقًا** — الأخير مجرد enum placeholder في الـ Schema بدون أي مكتبة أو Strategy فعلية.
7. **`isSystemRole` لا يحمي فعليًا** — يمنع rename/delete فقط، ولا يمنع `PATCH /roles/:id/permissions`، أي يمكن تعديل صلاحيات نفس دور الـ Super Admin نفسه.

---

## 2. Current Architecture (كما هي فعليًا في الكود)

* **Stateless JWT** عبر `@nestjs/jwt` — HS256 ضمنيًا (لا يوجد `algorithm` صريح)، secret واحد مشترك للـ access والـ refresh (`config/jwt.config.ts`).
* Access token: 15 دقيقة. Refresh token: 7 أيام (`jwt.config.ts:6-11`).
* الصلاحيات تُحسب مرة واحدة عند login/refresh وتُدمج داخل الـ JWT payload (`{sub, permissions}`) — `PermissionsGuard` لا يستعلم DB إطلاقًا في كل request (`auth.service.ts:98-109`, `permissions.guard.ts:56-60`).
* Guards عالمية عبر `APP_GUARD` بالترتيب: `RateLimitGuard → JwtAuthGuard → PermissionsGuard` (`app.module.ts:163-165`) — يعني **default-deny** حقيقي، أي controller جديد محمي تلقائيًا ما لم يُعلَّم `@Public()`.
* `AuditLogInterceptor` عالمي عبر `APP_INTERCEPTOR` يسجل كل POST/PATCH/PUT/DELETE الناجحة لمستخدم مُصادَق عليه.
* Password hashing: `bcryptjs`, 10 rounds (`users.service.ts:9`).
* Account lockout: 5 محاولات فاشلة → قفل 15 دقيقة (`config/auth.config.ts`).
* Rate limiting: In-memory (`RateLimitGuard`)، `login` مقيد بـ 10/60s إضافة لذلك.
* Env validation: Zod, `JWT_SECRET` ≥ 32 حرف إلزاميًا (`validation.schema.ts`).
* **لا يوجد**: Redis/Cache، Sessions collection، OAuth strategies، MFA، Logout endpoint، Password-change/reset endpoint.

---

## 3. Security Score

| العنصر | التقييم (0-5) | ملاحظة |
|---|---|---|
| User Schema | 2 | تسريب passwordHash + نقص حقول أمنية (securityStamp, mfa*) |
| AuthMethod | 2 | لا توجد قيود provider-specific، OAuth غير منفذ |
| Role | 2 | `isSystemRole` ناقص الحماية جزئيًا |
| Permission | 3 | تصميم سليم، ينقصه unique index |
| JWT | 3 | تصميم عمر جيد، لكن بدون `type`/`jti`/`aud`/`iss` |
| Sessions | 0 | غير موجودة إطلاقًا |
| Password | 3 | bcrypt سليم، لا يوجد password change endpoint |
| Activation/Invitation | 1 | النمط الحالي فقط (admin يضع password مباشرة)، لا INVITED |
| Password Reset | 0 | معلن في Schema فقط، غير منفذ |
| MFA | 0 | غير موجود |
| OAuth | 0 | Placeholder فقط |
| Authorization (RBAC) | 3 | default-deny سليم، لكن escalation ممكن |
| Role Assignment | 1 | لا حماية من self-escalation |
| Rate Limiting | 4 | جيد ومطبّق بشكل صحيح على login |
| Audit Logging | 3 | يغطي RBAC mutations + denials، لا يغطي login/logout/password events |
| DTO Security | 2 | ثغرة تسريب حرجة في GET users |
| Database Constraints | 3 | User فيها index سليم، Role/Permission بدون unique index |

**التقييم الإجمالي التقريبي: 2.1 / 5 — يحتاج عمل كبير قبل الإنتاج (Production).**

---

## 4. User Schema Audit (field-by-field)

الملف: `src/modules/platform-administration/users/schemas/user.schema.ts`

| Field | ضروري؟ | نوع صحيح؟ | Required؟ | Immutable؟ | select:false؟ | Index؟ | قابل للتعديل من العميل؟ | Risk |
|---|---|---|---|---|---|---|---|---|
| `name` | نعم | نعم (bilingual) | نعم | لا | لا حاجة | لا | لا (لا يوجد PATCH عام) | لا |
| `email` | نعم | نعم | نعم | **يجب أن يكون كذلك عمليًا** — لا يوجد أي endpoint لتغييره حاليًا، جيد | لا حاجة | نعم (partial unique، سليم) | لا | منخفض |
| `roleIds` | نعم | نعم | لا (default []) | لا | لا حاجة | **لا** — تُستعلم عبر `findById` واحدة تلو الأخرى (N+1)، انظر §18 | فقط عبر `users:Update` | متوسط (coupling، انظر §16) |
| `personId` | نعم لسياق العمل | نعم | لا | لا | لا حاجة | يُفضَّل | لا | لا |
| `accountStatus` | نعم | نعم | لا (default Active) | لا | لا حاجة | **مفيد لو صار عندك استعلام "كل Suspended"** | لا (لا يوجد endpoint) | لا |
| `lastLogin` | نعم | نعم | لا | لا | لا حاجة | لا | لا | لا |
| `authMethods` | نعم | نعم | لا | جزئيًا | **passwordHash يجب أن يكون select:false — غير موجود حاليًا** | لا | لا (لا يوجد endpoint لإدارته بعد الإنشاء) | **حرج (P0) — انظر §17 و§20** |
| `passwordResetToken` | معلن لكن **ميت** (dead field) | String خام غير مُشفَّر (لو استُخدم لاحقًا يجب hashing، ليس plaintext) | لا | لا | **يجب** لو فُعِّل | لا | لا | متوسط (لو نُفِّذ لاحقًا بدون hashing) |
| `passwordResetExpiresAt` | نفس الحالة أعلاه | نعم | لا | لا | لا حاجة | لا | لا | لا |
| `failedLoginAttempts` | نعم | نعم | لا (default 0) | لا | لا حاجة | لا | لا | لا |
| `lockedUntil` | نعم | نعم | لا | لا | لا حاجة | لا | لا | لا |

**حقول ناقصة (يجب أن تدخل التصميم المستقبلي):**
- `securityStamp` أو `authzVersion` — ضروري لحل مشكلة "Role revoked → Old JWT still valid" بشكل حقيقي وليس فقط عبر انتظار 15 دقيقة.
- `passwordChangedAt` — لإبطال كل الـ refresh tokens الصادرة قبل تغيير كلمة المرور.
- `mfaEnabled` / `mfaSecretHash` / `mfaRecoveryCodesHash[]` — عند إضافة MFA.
- لا يوجد أي حقل لتتبّع الجلسات (انظر §9).

---

## 5. AuthMethod Audit

الملف: `src/modules/platform-administration/users/schemas/auth-method.schema.ts`

* `provider`: enum `['Local', 'Google', 'Microsoft']` — **لكن Google/Microsoft غير مدعومين فعليًا في أي مكان من الكود** (لا Strategy، لا Controller route، لا مكتبة `passport-google-oauth20`/`passport-microsoft` في `package.json`).
* `passwordHash`: اختياري (Local فقط) — **بدون `select: false`** (P0، انظر §4/§17).
* `providerId`: اختياري (OAuth فقط).
* `linkedAt`: افتراضي `Date.now`.
* **لا يوجد أي تحقق Schema-level أو Service-level** يمنع دخول بيانات غير مناسبة للـ provider — مثال: لا شيء يمنع إنشاء `AuthMethod` بـ `provider: 'Google'` مع `passwordHash` معبأ، أو `provider: 'Local'` مع `providerId` معبأ. عمليًا هذا غير قابل للاستغلال حاليًا لأن لا يوجد أي endpoint يُنشئ/يُعدّل `authMethods` بعد `UsersService.create()` — لكنه Gap تصميمي حقيقي يجب إغلاقه (Discriminated validation) عند تفعيل OAuth لاحقًا.
* **لا يوجد أي endpoint لإضافة/إزالة/تعديل `authMethods` بعد الإنشاء الأولي** — يعني: لا يمكن لمستخدم ربط حساب Google لاحقًا، ولا فك ربط، ولا تغيير كلمة المرور، ولا حتى Admin يستطيع تصفير كلمة مرور مستخدم عبر أي API موجود.

---

## 6. Role Audit

الملف: `src/modules/platform-administration/roles/schemas/role.schema.ts` + `roles.service.ts`

* `name` (bilingual)، `permissionIds[]`، `isSystemRole` (default `false`).
* **لا يوجد unique index على `name`** — يمكن إنشاء دورين بنفس الاسم (P3، تشويش إداري فقط، ليس ثغرة أمنية مباشرة لأن التحقق دائمًا بالـ `_id`).
* **`isSystemRole` يحمي `rename()` و `remove()` فقط** (`roles.service.ts:31-45`) — **لا يحمي `updatePermissions()` إطلاقًا** (`roles.service.ts:36-38`، لا يستدعي `assertNotSystemRole`). هذا يعني: **حتى دور "Super Admin" المزروع (seeded) نفسه يمكن تعديل صلاحياته بالكامل** من أي شخص يملك `roles:Update` — إما بإفراغه من الصلاحيات (تعطيل كل الإداريين) أو بتغيير مضمونه.
* دور جديد يُنشأ دائمًا بـ `isSystemRole: false` (لا حماية إطلاقًا)، ولا يوجد سقف على عدد أو نوع الصلاحيات التي يمكن أن يحملها.
* **Privilege escalation مؤكد (انظر §16 و§20)**: `roles:Create` + `permissions:Read` كافيان لإنشاء دور بكل الصلاحيات الموجودة في النظام.

---

## 7. Permission Audit

الملف: `src/modules/platform-administration/permissions/schemas/permission.schema.ts` + `permissions.service.ts`

* `name` (bilingual، للعرض فقط)، `resourceType` (تقني)، `action` (enum مغلق) — **الفصل بين Technical Identifier والـ Bilingual Display Name سليم ومطبَّق بشكل صحيح.**
* Boot-time check جيد جدًا: `validateResourceTypes()` يفشل الإقلاع لو أي `resourceType` لا يقابله Mongoose model حقيقي (`permissions.service.ts:27-41`) — منع فعلي لـ "صلاحية لا يمكن تحقيقها أبدًا".
* **لا يوجد unique index على `{resourceType, action}`** — يمكن إنشاء صلاحيتين مكررتين بنفس المعنى بـ `_id` مختلف. غير مستغَل أمنيًا لأن `PermissionsGuard` يقارن بالـ string content وليس بالـ `_id` (`permissions.guard.ts:57-60`)، لكنه Data Integrity gap حقيقي (P2).
* لا يوجد تحقق من التكرار عند `create()` — `PermissionsService.create()` يمرر مباشرة (`permissions.service.ts:44-46`).

---

## 8. JWT Audit

* **Payload**: `{sub, permissions}` للـ access، `{sub}` فقط للـ refresh (`jwt-payload.interface.ts`, `auth.service.ts:111-125`).
* **لا يوجد**: `iss`, `aud`, `jti`, ولا الأهم — **لا يوجد `type: 'access' | 'refresh'`**.
* **Algorithm**: HS256 ضمنيًا (لا `algorithm` صريح في `sign`/`verifyAsync`/`JwtStrategy`) — الاعتماد على سلوك مكتبة `jsonwebtoken` الافتراضي (ترفض `alg: none` ما لم يُفعَّل صراحة)، وهذا **يحمي فعليًا** من algorithm confusion لكنه اعتماد ضمني وليس صريحًا (P3: التوصية بتثبيت `algorithms: ['HS256']` صراحة كـ defense-in-depth).
* **JWT_SECRET**: مفروض ≥32 حرفًا عند الإقلاع (`validation.schema.ts:22`) — جيد.
* **مشكلة "Role revoked → Old JWT still valid"**: موجودة لكنها **محدودة زمنيًا بـ 15 دقيقة كحد أقصى** (عمر الـ access token) بفضل التصميم الحالي — عند `refresh()` تُعاد الصلاحيات من DB مباشرة (`auth.service.ts:94`)، فأي refresh لاحق يعكس الوضع الحقيقي فورًا. **هذا مقبول جزئيًا (rated 3/5)**، لكنه غير كافٍ لحالة تعليق حساب طارئ (Suspend فوري لموظف مطرود مثلاً) — الحساب المعلَّق لا يزال بإمكانه استخدام access token صالح لغاية 15 دقيقة بعد التعليق.
* **الثغرة الأخطر هنا (P1 — تفصيل كامل في §15/§20)**: **refresh token يمر من `JwtStrategy` كـ access token صالح** لأن التحقق فقط signature+expiry، بدون فحص `type`. النتيجة على `GET /users/me` (لا `@RequirePermission`): وصول كامل. على أي route فيه `@RequirePermission`: `user.permissions` تكون `undefined`، فـ `user?.permissions.some(...)` (`permissions.guard.ts:57`) **يرمي TypeError غير مُعالَج → 500** بدل رفض نظيف (401/403).

---

## 9. Session Audit

* **لا توجد `AuthSession` collection ولا أي تخزين للـ refresh token في DB إطلاقًا.**
* Refresh token = JWT خام، لا rotation، لا reuse detection، لا revoke، لا revoke-all.
* **لا يوجد endpoint لـ Logout إطلاقًا** (`auth.controller.ts` يحوي فقط `login` و `refresh`).
* لا شيء يربط أي "جلسة" بالمستخدم — الهوية بالكامل تُشتق من الـ JWT فقط.
* **التقييم: 0/5 — غياب كامل لهذه الطبقة.**

---

## 10. Password Audit

* Hashing: `bcryptjs`, 10 rounds — سليم تقنيًا (يُفضَّل رفعه إلى 12 كتحسين P3، ليس إلزاميًا).
* التخزين: داخل `authMethods[].passwordHash` — **بدون `select:false` → مسرَّب فعليًا (P0، §4/§17)**.
* لا يوجد تسجيل لكلمة المرور في أي مكان (grep شامل: لا `console.log`/`logger` يحمل `password` كنص خام) — **جيد**.
* **لا يوجد password change endpoint** (لمستخدم مسجَّل دخول يريد تغيير كلمة مروره).
* Enumeration protection: **موجودة وصحيحة** — رسالة "Invalid credentials" موحدة لكل من (بريد غير موجود / كلمة مرور خاطئة / حساب غير Active) (`auth.service.ts:43-59`)، باستثناء حالة القفل التي تُعلن عمدًا (قرار مقصود موثَّق في تعليق الكود، معقول أمنيًا).
* Session invalidation عند تغيير كلمة المرور: **غير قابل للتقييم — لا يوجد أصلاً endpoint لتغيير كلمة المرور.**

---

## 11. Invitation / Activation Audit

النمط الحالي المُنفَّذ فعليًا (`users.service.ts:19-27`, `create-user.dto.ts`):
```
Admin يرسل POST /users مع {name, email, password}
        ↓
UsersService.create() يُنشئ الحساب مباشرة بـ accountStatus: 'Active'
        ↓
لا يوجد أي خطوة "أول تسجيل دخول → تغيير كلمة مرور إجباري"
```

هذا يطابق **السيناريو الأول** المذكور في المهمة (Admin creates user → user receives credentials → first login → change password) — لكن **حتى "change password" غير موجود عمليًا** (لا يوجد endpoint، انظر §10)، فالسيناريو الفعلي أضعف مما هو موصوف: كلمة المرور التي يضعها الـ Admin (عبر `CreateUserDto.password`، `@MinLength(12)`) تبقى كما هي إلى الأبد ما لم يُبنَى password-change أولاً.

**التقييم مقابل السيناريو المقترح (INVITED → activation token → user creates password → MFA → ACTIVE):**
السيناريو المقترح أفضل أمنيًا بوضوح لأنه:
- Admin لا يعرف كلمة مرور المستخدم إطلاقًا (لا يمر عبر شبكة/قناة بشكل عرضة للتسريب).
- يمنع "استخدام حساب دون تفعيل حقيقي من صاحبه".
- يفتح الباب لدمج MFA عند التفعيل.

لا تعديل الآن — هذا تقييم فقط كما طُلِب.

---

## 12. Password Reset Audit

* الحقول موجودة في Schema (`passwordResetToken`, `passwordResetExpiresAt`) — **تأكدت عبر grep على المشروع بالكامل (`api/`) أنها لا تُقرأ ولا تُكتب في أي controller أو service** — استخدام واحد فقط: التصريح في `user.schema.ts` نفسه.
* **لا يوجد endpoint لطلب Reset (`forgot-password`) ولا لتأكيده (`reset-password`).**
* **التقييم: 0/5 — ميزة معلنة في الـ Schema، غير موجودة في الواقع.**

---

## 13. MFA Audit

* لا يوجد أي أثر لـ MFA في الكود (`grep` شامل لـ `MFA|TOTP|speakeasy|otplib|authenticator` = صفر نتائج حقيقية، ولا مكتبة MFA في `package.json`).
* **كيف يجب أن يدخل التصميم** (تقييم فقط، بدون تنفيذ):
  - حقول على `User`: `mfaEnabled: boolean`, `mfaSecretHash: string | null` (مُشفَّر، ليس plaintext)، `mfaRecoveryCodeHashes: string[]`.
  - Endpoint منفصل لـ enrollment (`POST /auth/mfa/enroll`) يعيد QR/secret، وverification (`POST /auth/mfa/verify`) يُفعِّل الحساب.
  - **الأهم: MFA يجب أن يكون إلزاميًا على الأقل للأدوار ذات الصلاحيات العالية** (`isSystemRole` أو صلاحيات `roles:*`/`permissions:*`)، وهذا مرتبط مباشرة بحل مشكلة الـ Privilege Escalation في §16 — MFA وحدها لا تكفي، لكنها طبقة إضافية ضرورية للحسابات القادرة على منح صلاحيات.

---

## 14. OAuth Audit (Google / Microsoft)

* **لا يوجد أي تنفيذ فعلي.** لا `passport-google-oauth20`/`passport-microsoft` في `package.json`، لا Controller route، لا Strategy، لا `state`/`PKCE`/`nonce`/`issuer`/`audience`/`redirect URI` لأن لا شيء ليُدقَّق أصلاً.
* الموجود فقط: قيمتا enum (`'Google'`, `'Microsoft'`) في `AUTH_PROVIDERS` كـ placeholder مستقبلي.
* Account linking/unlinking: غير موجود (لا يوجد endpoint لإدارة `authMethods` بعد الإنشاء، §5).
* **التقييم: 0/5 — لا شيء لتقييمه فعليًا سوى النية المعلنة في الـ Schema.**

---

## 15. Authorization Audit

الملفات: `common/guards/permissions.guard.ts`, `common/guards/jwt-auth.guard.ts`, `common/decorators/permissions.decorator.ts`

* **Default deny**: مطبَّق بشكل صحيح وعالمي (`APP_GUARD`) — أي route جديد محمي تلقائيًا، ويحتاج `@Public()` صراحة للاستثناء.
* **لا يوجد SUPER_ADMIN bypass مبرمج** في أي guard — تأكدت بالقراءة الكاملة لـ `PermissionsGuard`، المطابقة بالكامل تعتمد على المحتوى (`resourceType`/`action`) الموجود فعليًا داخل الـ JWT. هذا **نقطة قوة حقيقية** (rated positively) — لا يوجد "مفتاح سحري" مخفي في الكود، كل الصلاحية بيانات وليست منطق خاص.
* **Contextual Authorization غائبة تمامًا** — لا يوجد أي مفهوم لـ Resource Context أو Workflow State داخل `PermissionsGuard` نفسه؛ فحص الحالة (منشور/غير منشور، مقيَّد/عام) يتم — إن حدث — داخل كل Service على حدة (كما رأينا في جلسات سابقة مع `PublicationsService.getPublicSnapshot`)، وليس عبر طبقة Authorization موحدة.
* **بخصوص Results/Records/Competitions/Published vs Protected Data تحديدًا**: RBAC الحالي (resourceType+action فقط) **غير كافٍ لوحده** لتمييز "من يملك `results:Read`" عن "هل هذه النتيجة تخص بيانات محمية (قاصر مثلاً) أم لا" — هذا يحتاج فعلاً الطبقة الإضافية المذكورة في الطلب:
  ```
  RBAC + Resource Context + Workflow State
  ```
  وهذا **DESIGN DECISION REQUIRED** حقيقي وليس bug — يحتاج قرار معماري صريح من المالك حول أين تُضاف هذه الطبقة (Guard إضافي؟ منطق داخل كل Service؟).

---

## 16. Role Assignment Audit — الأخطر في هذا التقرير

**السلسلة الكاملة، مؤكدة سطرًا بسطر:**

```
المهاجم يملك فقط: roles:Create + permissions:Read + users:Update
        ↓
POST /roles  {name, permissionIds: [كل الـ id الموجودة]}
   → roles.controller.ts:18-22 لا يوجد أي سقف على عدد/نوع الصلاحيات
   → roles.service.ts:14-19 ينشئ الدور مباشرة، isSystemRole: false تلقائيًا
        ↓
PATCH /users/{نفسه}/roles  {roleIds: [id الدور الجديد]}
   → users.controller.ts:42-49، الحماية الوحيدة: users:Update
   → لا يوجد فحص "هل تحاول تعيين دور لنفسك؟" ولا "هل الصلاحيات الممنوحة أعلى مما تملكه أنت؟"
        ↓
POST /auth/refresh بالـ refresh token الحالي (لا حاجة لإعادة تسجيل الدخول!)
   → auth.service.ts:79-96 يُعيد حساب الصلاحيات من DB فورًا
        ↓
Access token جديد يحمل كل صلاحيات النظام
```

**نقطتان إضافيتان تُفاقمان الخطر:**
- حتى بدون `roles:Create`: أي شخص يملك `roles:Update` فقط يستطيع تعديل صلاحيات **أي دور غير system** (أو حتى **دور system نفسه**، لأن `updatePermissions` لا تفحص `isSystemRole` إطلاقًا — §6) ليشمل كل الصلاحيات، ثم — إن كان هو نفسه يحمل ذلك الدور أصلاً — رفع صلاحياته فورًا بمجرد `refresh`.
- **يجيب مباشرة على سؤال المهمة**: `users:Create` **لا** يمنح تلقائيًا `roles:Assign` (فصل جيد وصحيح — إنشاء المستخدم لا يقبل `roleIds` في `CreateUserDto` إطلاقًا). لكن **لا يوجد صلاحية `roles:Assign` منفصلة أصلاً** — إسناد الأدوار مربوط حاليًا بصلاحية `users:Update` العامة، وهي الصلاحية الوحيدة التي يستخدمها هذا الـ endpoint حاليًا، لكنها تصميميًا صلاحية عامة "تعديل مستخدم" وليست مخصصة لفعل حساس بهذا الحجم — لو أُضيف مستقبلاً أي endpoint آخر تحت نفس الصلاحية (تعديل بروفايل مثلاً)، سيرث صلاحية إسناد الأدوار ضمنيًا وبدون قصد.

**التقييم: 1/5 — إمكانية Full Privilege Escalation مؤكدة بأقل من 3 صلاحيات "إدارية عادية".**

---

## 17. DTO / Mass Assignment Audit

| DTO | الحقول المكشوفة | تقييم |
|---|---|---|
| `CreateUserDto` | `name, email, password` فقط | **سليم** — لا `roleIds`, لا `accountStatus`, لا `authMethods` |
| `AssignRolesDto` | `roleIds` فقط | سليم نطاقًا، لكن غير محمي من self-escalation (§16) |
| `CreateRoleDto` | `name, permissionIds` — **لا `isSystemRole`** | سليم |
| `UpdateRolePermissionsDto` | `permissionIds` فقط | سليم شكليًا، خطير سلوكيًا (§16) |
| `CreatePermissionDto` | `name, resourceType, action` | سليم |
| `LoginDto`/`RefreshDto` | `email/password` و`refreshToken` | سليم |

لا يوجد أي DTO في هذا الجزء من النظام يقبل صراحة `roleIds/permissions/isSystemRole/authzVersion/securityStamp/status/passwordHash/sessionId/tokenHash` من العميل بشكل مباشر خارج نطاقه المقصود — **مشكلة Mass Assignment الحقيقية هنا ليست في الـ DTO input بل في الـ Response output** (§4/§10): **`GET /users*` تُعيد `passwordHash` كاملاً لأن لا يوجد أي DTO للـ Response أصلاً — لا `UserResponseDto`، لا `select:false`، لا `toJSON` transform.**

---

## 18. Database Index Audit

| Collection | الموجود | الناقص المرتبط باستعلام فعلي |
|---|---|---|
| `users` | `{email:1}` unique partial ✓ | لا يوجد على `roleIds` — لكن `resolvePermissions()` يستعلم عبر `RolesService.findById()` واحدًا تلو الآخر (يعتمد على `_id` الافتراضي، لا حاجة index إضافي)، المشكلة أداء (N+1 موازٍ عبر `Promise.all`) وليست فهرسة — **توصية: استبدال بـ `Role.find({_id: {$in: roleIds}})` استعلام واحد بدل N** |
| `roles` | **لا يوجد أي index مخصص** | لا حاجة ماسة حاليًا (لا استعلام بحث بغير `_id`)، لكن `name` لو أُريد فرضه unique يحتاج index |
| `permissions` | **لا يوجد** | `{resourceType:1, action:1}` unique — لمنع التكرار المذكور في §7 |
| `auditLogs` | `{entityType,entityId,timestamp}` + `{actorId,timestamp}` ✓ | كافٍ للأنماط الموصوفة في تعليق الكود نفسه |
| Sessions/refresh tokens | غير موجودة أصلاً (§9) | — |

---

## 19. Audit Logging Audit

المُسجَّل فعليًا (مؤكد من `audit-log.interceptor.ts` + `permissions.guard.ts`):
- ✅ Role changes (`POST/PATCH /roles*`) — كـ `Create`/`Update` عام على `entityType: 'roles'`.
- ✅ Permission changes (`POST /permissions`) — نفس الآلية.
- ✅ Access Denied (`PermissionsGuard.recordDenial`) — بما فيه IP/UserAgent عبر `extractRequestContext`.

**غير مُسجَّل إطلاقًا (فجوة حقيقية، P1):**
- ❌ Login success / Login failure — `AuthController.login` لا يوجد فيها مستخدم مُصادَق (`request.user` غير موجود قبل تسجيل الدخول)، والـ interceptor يتجاهل أي طلب بلا actor عمدًا (`audit-log.interceptor.ts:90-93`).
- ❌ Logout — غير موجود أصلاً كـ endpoint.
- ❌ Token refresh.
- ❌ Session revoke — غير موجودة الميزة نفسها.
- ❌ Password change / Password reset — الميزتان غير موجودتين.
- ❌ MFA changes — غير موجودة.
- ❌ OAuth linking — غير موجود.
- ❌ Account suspension — التعديل يمر عبر endpoint عام (`users:Update`) ولا يوجد endpoint مخصص لتغيير `accountStatus` أصلاً (فعليًا: **لا يوجد أي طريقة API لتعليق/إيقاف حساب حاليًا!** لا `PATCH /users/:id/status` ولا مشابه).

**تحقق السرية**: لا تسجيل لكلمات المرور أو التوكنات الخام في أي `AuditLog` أو `Logger` — ✅ سليم.

---

## 20. Attack Scenario Matrix

| السيناريو | محمي؟ | الدليل |
|---|---|---|
| JWT tampering (توقيع مزوَّر) | ✅ محمي | `jsonwebtoken`/`passport-jwt` يرفض توقيعًا غير مطابق للـ secret |
| JWT algorithm confusion | ✅ محمي (ضمنيًا) | لا `alg: none`، secret ثابت symmetric فقط — لكن غير مثبَّت صراحة (P3) |
| Expired JWT | ✅ محمي | `ignoreExpiration: false` (`jwt.strategy.ts:16`) |
| Revoked role, old JWT still valid | ⚠️ محدود (15 دقيقة كحد أقصى) | مقبول جزئيًا، غير كافٍ لحالة تعليق طارئ |
| Refresh token reuse | ❌ **غير محمي** | لا تخزين، لا rotation، لا كشف إعادة استخدام |
| Session hijacking | ❌ **غير قابل للتخفيف** | لا مفهوم جلسة أصلاً لإبطالها |
| Privilege escalation (عام) | ❌ **غير محمي** | §16 |
| Role self-assignment | ❌ **غير محمي** | `AssignRolesDto` بلا فحص self/escalation |
| Permission self-assignment (عبر تعديل دور تملكه) | ❌ **غير محمي** | `updatePermissions` بلا سقف |
| SUPER_ADMIN escalation | ❌ **غير محمي (مؤكد قابل للتنفيذ)** | §16 السلسلة الكاملة |
| Activation token reuse | غير قابل للتقييم | الميزة غير موجودة |
| Password reset token reuse | غير قابل للتقييم | الميزة غير موجودة (§12) |
| OAuth account linking abuse | غير قابل للتقييم | الميزة غير موجودة (§14) |
| MFA bypass | غير قابل للتقييم | الميزة غير موجودة (§13) |
| Suspended user login | ✅ محمي عند login/refresh | `auth.service.ts:57-59, 90-91` |
| Suspended user, existing access token | ⚠️ صالح لغاية 15 دقيقة | نفس ملاحظة "Revoked role" أعلاه |
| Disabled/Deactivated user login | ✅ نفس آلية Suspended | `accountStatus !== 'Active'` تشمل كل الحالات غير Active |
| Mass assignment (input) | ✅ محمي | §17 |
| Mass assignment (output leak) | ❌ **غير محمي — password hash مسرَّب** | §4/§10/§17 |
| Race condition (lockout) | ⚠️ جزئي | `recordFailedLogin` يأخذ `currentAttempts` من قراءة سابقة (ليس atomic `$inc`) — سباق نظري بين طلبين متزامنين قد يُضيّع عداد محاولة واحدة، تأثير أمني منخفض (يؤخر القفل بمحاولة واحدة على الأكثر، لا يمنعه) |
| **Refresh token used as Access token** | ❌ **غير محمي (مؤكد)** | §8، `permissions.guard.ts:57` (TypeError على routes محمية) أو وصول كامل على routes بلا `@RequirePermission` |

---

## 21. P0/P1/P2/P3 Findings

### P0 — Critical (يجب إصلاحها فورًا)
1. تسريب `authMethods[].passwordHash` عبر `GET /users`, `GET /users/:id`, `GET /users/me`.
2. سلسلة Privilege Escalation الكاملة (`roles:Create`/`roles:Update` + `users:Update` → Super Admin فعلي).
3. `isSystemRole` لا يحمي `updatePermissions()`.
4. غياب كامل لأي آلية Logout/Session Revocation/Refresh Token Rotation.

### P1 — High (قبل الإنتاج)
5. Refresh token قابل للاستخدام كـ Access token (غياب claim `type`) — وصول كامل على routes بلا `@RequirePermission`، و 500 غير مُعالَج على الباقي.
6. Password Reset غير منفذ رغم وجود الحقول.
7. لا يوجد Password Change endpoint إطلاقًا.
8. لا يوجد endpoint لتغيير `accountStatus` (تعليق/إيقاف حساب) — لا آلية طوارئ لإيقاف موظف فورًا.
9. Login/Logout/Refresh/Password events غير مُسجَّلة في `auditLogs`.
10. صلاحية `roles:Assign` غير منفصلة عن `users:Update` العامة.

### P2 — Medium (تحسين مهم)
11. لا يوجد unique index على `permissions.{resourceType,action}`.
12. `resolvePermissions()` يستعلم الأدوار بنمط N+1 موازٍ بدل استعلام `$in` واحد.
13. `AuthMethod` بلا تحقق provider-specific (passwordHash/providerId حسب النوع).
14. `recordFailedLogin` غير atomic بالكامل (سباق نظري بسيط الأثر).
15. لا `securityStamp`/`authzVersion` لإبطال فوري لكل الـ JWT الصادرة عند حدث أمني.

### P3 — Low (تحسين اختياري)
16. تثبيت `algorithm: 'HS256'` صراحة في `sign`/`verify` كـ defense-in-depth.
17. رفع `PASSWORD_HASH_ROUNDS` من 10 إلى 12.
18. إضافة `iss`/`aud`/`jti` للـ JWT.
19. unique index على `roles.name`.

---

## 22. Recommended Target Architecture (تصور مقترح فقط — بدون تنفيذ)

```
AuthSession collection جديدة:
  userId, refreshTokenHash (hashed لا plaintext), issuedAt,
  expiresAt, revokedAt, replacedBySessionId, ipAddress, userAgent

login/refresh:
  → ينشئ/يُدوِّر AuthSession، يُخزِّن hash فقط
  → JWT يحمل type + jti يشير لـ sessionId

logout:
  → POST /auth/logout يُبطل الـ session الحالية
  → POST /auth/logout-all يُبطل كل جلسات المستخدم (securityStamp++)

Role/Permission mutation:
  → قاعدة: "لا يمكنك منح صلاحية لا تملكها بنفسك حاليًا"
  → isSystemRole يحمي rename+delete+updatePermissions معًا
  → roles:Assign صلاحية منفصلة عن users:Update

users:Read response:
  → UserResponseDto صريح (allowlist)، بدون authMethods كاملة إطلاقًا

Invitation flow:
  → INVITED status + activation token مُشفَّر + one-time use
```

هذا وصف اتجاه عام فقط للنقاش — أي تفاصيل تنفيذية (تسمية Collections، شكل الـ Migration) يجب أن تُقرَّر في مرحلة APPROVAL وليس هنا.

---

## 23. Exact Changes Required (لكل تغيير: File / Problem / Change / Reason / Risk / Migration / Dependencies)

**التغيير 1 — إخفاء passwordHash من الاستجابات**
- File: `users/schemas/auth-method.schema.ts`, `users/users.controller.ts`, `users/users.service.ts` (+ `UserResponseDto` جديد)
- Current Problem: `passwordHash` بلا `select:false`، ولا DTO للـ response.
- Recommended Change: `@Prop({select:false})` على `passwordHash` + `UserResponseDto` صريح لكل من `findAll/findOne/me`.
- Security Reason: منع تسريب بيانات قابلة لهجوم offline cracking.
- Risk if Not Fixed: اختراق كل حسابات النظام بمن فيهم Super Admin عبر صلاحية `users:Read` فقط.
- Migration Impact: لا يوجد (تغيير كود فقط، لا Schema migration للبيانات الموجودة).
- Dependencies: لا شيء.

**التغيير 2 — منع Privilege Escalation**
- File: `roles/roles.service.ts` (`updatePermissions`, `create`), `users/users.service.ts` (`assignRoles`)
- Current Problem: لا سقف على الصلاحيات الممنوحة، `isSystemRole` غير مُفعَّل في `updatePermissions`.
- Recommended Change: قاعدة "لا يمكن منح permissionId لا يملكه الـ actor الحالي بنفسه" + `assertNotSystemRole` في `updatePermissions` + منع self-role-assignment بدون صلاحية مخصصة إضافية.
- Security Reason: إغلاق السلسلة الكاملة في §16/§20.
- Risk if Not Fixed: Full Super Admin escalation بثلاث صلاحيات "عادية".
- Migration Impact: لا شيء على البيانات؛ يحتاج تمرير `currentUser` context لـ `RolesService`.
- Dependencies: التغيير 5 (فصل `roles:Assign`) مرتبط منطقيًا.

**التغيير 3 — Session/Revocation Layer**
- File: جديد `platform-administration/auth-sessions/*`, تعديل `auth.service.ts`, إضافة `POST /auth/logout`
- Current Problem: لا تخزين ولا إبطال لأي refresh token.
- Recommended Change: `AuthSession` collection + hashed refresh tokens + rotation + logout/logout-all.
- Security Reason: إغلاق §9/§20 (session hijacking, refresh reuse).
- Risk if Not Fixed: توكن مسروق صالح 7 أيام كاملة بلا أي طريقة لإيقافه.
- Migration Impact: Migration جديدة (collection جديدة)، لا تعديل بيانات موجودة.
- Dependencies: التغيير 4 (claim `type`).

**التغيير 4 — تمييز Access/Refresh بـ claim**
- File: `common/interfaces/jwt-payload.interface.ts`, `auth.service.ts`, `jwt.strategy.ts`, `permissions.guard.ts`
- Current Problem: لا `type` claim، refresh token يمر كـ access token.
- Recommended Change: `{sub, type: 'access', permissions}` / `{sub, type: 'refresh'}` + رفض `type !== 'access'` في `JwtStrategy.validate`.
- Security Reason: إغلاق §8/§20.
- Risk if Not Fixed: وصول كامل عبر refresh token على routes بلا `@RequirePermission`، وأخطاء 500 على الباقي.
- Migration Impact: لا شيء (JWT الحالية القديمة تنتهي طبيعيًا خلال 15 دقيقة/7 أيام).
- Dependencies: لا شيء.

**التغيير 5 — صلاحية roles:Assign منفصلة**
- File: `users/users.controller.ts`
- Current Problem: `PATCH /users/:id/roles` تحت `users:Update` العامة.
- Recommended Change: `@RequirePermission('users', 'AssignRoles')` أو صلاحية جديدة مخصصة.
- Security Reason: منع وراثة صلاحية حساسة عبر صلاحية عامة مستقبلية.
- Risk if Not Fixed: توسّع صلاحية `users:Update` لاحقًا يمنح إسناد أدوار بدون قصد.
- Migration Impact: seed data جديدة لصلاحية إضافية.
- Dependencies: تحديث `PERMISSION_ACTIONS` enum.

**التغيير 6 — Password Reset فعلي**
- File: جديد DTOs + endpoints في `auth.controller.ts`/`auth.service.ts`، استخدام الحقول الموجودة فعليًا مع hashing للتوكن.
- Current Problem: ميزة معلنة وغير منفذة.
- Security Reason: تمكين استرجاع حساب آمن بدون تدخل Admin يدوي.
- Risk if Not Fixed: لا وجود لمسار استرجاع رسمي (يعني على الأرجح مسارات غير رسمية/يدوية أخطر).
- Migration Impact: لا شيء على البيانات.
- Dependencies: بنية إرسال بريد (غير مذكورة في الفحص الحالي — تحتاج تأكيد وجودها).

**التغييرات 7-9** (Password Change endpoint، Account Suspend endpoint، Auth-lifecycle Audit Logging) تتبع نفس النمط أعلاه ولم أُفصِّلها سطرًا بسطر توفيرًا للمساحة — لكنها P1 مؤكدة ويجب أن تدخل نفس دورة APPROVAL.

---

**لا شيء أعلاه "تم إصلاحه" — كل ما ورد نتيجة قراءة فعلية بدون أي تعديل. بانتظار موافقتك للانتقال من AUDIT إلى APPROVAL.**
