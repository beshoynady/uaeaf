import { ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import { UpdateCountryDto } from '../../modules/people-organizations/countries/dto/update-country.dto.js';
import { UpdateDisciplineDto } from '../../modules/athletics/disciplines/dto/update-discipline.dto.js';
import { UpdateWorkflowStepDto } from '../../modules/workflow/workflow-steps/dto/update-workflow-step.dto.js';

/**
 * A partial update may omit a field; it may not clear a required one with
 * `null`.
 *
 * `PartialType(Create…)` with no options applies `@IsOptional()`, and
 * `@IsOptional()` skips every other validator when the value is `null` — so
 * `{"type": null}` on a required enum produced zero validation errors,
 * `partialUpdate` forwarded it, and `updateById` passes no `runValidators`,
 * which left `null` stored on a `required` path. `skipNullProperties: false`
 * applies `@ValidateIf((_, v) => v !== undefined)` instead: `null` is
 * validated and refused, an omitted field is still untouched.
 *
 * Both halves are asserted per value kind. A rule that refuses `null` and
 * also refuses omission has broken partial update, which is the thing these
 * DTOs exist to express.
 */
const pipe = new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true });

const errorsFor = async (metatype: new () => object, body: object): Promise<string[]> => {
  try {
    await pipe.transform(body, { type: 'body', metatype });
    return [];
  } catch (error) {
    const response = (error as { getResponse: () => { message?: string[] } }).getResponse();
    return response.message ?? ['(refused with no field named)'];
  }
};

const accepts = async (metatype: new () => object, body: object): Promise<void> => {
  await expect(pipe.transform(body, { type: 'body', metatype })).resolves.toBeDefined();
};

describe('a partial update cannot clear a required field with null', () => {
  describe('a required enum (UpdateCountryDto.type, @IsIn)', () => {
    it('refuses null', async () => {
      expect((await errorsFor(UpdateCountryDto, { type: null })).join(' ')).toContain('type');
    });

    it('still refuses a value outside the enum', async () => {
      expect((await errorsFor(UpdateCountryDto, { type: 'Bogus' })).join(' ')).toContain('type');
    });

    it('accepts the field being omitted', async () => {
      await accepts(UpdateCountryDto, { name: { en: 'Oman', ar: 'عُمان' } });
    });

    it('accepts a real value', async () => {
      await accepts(UpdateCountryDto, { type: 'Country' });
    });
  });

  describe('a required LocalizedText (UpdateCountryDto.name, @ValidateNested)', () => {
    it('refuses null', async () => {
      expect((await errorsFor(UpdateCountryDto, { name: null })).join(' ')).toContain('name');
    });

    it('accepts the field being omitted', async () => {
      await accepts(UpdateCountryDto, { type: 'Emirate' });
    });
  });

  describe('a required number (UpdateWorkflowStepDto.requiredApprovals, @IsInt @Min(1))', () => {
    it('refuses null', async () => {
      expect((await errorsFor(UpdateWorkflowStepDto, { requiredApprovals: null })).join(' ')).toContain(
        'requiredApprovals',
      );
    });

    it('accepts the field being omitted', async () => {
      await accepts(UpdateWorkflowStepDto, { sequenceOrder: 2 });
    });

    it('accepts a real value', async () => {
      await accepts(UpdateWorkflowStepDto, { requiredApprovals: 2 });
    });
  });

  describe('a required array (UpdateWorkflowStepDto.assigneeIds, @ArrayNotEmpty)', () => {
    it('refuses null', async () => {
      expect((await errorsFor(UpdateWorkflowStepDto, { assigneeIds: null })).join(' ')).toContain('assigneeIds');
    });

    it('accepts the field being omitted', async () => {
      await accepts(UpdateWorkflowStepDto, { stepType: 'Parallel' });
    });
  });

  describe('a field the schema lets the record hold no value for', () => {
    it('still accepts null on an optional create field (UpdateDisciplineDto.coverImage)', async () => {
      // `@IsOptional()` on the create DTO is a second conditional metadata,
      // and class-validator ANDs the conditions — so a field declared
      // optional there keeps its "clear me" state, which `setObjectIdField`
      // writes as `null` per the schema's own nullability.
      await accepts(UpdateDisciplineDto, { coverImage: null });
    });

    it('accepts the field being omitted', async () => {
      await accepts(UpdateDisciplineDto, { slug: 'jumps' });
    });
  });
});
