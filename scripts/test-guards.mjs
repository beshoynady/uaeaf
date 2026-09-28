#!/usr/bin/env node
// Runs the project-wide "guard" specs — tests that scan or cross-check the
// project's own source/content rather than exercising one unit — as a named
// set instead of leaving them to be picked up only when someone happens to
// touch the file they live in.
//
// The full list, with what each guard checks and its tier, is documented in
// docs/engineering/GUARD-TESTS.md. That document is the catalogue; this file
// is only the mechanism that runs it. THE TWO MUST BE KEPT IN SYNC: a guard
// added to one list without the other either does not run (added here only)
// or is undocumented (added there only). Add a new guard to both in the same
// task that writes it.
//
// Usage: node scripts/test-guards.mjs <core|all>
//   core — the API guards touching authorization and audit only. Fast
//          (measured ~15-20s), safe to run at the end of every task.
//   all  — every guard in api/, apps/dashboard/ and apps/web/. Slower;
//          intended for the end of a batch, with dev servers stopped.

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

// ---------------------------------------------------------------------------
// API guards (Jest). Matched by unique basename against the full test path,
// which is safe because every name below was checked to be unique under
// api/src at the time this list was written.
// ---------------------------------------------------------------------------

/** Authorization, audit and media guards. This is the "core" tier. */
const API_CORE_GUARD_NAMES = [
  'capability-map',
  'permission-catalogue',
  'permission-resources',
  'audit-route-coverage',
  'audit-log\\.schema',
  'audit-action-literal-scan',
  'raw-dto-cast-scan',
  // Media: fails when a field is added that the media reference scan cannot
  // follow — the check that stands between a permanent delete and a published
  // page. Reads the project's own schemas; no database.
  'media-reference-coverage',
  // Permanent deletion: fails when the routes that destroy something stop
  // matching the resources the capability map allows to be destroyed, in either
  // direction. Reads the project's own controllers; no database.
  'archive-restore',
  // The eight reserved resource:action pairs a role may never be BUILT
  // holding (ADR-0104/ADR-0105). Reads CAPABILITY_MAP/PERMISSION_CATALOGUE
  // and exercises RolesService.create with mocked repositories; no database.
  'super-admin-only',
  // The six role templates (ADR-0113): every pair in the catalogue, none
  // reserved or PermanentDelete, scopes only where offered; no database.
  'role-template-matrix',
];

/** Every API guard, core plus the rest (page-activation, partial-update,
 *  sponsorship-window, hero settings/limits duplication checks). */
const API_ALL_GUARD_NAMES = [
  ...API_CORE_GUARD_NAMES,
  'page-activation-routes',
  'partial-update\\.util',
  // The same rule as partial-update.util, checked per service (27 of them).
  // Path-qualified: a bare 'partial-update' also matches the unrelated
  // hero-slides.partial-update.spec.ts.
  'authz/partial-update',
  'sponsorship-window\\.util',
  'hero-settings',
  'hero-slides\\.visible',
];

// ---------------------------------------------------------------------------
// Dashboard guards (Vitest), paths relative to apps/dashboard.
// ---------------------------------------------------------------------------
const DASHBOARD_GUARDS = [
  'src/lib/api/write-error-copy.spec.ts',
  'src/lib/admin/albums/album-copy.spec.ts',
  'src/lib/navigation.spec.ts',
  'src/lib/legacy-redirects.spec.ts',
  'src/lib/security/credential-forms.spec.ts',
  'src/lib/design-system/class-conflict-contract.spec.ts',
  'src/lib/design-system/sticky-focus-contract.spec.ts',
  'src/lib/design-system/token-contract.spec.ts',
  'src/lib/design-system/token-contrast.spec.ts',
  'src/lib/design-system/interaction-state-contract.spec.ts',
];

// ---------------------------------------------------------------------------
// Web guards (Vitest), paths relative to apps/web.
// ---------------------------------------------------------------------------
const WEB_GUARDS = [
  'src/lib/pages/internal-links-contract.spec.ts',
  'src/lib/pages/contact-rendering-contract.spec.ts',
  'src/lib/pages/page-message-keys.spec.ts',
  'src/lib/design-system/brand-asset-contract.spec.ts',
  'src/lib/design-system/brand-surface-contract.spec.ts',
  'src/lib/design-system/colour-role-contract.spec.ts',
  'src/lib/design-system/contact-card-contrast.spec.ts',
  'src/lib/design-system/cover-scrim.spec.ts',
  'src/lib/design-system/css-property-syntax.spec.ts',
  'src/lib/design-system/direction-and-logo-contract.spec.ts',
  'src/lib/design-system/hero-stage-shift.spec.ts',
  'src/lib/design-system/identity-palette-contract.spec.ts',
  'src/lib/design-system/interaction-state-contract.spec.ts',
  'src/lib/design-system/locale-aware-link-contract.spec.ts',
  'src/lib/design-system/motion-budget.spec.ts',
  'src/lib/design-system/motion-contract.spec.ts',
  'src/lib/design-system/page-hero-photo-contract.spec.ts',
  'src/lib/design-system/press-contract.spec.ts',
  'src/lib/design-system/register-contrast.spec.ts',
  'src/lib/design-system/scroll-cue-guard-cost.spec.ts',
  'src/lib/design-system/seo-contract.spec.ts',
  'src/lib/design-system/surface-adjacency-contract.spec.ts',
  'src/lib/design-system/surface-paint-contract.spec.ts',
  'src/lib/design-system/surface-standard.spec.ts',
  'src/lib/design-system/token-contract.spec.ts',
  'src/lib/design-system/token-lists-contract.spec.ts',
  'src/lib/design-system/video-register-contrast.spec.ts',
];

const runApiGuards = (names) => {
  const pattern = `(${names.join('|')})\\.spec\\.ts$`;
  const result = spawnSync(
    process.execPath,
    ['--experimental-vm-modules', 'node_modules/jest/bin/jest.js', '--testPathPatterns', pattern],
    { cwd: join(ROOT, 'api'), stdio: 'inherit', shell: false },
  );
  return result.status ?? 1;
};

const runVitestGuards = (packageDir, files) => {
  const result = spawnSync('npx', ['vitest', 'run', ...files], {
    cwd: join(ROOT, packageDir),
    stdio: 'inherit',
    shell: true, // npx needs the shell to resolve on Windows
  });
  return result.status ?? 1;
};

const mode = process.argv[2];

if (mode !== 'core' && mode !== 'all') {
  console.error('Usage: node scripts/test-guards.mjs <core|all>');
  process.exit(2);
}

const start = Date.now();
let exitCode = 0;

if (mode === 'core') {
  console.log(`Running ${API_CORE_GUARD_NAMES.length} core API guards (authorization + audit + media)...`);
  exitCode = runApiGuards(API_CORE_GUARD_NAMES);
} else {
  console.log(`Running all ${API_ALL_GUARD_NAMES.length} API guards...`);
  exitCode = runApiGuards(API_ALL_GUARD_NAMES) || exitCode;

  console.log(`Running all ${DASHBOARD_GUARDS.length} dashboard guards...`);
  exitCode = runVitestGuards('apps/dashboard', DASHBOARD_GUARDS) || exitCode;

  console.log(`Running all ${WEB_GUARDS.length} web guards...`);
  exitCode = runVitestGuards('apps/web', WEB_GUARDS) || exitCode;
}

const seconds = ((Date.now() - start) / 1000).toFixed(1);
console.log(`test-guards:${mode} finished in ${seconds}s with exit code ${exitCode}`);
process.exit(exitCode);
