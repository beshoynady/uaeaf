/**
 * One spelling for text that a reader types many ways.
 *
 * Arabic has several characters a reader treats as the same letter — the four
 * alifs, ta marbuta against ha, alif maqsura against ya, hamza carriers —
 * plus diacritics and tatweel, which are typed inconsistently or not at all.
 * Without this, a search for "احمد" finds nothing written "أحمد", which is
 * most of the corpus.
 *
 * Applied to BOTH the stored value and the query, so the two meet in the same
 * spelling. It must therefore be idempotent: normalizing an already-normalized
 * string leaves it unchanged. Latin text and digits pass through untouched.
 */
export const normalizeArabic = (text: string): string =>
  text
    .normalize('NFKD')
    // Arabic diacritics (harakat, tanwin, sukun, shadda, quranic marks).
    .replace(/[ؐ-ًؚ-ٟۖ-ۜ۟-۪ۨ-ٰۭ]/g, '')
    // Tatweel (kashida), used to stretch a word visually.
    .replace(/ـ/g, '')
    .replace(/[آأإٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
