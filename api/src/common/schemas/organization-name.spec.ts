import { BadRequestException } from '@nestjs/common';
import mongoose from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  ORGANIZATION_NAME_MAX,
  OrganizationNameSchema,
  normalizeOrganizationName,
} from './organization-name.schema.js';
import { OrganizationNameDto } from '../dto/organization-name.dto.js';

/**
 * An organisation's name as the organisation writes it (ADR-0085 D4).
 *
 * Some sponsors have an English name and no Arabic one, and the federation does
 * not invent a translation or a transliteration for them. So the name is two
 * optional fields of which at least one is present — unlike `LocalizedText`,
 * which every other bilingual field keeps.
 */
describe('OrganizationName', () => {
  describe('normalizeOrganizationName', () => {
    it('keeps an English-only name, with the Arabic side null', () => {
      expect(normalizeOrganizationName({ en: 'Ultimate Power Solution' }, 'name')).toEqual({
        ar: null,
        en: 'Ultimate Power Solution',
      });
    });

    it('keeps an Arabic-only name, with the English side null', () => {
      expect(normalizeOrganizationName({ ar: 'مؤسسة الرمال الذهبية' }, 'name')).toEqual({
        ar: 'مؤسسة الرمال الذهبية',
        en: null,
      });
    });

    it('keeps both when both are written', () => {
      expect(normalizeOrganizationName({ ar: 'شركة النخبة', en: 'Elite Co' }, 'name')).toEqual({
        ar: 'شركة النخبة',
        en: 'Elite Co',
      });
    });

    it('trims each side and treats a blank side as absent', () => {
      expect(normalizeOrganizationName({ ar: '   ', en: '  Elite Co ' }, 'name')).toEqual({ ar: null, en: 'Elite Co' });
    });

    it.each([[{}], [{ ar: '', en: '' }], [{ ar: '  ', en: '\t' }], [undefined], [null]])(
      'refuses %j, naming the field',
      (value) => {
        let thrown: unknown;
        try {
          normalizeOrganizationName(value as never, 'partnerName');
        } catch (error) {
          thrown = error;
        }
        expect(thrown).toBeInstanceOf(BadRequestException);
        expect((thrown as BadRequestException).getResponse()).toMatchObject({
          code: 'missingRequiredField',
          field: 'partnerName',
        });
      },
    );

    it('refuses a side longer than the limit, counted as a reader counts characters', () => {
      const long = 'ا'.repeat(ORGANIZATION_NAME_MAX + 1);
      expect(() => normalizeOrganizationName({ ar: long }, 'name')).toThrow(BadRequestException);
      expect(normalizeOrganizationName({ ar: 'ا'.repeat(ORGANIZATION_NAME_MAX) }, 'name').ar).toHaveLength(
        ORGANIZATION_NAME_MAX,
      );
    });
  });

  describe('OrganizationNameDto', () => {
    const errorsFor = async (body: unknown) =>
      validate(plainToInstance(OrganizationNameDto, body as object), { whitelist: true, forbidNonWhitelisted: true });

    it('accepts English only, Arabic only and both', async () => {
      expect(await errorsFor({ en: 'Elite Co' })).toHaveLength(0);
      expect(await errorsFor({ ar: 'شركة النخبة' })).toHaveLength(0);
      expect(await errorsFor({ ar: 'شركة النخبة', en: 'Elite Co' })).toHaveLength(0);
    });

    it('refuses a side that is not a string', async () => {
      expect((await errorsFor({ en: 42 })).map((error) => error.property)).toContain('en');
    });

    it('refuses a field it does not know', async () => {
      expect((await errorsFor({ en: 'Elite Co', fr: 'Élite' })).length).toBeGreaterThan(0);
    });
  });

  describe('OrganizationNameSchema', () => {
    const Model = mongoose.model(
      'OrganizationNameProbe',
      new mongoose.Schema({ name: { type: OrganizationNameSchema, required: true } }),
    );

    it('stores an English-only name', () => {
      expect(new Model({ name: { en: 'Elite Co' } }).validateSync()).toBeUndefined();
    });

    it('refuses a name with neither side, even when written past the service', () => {
      expect(new Model({ name: { ar: null, en: null } }).validateSync()?.errors).toBeDefined();
      expect(new Model({ name: { ar: ' ', en: '' } }).validateSync()?.errors).toBeDefined();
    });
  });
});
