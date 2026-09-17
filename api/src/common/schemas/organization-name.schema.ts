import { BadRequestException } from '@nestjs/common';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/** The longest side a name may have (`07-Mongoose-Schema-Specification.md`
 *  Domain 9, `maxlength: 150` on every organisation name). */
export const ORGANIZATION_NAME_MAX = 150;

export interface OrganizationNameInput {
  ar?: string | null;
  en?: string | null;
}

/** Characters as a reader counts them: grapheme clusters. */
const graphemes = (text: string): number =>
  [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].length;

/** A blank side is an absent side, so " " can never pass as a name. */
const side = (value: string | null | undefined): string | null => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed ? trimmed : null;
};

/**
 * An organisation's name as the organisation writes it (ADR-0085 D4): English
 * only, Arabic only, or both — never a translation or a transliteration the
 * federation made up. `LocalizedText` stays bilingual-required everywhere else.
 */
@Schema({ _id: false })
export class OrganizationName {
  // Required only while the other side is empty: at least one of the two must
  // exist even for a write that bypasses the service.
  @Prop({
    type: String,
    default: null,
    set: side,
    maxlength: ORGANIZATION_NAME_MAX,
    required: [
      function (this: OrganizationNameInput) {
        return !side(this.en);
      },
      'An organisation name needs an Arabic or an English side.',
    ],
  })
  ar: string | null;

  @Prop({
    type: String,
    default: null,
    set: side,
    maxlength: ORGANIZATION_NAME_MAX,
    required: [
      function (this: OrganizationNameInput) {
        return !side(this.ar);
      },
      'An organisation name needs an Arabic or an English side.',
    ],
  })
  en: string | null;
}

export const OrganizationNameSchema = SchemaFactory.createForClass(OrganizationName);

/**
 * The name as it is stored, or a refusal the dashboard can place beside its
 * field.
 *
 * @throws BadRequestException `missingRequiredField` when neither side has
 * text, `badRequest` when a side is longer than `ORGANIZATION_NAME_MAX`.
 */
export const normalizeOrganizationName = (
  value: OrganizationNameInput | null | undefined,
  field: string,
): OrganizationName => {
  const name = { ar: side(value?.ar), en: side(value?.en) };
  if (!name.ar && !name.en) {
    throw new BadRequestException({
      code: 'missingRequiredField',
      message: `${field} needs an Arabic or an English name.`,
      field,
    });
  }
  for (const language of ['ar', 'en'] as const) {
    const text = name[language];
    if (text && graphemes(text) > ORGANIZATION_NAME_MAX) {
      throw new BadRequestException({
        code: 'organizationNameTooLong',
        message: `${field}.${language} is longer than ${ORGANIZATION_NAME_MAX} characters.`,
        field: `${field}.${language}`,
      });
    }
  }
  return name;
};
