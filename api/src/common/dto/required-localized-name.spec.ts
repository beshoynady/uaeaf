import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateRoleDto } from '../../modules/platform-administration/roles/dto/create-role.dto.js';
import { RenameRoleDto } from '../../modules/platform-administration/roles/dto/rename-role.dto.js';
import { CreateUserDto } from '../../modules/platform-administration/users/dto/create-user.dto.js';

/**
 * Guards the three DTOs whose `name` reached Mongoose instead of the
 * validator.
 *
 * `@ValidateNested()` alone does not require the property to be present:
 * class-validator's nested executor returns early when the value is
 * `undefined`, so a body with no `name` passed the global ValidationPipe and
 * failed at `required: true` in the schema. With no exception filter
 * registered, that surfaced to the caller as a bare 500 — a server error for
 * what is plainly a bad request.
 *
 * These tests assert the boundary, not the decorator, so a future refactor
 * of how the rule is expressed is free as long as the behaviour holds.
 */
const VALID_NAME = { en: 'News Approver', ar: 'معتمد الأخبار' };

async function messagesFor(dto: object): Promise<string[]> {
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  return errors.flatMap((error) => [
    error.property,
    ...Object.values(error.constraints ?? {}),
    ...(error.children ?? []).flatMap((child) => Object.values(child.constraints ?? {})),
  ]);
}

describe('required bilingual name', () => {
  describe('CreateRoleDto', () => {
    it('rejects a body with no name at all', async () => {
      const dto = plainToInstance(CreateRoleDto, { permissionIds: [] });
      expect(await messagesFor(dto)).toContain('name');
    });

    it('rejects a name that is not an object', async () => {
      const dto = plainToInstance(CreateRoleDto, { name: 'News Approver', permissionIds: [] });
      expect(await messagesFor(dto)).toContain('name');
    });

    it('rejects a name missing one language', async () => {
      const dto = plainToInstance(CreateRoleDto, { name: { en: 'News Approver' }, permissionIds: [] });
      expect(await messagesFor(dto)).toContain('name');
    });

    it('accepts a complete bilingual name', async () => {
      const dto = plainToInstance(CreateRoleDto, { name: VALID_NAME, permissionIds: [] });
      expect(await validate(dto)).toHaveLength(0);
    });

    it('still treats description as optional', async () => {
      const dto = plainToInstance(CreateRoleDto, { name: VALID_NAME, permissionIds: [] });
      expect(await validate(dto)).toHaveLength(0);
    });
  });

  describe('RenameRoleDto', () => {
    it('rejects a body with no name at all', async () => {
      expect(await messagesFor(plainToInstance(RenameRoleDto, {}))).toContain('name');
    });

    it('accepts a complete bilingual name', async () => {
      expect(await validate(plainToInstance(RenameRoleDto, { name: VALID_NAME }))).toHaveLength(0);
    });
  });

  describe('CreateUserDto', () => {
    const REST = { email: 'editor@uaeaf.ae', password: 'a-long-enough-password' };

    it('rejects a body with no name at all', async () => {
      expect(await messagesFor(plainToInstance(CreateUserDto, REST))).toContain('name');
    });

    it('rejects a name that is not an object', async () => {
      expect(await messagesFor(plainToInstance(CreateUserDto, { ...REST, name: 42 }))).toContain('name');
    });

    it('accepts a complete bilingual name', async () => {
      const dto = plainToInstance(CreateUserDto, { ...REST, name: VALID_NAME });
      expect(await validate(dto)).toHaveLength(0);
    });

    it('still enforces the twelve-character password minimum', async () => {
      const dto = plainToInstance(CreateUserDto, { ...REST, name: VALID_NAME, password: 'short' });
      expect(await messagesFor(dto)).toContain('password');
    });
  });
});
