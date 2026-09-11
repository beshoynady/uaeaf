# بوابات الجودة: الـ pre-push hook والـ CI

بوابتان تكمّل إحداهما الأخرى. الـ hook يفحص على الجهاز ما هو سريع ومكلف الاكتشاف لاحقًا. الـ CI يفحص كل شيء على الـ commit المدفوع نفسه، على GitHub وبالتوازي. الحارس البطيء يُتخطّى، لذلك يبقى الـ hook قصيرًا عمدًا، وكل ما هو أثقل يذهب إلى الـ CI.

## ما يفحصه الـ pre-push hook

الملف: `.husky/pre-push`. يعمل عند كل `git push`.

| الفحص | الأمر | عند الفشل |
|---|---|---|
| الـ API يُترجَم (فحص الأنواع لمصادر الإنتاج في `api/src`) | `npm run build:openapi` | يُوقَف الـ push |
| `api/openapi.json` مطابق للـ API المترجَم وللنسخة في آخر commit | المولّد، ثم `git diff --quiet HEAD -- api/openapi.json` | يُوقَف الـ push برسالة بالعربية والإنجليزية |
| تنبيه: في `api/src` تعديلات لم تُلتزَم | `git status --porcelain -- api/src` | تنبيه فقط، والفحص يشملها |

- **البناء:** يبني في `api/dist-openapi/` عبر `api/tsconfig.openapi.json`، ولا يلمس `api/dist/` أبدًا. لذلك يبقى incremental ولا يتعارض مع `npm run start:dev` الشغال. (`nest build` يحذف `dist/` وملف الـ tsbuildinfo في كل تشغيل.)
- **MongoDB:** المولّد يشغّل التطبيق كاملًا، فيحتاج `MONGODB_URI` متاحًا في `api/.env`. لخطوة التوليد حد 60 ثانية.
- **الزمن على جهاز التطوير (مقيس 2026-09-11):** 11–19 ثانية في التشغيل العادي، و30–63 ثانية في أول تشغيل بعد استنساخ المستودع أو حذف `dist-openapi/`.

## ما يفحصه الـ CI

الملف: `.github/workflows/ci.yml`. يعمل مع كل push على `main`، ويدويًا من تبويب Actions (`workflow_dispatch`). كل القيم فيه وهمية للاختبار: لا secrets، ولا اتصال بـ Atlas.

| الـ job | الفحوص | ما يحتاجه داخل الـ runner |
|---|---|---|
| `api-checks` | فحص الأنواع والترجمة، ثم تطابق `openapi.json` بنفس منطق الـ hook، ثم lint (`oxlint`) | MongoDB service container للمولّد |
| `api-unit` | اختبارات الوحدة (Jest) | mongod داخل الذاكرة لكل suite (`mongodb-memory-server`) |
| `api-e2e` | اختبارات e2e (Jest) | mongod داخل الذاكرة لكل suite، وقيم env تضعها كل suite لنفسها |
| `apps` (`web`، `dashboard`) | بناء الـ design tokens، ثم `next typegen`، ثم `tsc --noEmit` وlint واختبارات Vitest | لا شيء خارجي |

تعمل خمسة jobs بالتوازي، لأن `apps` مصفوفة من تطبيقين. الـ packages: `content` و`ui` فارغتان، و`design-tokens` بلا tsconfig خاص. الـ TypeScript الوحيد فيها (`testing/`) يُفحص من خلال `web` الذي يستورده، وبناؤها يعمل في job الـ `apps`.

**تشغيل أي فحص محليًا:** في `api/`:
- `npm run generate:openapi`
- `npm run lint`
- `npm test`
- `npm run test:e2e`

وفي `apps/<app>/`:
- `npx next typegen && npx tsc --noEmit`
- `npm run lint`
- `npm test`

## ما لا يفحصه أيٌّ منهما بعد

- **أنواع كود الاختبارات في `api`:** ts-jest لا يفحص الأنواع (`isolatedModules`)، و`tsc -p tsconfig.json` يُظهر 97 خطأ في 39 ملف اختبار (2026-09-11). يُضاف إلى الـ CI بعد إصلاحها.
- **pre-commit / lint-staged:** مؤجَّل.

## متى يُقبل `git push --no-verify`

**في حالة طارئة موثَّقة فقط**، مثل إصلاح عاجل للإنتاج والـ hook لا يمكن تشغيله على الجهاز لسبب خارج الكود، كتعطّل MongoDB المحلية. والتوثيق يعني:

1. سطر في رسالة الـ commit: `no-verify: <السبب>`.
2. مراجعة نتيجة الـ CI لذلك الـ commit فور انتهائها، وإصلاح أي فحص أحمر في الـ commit التالي.

لا يُقبل بسبب البطء، ولا لأن الـ hook "خاطئ". الـ hook جزء من المستودع: إن كان خاطئًا يُصلَح هو، ولا يُتخطّى.
