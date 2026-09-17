import 'reflect-metadata';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { plainToInstance } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';
import { presenceByOwnKey, wasSent } from './partial-update.util.js';

/**
 * Which fields a partial update carries.
 *
 * `ValidationPipe({ transform: true })` hands a service a DTO instance, and with
 * ES2022 class fields every property the class declares is an own property of
 * that instance, `undefined` when the request did not send it. "Is it an own
 * key?" is therefore true for every field, and an update that sent one field
 * read as clearing all the others (found live 2026-09-17 in hero slides and page
 * sections). JSON cannot carry `undefined`, so sent is "not undefined", and an
 * explicit `null` is still a request to clear.
 */
class ExampleUpdateDto {
  @IsOptional()
  @IsString()
  title?: string | null;

  @IsOptional()
  @IsString()
  subtitle?: string;
}

const delivered = (body: object) => plainToInstance(ExampleUpdateDto, body);

describe('wasSent', () => {
  it('reports a declared field the request did not send as not sent, although it is an own key', () => {
    const dto = delivered({ title: 'Kept' });

    expect(Object.hasOwn(dto, 'subtitle')).toBe(true);
    expect(wasSent(dto, 'subtitle')).toBe(false);
  });

  it('reports a field sent with a value as sent', () => {
    expect(wasSent(delivered({ title: 'New' }), 'title')).toBe(true);
  });

  it('reports a field sent as null as sent, so it still clears', () => {
    expect(wasSent(delivered({ title: null }), 'title')).toBe(true);
  });
});

describe('services never decide a partial update by own keys', () => {
  const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

  const services = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) return services(full);
      return entry.endsWith('.service.ts') ? [full] : [];
    });

  it('recognises each form of the defect, so the scan below cannot pass on nothing', () => {
    expect(presenceByOwnKey('const has = (key) => Object.hasOwn(dto, key);')).toBe(true);
    expect(presenceByOwnKey("if ('title' in dto) update.title = dto.title;")).toBe(true);
    expect(presenceByOwnKey('if (Object.prototype.hasOwnProperty.call(dto, key)) {')).toBe(true);
    expect(presenceByOwnKey('if (dto.hasOwnProperty(key)) {')).toBe(true);
    expect(presenceByOwnKey('for (const key of Object.keys(dto)) set[key] = dto[key];')).toBe(true);
    expect(presenceByOwnKey('const has = (key) => wasSent(dto, key);')).toBe(false);
  });

  it('finds none in any service', () => {
    const offenders = services(join(SRC, 'modules'))
      .filter((file) => presenceByOwnKey(readFileSync(file, 'utf8')))
      .map((file) => relative(SRC, file));

    expect(offenders).toEqual([]);
  });
});
