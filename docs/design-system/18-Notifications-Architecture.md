# Chapter 18 — Notifications Architecture

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** Accepted | **Last Updated:** هذه الجلسة | **Document Owner:** مالك المشروع

> **Status: Frozen (Baseline v1.0).** أي تغيير بعد التجميد **MUST** يُدخَل حصريًا عبر ADR جديد أو بند Backlog موثَّق.

## Depends On / Used By
| Depends On | Used By |
|---|---|
| Chapter 8 L4 (Toast/Snackbar، §FB.23 Rate Limiting، §FB.24 Cross-Tab Sync) · Chapter 9 (§CR-6.x Notification Content) · Chapter 8 L7 (§EC.12 Long-Running Operation) · Chapter 17 (Consent/Privacy) | Chapter 13 (تنبيهات محتوى بانتظار المراجعة) · Chapter 20 |

## Scope
**يغطي:** معمارية محرك الإشعارات المستقل متعدد القنوات — الأنواع، المحفّزات، التفضيلات، الموثوقية، الاتساق بين القنوات.
**لا يغطي:** التصميم البصري لأي إشعار فردي (Chapter 8 L4 وحده المصدر)، صياغة نصوصها (Chapter 9 §CR-6.x وحده المصدر).

## Definitions
| المصطلح | التعريف |
|---|---|
| **Notification Engine** | خدمة مركزية مستقلة عن منطق العمل، تستقبل أحداثًا وتوزّعها عبر القنوات المناسبة |
| **Channel** | وسيلة توصيل إشعار (داخل التطبيق، بريد، Push، SMS/WhatsApp) |
| **Delivery Guarantee** | مستوى الضمان بأن الإشعار وصل فعليًا (At-most-once، At-least-once) |

## Purpose
يحوّل قرار Discovery ("Notification Engine مستقل متعدد القنوات") إلى معمارية كاملة تحكم كل تنبيه في المنصة — من اعتماد محتوى (Chapter 13) إلى انتهاء رفع ملف كبير (Chapter 8 L7).

---

## ADR-0030: Notification Engine Architecture

| الحقل | التفاصيل |
|---|---|
| **Status** | Accepted |
| **Authority** | Engineering Decision (يطبّق قرار Discovery الأصلي) |
| **Context** | مصادر إشعارات متعددة عبر المنصة (اعتماد محتوى Chapter 13، اكتمال استيراد Chapter 8 L7، تحديث نتيجة حية Chapter 8 L5) — بدون محرك موحّد، كل Module يبني منطق إرسال خاصًا فيتشتت ويصعب ضبطه |
| **Decision** | كل حدث يستدعي إشعارًا **MUST** يمر عبر **Notification Engine مركزي واحد** مستقل عن منطق العمل — أي Module **MUST NOT** يرسل إشعارًا مباشرة (بريد، SMS) بمعزل عن المحرك. المحرك **MUST** يستقبل حدثًا مجرّدًا (نوع، مستلم، بيانات سياقية) ويقرر بنفسه القناة/القنوات المناسبة بناءً على §3 تفضيلات المستخدم و§2 نوع الحدث |
| **Alternatives Considered** | كل Module يستدعي خدمة بريد/SMS مباشرة بنفسه — رُفض (يصعب ضبط §5 Rate Limiting و§6 تفضيلات المستخدم مركزيًا) |
| **Why This Decision** | نقطة تحكم واحدة تضمن اتساق §5 (تجميع الإشعارات، Chapter 8 L4 §FB.23) و§6 (احترام تفضيلات إيقاف الإشعارات) عبر كل مصادر الأحداث |
| **Risks** | نقطة فشل مركزية واحدة (Single Point of Failure) إن تعطّل المحرك. Mitigation: فشل المحرك **MUST NOT** يمنع العملية الأساسية من الاكتمال (مثال: نجاح استيراد بيانات **MUST NOT** يعتمد على نجاح إرسال إشعاره) — يطابق Chapter 8 L4 §FB Widget/Feedback Failure Isolation بنفس الروح |
| **Consequences** | كل ميزة جديدة تحتاج إشعارًا **MUST** تُصدر حدثًا للمحرك، لا تنفّذ الإرسال بنفسها |

---

