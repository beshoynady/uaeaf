import { ApiProperty } from '@nestjs/swagger';
import { registerDecorator } from 'class-validator';
import type { ValidationArguments, ValidationOptions } from 'class-validator';
import { validateRichText } from '../rich-text/validate-rich-text.js';
import type { RichTextLang } from '../rich-text/rich-text-allowlist.js';

/**
 * Refuses a rich-text document that breaks the allowlist for its language
 * (ADR-0069 D1).
 *
 * The message names every violation and where it sits, so a paste that
 * carries five disallowed things is reported once with all five rather than
 * five saves later. The dashboard branches on the rule identifiers; the
 * English prose beside them is for a log.
 */
export function IsRichTextDoc(lang: RichTextLang, options?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isRichTextDoc',
      target: object.constructor,
      propertyName,
      constraints: [lang],
      options,
      validator: {
        validate(value: unknown): boolean {
          return validateRichText(value, lang).length === 0;
        },
        defaultMessage(args: ValidationArguments): string {
          const violations = validateRichText(args.value, lang)
            .map((violation) => `${violation.path}: ${violation.rule}`)
            .join('; ');

          return `${args.property} is not allowed rich text for "${lang}" — ${violations}`;
        },
      },
    });
  };
}

/**
 * Request shape for a bilingual rich-text field. Each side is a whole
 * ProseMirror document, validated against its own language's allowlist —
 * which is why the two properties do not share one decorator.
 */
export class LocalizedRichTextDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description:
      'English body as a ProseMirror/TipTap document. Allowed nodes: doc, paragraph, text, ' +
      'heading (level 2-3), bulletList, orderedList, listItem, blockquote, horizontalRule, ' +
      'hardBreak. Allowed marks: bold, link (https/http/mailto), italic.',
  })
  @IsRichTextDoc('en')
  en: Record<string, unknown>;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description:
      'Arabic body as a ProseMirror/TipTap document. Same allowlist as English MINUS italic, ' +
      'which breaks Arabic letter joins (Chapter 4 §4.6). No textAlign in either language, ' +
      'which is how justify and manual alignment are refused.',
  })
  @IsRichTextDoc('ar')
  ar: Record<string, unknown>;
}
