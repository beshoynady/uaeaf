import { normalizeArabic } from './arabic-normalize.js';

describe('normalizeArabic', () => {
  it.each([
    ['أحمد', 'احمد'],
    ['إبراهيم', 'ابراهيم'],
    ['آمنة', 'امنه'],
    ['رياضة', 'رياضه'],
    ['مصطفى', 'مصطفي'],
    ['الْعَدْوُ', 'العدو'],
    ['الشــــارقة', 'الشارقه'],
  ])('%s يصير %s', (input, expected) => {
    expect(normalizeArabic(input)).toBe(expected);
  });

  it('يترك اللاتيني والأرقام كما هي', () => {
    expect(normalizeArabic('UAEAF 2026')).toBe('UAEAF 2026');
  });

  it('متكافئ مع نفسه — تطبيع المُطبَّع لا يغيّره', () => {
    const once = normalizeArabic('أحمد الشــارقة');
    expect(normalizeArabic(once)).toBe(once);
  });
});