## 1. Channel Types (مرجعي من Discovery)
| القناة | الاستخدام | الأولوية |
|---|---|---|
| **In-App** | Toast/Snackbar (Chapter 8 L4)، مركز إشعارات | أساسية دائمًا |
| **Email** | ملخصات، تأكيدات رسمية | ثانوية |
| **Push** | مستقبلية (تطبيق موبايل) | مستقبلية، البنية جاهزة الآن (PR-008) |
| **SMS/WhatsApp** | أحداث مهمة فقط (Chapter 0 Discovery: ليست لكل شيء) | حرجة فقط |

## 2. Notification Triggers
كل حدث محفِّز **MUST** يُصنَّف: `Critical` (انتهاء جلسة، Chapter 17 §6) · `Workflow` (بانتظار اعتمادك، Chapter 13 §5) · `Informational` (اكتمال عملية، Chapter 8 L7 §EC.12) · `Social/Engagement` (مستقبلي، تفاعل جمهور).

## 3. Notification Preferences (يستهلك Chapter 17)
كل مستخدم **MUST** تحكّم بتفضيلاته لكل نوع/قناة (تشغيل/إيقاف) — **MUST NOT** إشعارات `Critical` (§2) قابلة للإيقاف الكامل (أمان الحساب لا يخضع لتفضيل شخصي)، بينما `Informational` و`Social` **MUST** قابلة للتحكم الكامل.

## 4. Notification Content (مرجعي — يستهلك Chapter 9)
يطبّق Chapter 9 §CR-6.1/6.2/6.3 مباشرة — لا صياغة مستقلة هنا.

## 5. Rate Limiting & Grouping (يستهلك Chapter 8 L4 §FB.23)
المحرك **MUST** يطبّق نفس منطق Chapter 8 L4 §FB.23 على مستوى كل القنوات لا In-App فقط — بريد يحتوي "12 تحديثًا" مُجمَّعًا بدل 12 بريدًا منفصلاً خلال دقائق قليلة.

## 6. Cross-Channel Consistency
نفس الحدث **MUST NOT** معلومة متناقضة بين قناتين (Toast داخل التطبيق يقول شيئًا والبريد المرسَل لنفس الحدث يقول آخر) — Notification Engine (ADR-0030) يضمن مصدرًا واحدًا للمحتوى قبل توزيعه على القنوات.

## 7. Delivery Reliability
فشل توصيل عبر قناة واحدة (بريد مرتد) **MUST NOT** يمنع التوصيل عبر القنوات الأخرى المفعَّلة لنفس المستخدم — قنوات مستقلة التنفيذ (يطابق مبدأ Chapter 8 L4 §FB Widget Isolation، مطبَّقًا هنا على القنوات).

## 8. Unsubscribe & Compliance
كل بريد/SMS (باستثناء `Critical`، §2) **MUST** رابط/طريقة إلغاء اشتراك واضحة ومباشرة — يتوافق مع متطلبات قانونية عامة لمكافحة الرسائل غير المرغوبة، ويحترم Chapter 17 (حق التحكم ببيانات التواصل).

---

## Do & Don't
**Do:** أصدر حدثًا للمحرك المركزي لأي تنبيه جديد (ADR-0030) · احترم تصنيف §2 عند تحديد إمكانية إيقاف الإشعار
**Don't:** لا ترسل بريد/SMS مباشرة من أي Module بمعزل عن المحرك · لا تجعل نجاح عملية أساسية معتمدًا على نجاح إشعارها

## Success Metrics
- 100% من الإشعارات تصدر عبر Notification Engine المركزي، لا استدعاء مباشر من أي Module
- 0 عملية أساسية تفشل بسبب فشل إرسال إشعارها (§Risks Mitigation)
- 100% من إشعارات `Critical` غير قابلة للإيقاف الكامل (§3)
- 0 تناقض محتوى بين قناتين لنفس الحدث (§6)

## References
**Normative:** Chapter 0 (Discovery) · Chapter 8 L4/L7 · Chapter 9 §CR-6.x · Chapter 17
**Implementation:** Chapter 21 (التفاصيل التقنية الكاملة)

## Related Chapters
Chapter 8 L4/L7 · Chapter 9 · Chapter 13 · Chapter 17 · Chapter 21

---

*نهاية Chapter 18. الفصل التالي: Chapter 19 — Calendar & Localization.*
