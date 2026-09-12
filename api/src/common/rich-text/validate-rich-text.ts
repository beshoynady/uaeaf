import {
  RICH_TEXT_HEADING_LEVELS,
  RICH_TEXT_LINK_RELS,
  RICH_TEXT_LINK_SCHEMES,
  RICH_TEXT_LINK_TARGETS,
  RICH_TEXT_MARKS,
  RICH_TEXT_MARK_ATTRS,
  RICH_TEXT_MARKS_REFUSED_BY_LANG,
  RICH_TEXT_MAX_DEPTH,
  RICH_TEXT_MAX_LENGTH,
  RICH_TEXT_NODE_ATTRS,
  RICH_TEXT_NODES,
} from './rich-text-allowlist.js';
import type { RichTextLang } from './rich-text-allowlist.js';

/**
 * Why a stored rich-text document was refused, and where.
 *
 * `rule` is a closed identifier the dashboard branches on and translates;
 * `path` locates the offending node so the editor can point at it rather
 * than telling the author only that "something" is wrong.
 */
export interface RichTextViolation {
  path: string;
  rule: RichTextRule;
}

export const RICH_TEXT_RULES = [
  'notADocument',
  'malformedNode',
  'nodeNotAllowed',
  'markNotAllowed',
  'markNotAllowedInLanguage',
  'attributeNotAllowed',
  'headingLevelNotAllowed',
  'linkSchemeNotAllowed',
  'tooDeep',
  'tooLong',
] as const;
export type RichTextRule = (typeof RICH_TEXT_RULES)[number];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** ProseMirror writes an unset attribute as `null`; treat that as absent. */
const isSet = (value: unknown): boolean => value !== null && value !== undefined;

const hasAllowedScheme = (href: string): boolean => {
  // `new URL` rejects a relative href, which is the intended outcome: a
  // stored document points at an absolute destination or at nothing.
  try {
    return (RICH_TEXT_LINK_SCHEMES as readonly string[]).includes(new URL(href).protocol);
  } catch {
    return false;
  }
};

/**
 * Every way the given document breaks the allowlist, in document order.
 *
 * Returns all violations rather than the first, so an author pasting a
 * styled document is told everything that will be stripped in one pass
 * instead of one rejection per save.
 */
export function validateRichText(doc: unknown, lang: RichTextLang): RichTextViolation[] {
  if (!isRecord(doc) || doc.type !== 'doc') {
    return [{ path: 'doc', rule: 'notADocument' }];
  }

  const violations: RichTextViolation[] = [];
  const refusedMarks = RICH_TEXT_MARKS_REFUSED_BY_LANG[lang];
  let textLength = 0;
  let reportedTooDeep = false;

  const visitAttrs = (
    attrs: unknown,
    allowed: readonly string[],
    path: string,
  ): Record<string, unknown> => {
    if (!isRecord(attrs)) {
      return {};
    }

    for (const [key, value] of Object.entries(attrs)) {
      if (isSet(value) && !allowed.includes(key)) {
        violations.push({ path: `${path}.attrs.${key}`, rule: 'attributeNotAllowed' });
      }
    }

    return attrs;
  };

  const visitMark = (mark: unknown, path: string): void => {
    if (!isRecord(mark) || typeof mark.type !== 'string') {
      violations.push({ path, rule: 'malformedNode' });
      return;
    }

    const type = mark.type;

    if (!(RICH_TEXT_MARKS as readonly string[]).includes(type)) {
      violations.push({ path, rule: 'markNotAllowed' });
      return;
    }

    if (refusedMarks.includes(type)) {
      violations.push({ path, rule: 'markNotAllowedInLanguage' });
      return;
    }

    const attrs = visitAttrs(mark.attrs, RICH_TEXT_MARK_ATTRS[type] ?? [], path);

    if (type !== 'link') {
      return;
    }

    const { href, target, rel, class: className } = attrs;

    if (typeof href !== 'string' || !hasAllowedScheme(href)) {
      violations.push({ path: `${path}.attrs.href`, rule: 'linkSchemeNotAllowed' });
    }

    if (isSet(target) && !(RICH_TEXT_LINK_TARGETS as readonly unknown[]).includes(target)) {
      violations.push({ path: `${path}.attrs.target`, rule: 'attributeNotAllowed' });
    }

    if (isSet(rel) && !(RICH_TEXT_LINK_RELS as readonly unknown[]).includes(rel)) {
      violations.push({ path: `${path}.attrs.rel`, rule: 'attributeNotAllowed' });
    }

    if (isSet(className)) {
      violations.push({ path: `${path}.attrs.class`, rule: 'attributeNotAllowed' });
    }
  };

  const visitNode = (node: unknown, path: string, depth: number): void => {
    if (!isRecord(node) || typeof node.type !== 'string') {
      violations.push({ path, rule: 'malformedNode' });
      return;
    }

    if (depth > RICH_TEXT_MAX_DEPTH) {
      if (!reportedTooDeep) {
        violations.push({ path, rule: 'tooDeep' });
        reportedTooDeep = true;
      }
      return;
    }

    const type = node.type;

    if (!(RICH_TEXT_NODES as readonly string[]).includes(type) || type === 'doc') {
      violations.push({ path, rule: 'nodeNotAllowed' });
      return;
    }

    const attrs = visitAttrs(node.attrs, RICH_TEXT_NODE_ATTRS[type] ?? [], path);

    if (type === 'heading') {
      if (!(RICH_TEXT_HEADING_LEVELS as readonly unknown[]).includes(attrs.level)) {
        violations.push({ path: `${path}.attrs.level`, rule: 'headingLevelNotAllowed' });
      }
    }

    if (type === 'orderedList' && isSet(attrs.start)) {
      const start = attrs.start;
      if (typeof start !== 'number' || !Number.isInteger(start) || start < 1) {
        violations.push({ path: `${path}.attrs.start`, rule: 'attributeNotAllowed' });
      }
    }

    if (type === 'orderedList' && isSet(attrs.type)) {
      violations.push({ path: `${path}.attrs.type`, rule: 'attributeNotAllowed' });
    }

    if (type === 'text') {
      if (typeof node.text !== 'string') {
        violations.push({ path, rule: 'malformedNode' });
        return;
      }
      textLength += node.text.length;
    }

    if (Array.isArray(node.marks)) {
      node.marks.forEach((mark, index) => visitMark(mark, `${path}.marks[${index}]`));
    } else if (isSet(node.marks)) {
      violations.push({ path: `${path}.marks`, rule: 'malformedNode' });
    }

    if (Array.isArray(node.content)) {
      node.content.forEach((child, index) =>
        visitNode(child, `${path}.content[${index}]`, depth + 1),
      );
    } else if (isSet(node.content)) {
      violations.push({ path: `${path}.content`, rule: 'malformedNode' });
    }
  };

  if (Array.isArray(doc.content)) {
    doc.content.forEach((child, index) => visitNode(child, `doc.content[${index}]`, 2));
  } else if (isSet(doc.content)) {
    violations.push({ path: 'doc.content', rule: 'malformedNode' });
  }

  if (textLength > RICH_TEXT_MAX_LENGTH) {
    violations.push({ path: 'doc', rule: 'tooLong' });
  }

  return violations;
}
