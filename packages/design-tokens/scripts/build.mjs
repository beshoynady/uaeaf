// Implements Chapter 3 §3.9 Export Pipeline: tokens/*.json -> tokens.json -> CSS Custom Properties -> Tailwind theme.
// Zero-dependency by design (no network install required) — a drop-in replacement is Style Dictionary
// itself if/when the project wants the full ecosystem tooling; the token *source files* already follow
// its JSON convention ({ "value": ... } leaves, {token.path} references) so migrating later is a rename, not a rewrite.

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOKENS_DIR = join(ROOT, 'tokens');
const BUILD_DIR = join(ROOT, 'build');

function readJsonDir(dir) {
  const files = readdirSync(dir).filter(f => f.endsWith('.json')).sort();
  return files.map(f => JSON.parse(readFileSync(join(dir, f), 'utf-8')));
}

function deepMerge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && !('value' in value)) {
      target[key] = deepMerge(target[key] && typeof target[key] === 'object' ? target[key] : {}, value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

function mergeAll(objs) {
  return objs.reduce((acc, o) => deepMerge(acc, o), {});
}

// Resolves {a.b.c} references against a fully-merged token tree. Throws on unresolved refs (Chapter 7 §Fallback Chain: no silent undefined).
function resolveTree(tree, root = tree, pathTrace = []) {
  const REF = /^\{([a-zA-Z0-9_.-]+)\}$/;
  const REF_INLINE = /\{([a-zA-Z0-9_.-]+)\}/g;

  function getByPath(obj, path) {
    const parts = path.split('.');
    let cur = obj;
    for (const p of parts) {
      if (cur == null || !(p in cur)) return undefined;
      cur = cur[p];
    }
    return cur;
  }

  function resolveValue(val, trace) {
    if (typeof val !== 'string') return val;
    const fullMatch = val.match(REF);
    if (fullMatch) {
      const refPath = fullMatch[1];
      if (trace.includes(refPath)) throw new Error(`Circular token reference: ${[...trace, refPath].join(' -> ')}`);
      const target = getByPath(root, refPath);
      if (!target || typeof target !== 'object' || !('value' in target)) {
        throw new Error(`Unresolved token reference "{${refPath}}" (Chapter 7 §7.2 Fallback Chain violation)`);
      }
      return resolveValue(target.value, [...trace, refPath]);
    }
    if (REF_INLINE.test(val)) {
      return val.replace(REF_INLINE, (_, refPath) => {
        const target = getByPath(root, refPath);
        if (!target || typeof target !== 'object' || !('value' in target)) {
          throw new Error(`Unresolved inline token reference "{${refPath}}"`);
        }
        return resolveValue(target.value, [...trace, refPath]);
      });
    }
    return val;
  }

  function walk(node, trace) {
    if (node && typeof node === 'object' && 'value' in node) {
      const resolved = { ...node };
      if (typeof node.value === 'object' && node.value !== null && !Array.isArray(node.value)) {
        resolved.value = Object.fromEntries(Object.entries(node.value).map(([k, v]) => [k, resolveValue(v, trace)]));
      } else {
        resolved.value = resolveValue(node.value, trace);
      }
      return resolved;
    }
    if (node && typeof node === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(node)) {
        if (k === 'comment') { out[k] = v; continue; }
        out[k] = walk(v, trace);
      }
      return out;
    }
    return node;
  }

  return walk(tree, pathTrace);
}

function toCssVarName(pathParts) {
  return '--' + pathParts.join('-');
}

// Flattens a resolved token tree into { "--css-var-name": value } pairs, skipping "comment" keys.
function flatten(tree, pathParts = [], out = {}) {
  for (const [key, node] of Object.entries(tree)) {
    if (key === 'comment') continue;
    if (node && typeof node === 'object' && 'value' in node) {
      if (typeof node.value === 'object' && node.value !== null) {
        // Composite value (e.g. responsive font size {desktop, mobile}) -> one CSS var per facet.
        for (const [facet, v] of Object.entries(node.value)) {
          out[toCssVarName([...pathParts, key, facet])] = v;
        }
      } else {
        out[toCssVarName([...pathParts, key])] = node.value;
      }
    } else if (node && typeof node === 'object') {
      flatten(node, [...pathParts, key], out);
    }
  }
  return out;
}

// Rebuilds a subtree using only the paths present in `shape`, pulling resolved leaf values from `resolvedRoot`.
// Used to extract "only what semantic/component files actually declared" out of a root that was merged
// with primitives/brand purely for reference resolution (Chapter 7 §7.7 — those must not leak into per-theme CSS).
function pluck(shape, resolvedRoot) {
  const out = {};
  for (const [key, node] of Object.entries(shape)) {
    if (key === 'comment') continue;
    if (node && typeof node === 'object' && 'value' in node) {
      out[key] = resolvedRoot[key];
    } else if (node && typeof node === 'object') {
      out[key] = pluck(node, resolvedRoot[key] || {});
    }
  }
  return out;
}

function cssBlock(selector, vars) {
  const lines = Object.entries(vars).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `  ${k}: ${v};`);
  return `${selector} {\n${lines.join('\n')}\n}\n`;
}

function main() {
  mkdirSync(join(BUILD_DIR, 'css'), { recursive: true });

  const primitives = mergeAll(readJsonDir(join(TOKENS_DIR, 'primitive')));
  const brandRaw = mergeAll(readJsonDir(join(TOKENS_DIR, 'brand')));

  // Brand resolves against primitives only.
  const primitivePlusBrandTree = deepMerge(structuredClone(primitives), brandRaw);
  const brandResolved = resolveTree(primitivePlusBrandTree);

  // Theme-invariant categories (spacing/radius/typography sizes/motion/breakpoints/zindex/opacity/sizing/icon/avatar)
  // plus primitive + brand colors (same hex regardless of active theme) — built once into base.css.
  // NOTE: these primitive/brand CSS vars exist for Figma Variables sync (§3.9) and internal semantic-layer
  // composition only — components MUST NOT consume them directly (Chapter 7 §7.7, enforced by lint §3.26,
  // not by omitting them from the build).
  const invariantResolved = resolveTree(structuredClone(primitives));
  const baseVars = { ...flatten(invariantResolved, [], {}), ...flatten({ color: { brand: brandResolved.color.brand } }, [], {}) };
  writeFileSync(join(BUILD_DIR, 'css', 'base.css'), cssBlock(':root', baseVars));

  const themes = {
    light: { selector: ':root, [data-theme="light"]', file: 'colors.light.json' },
    dark: { selector: '[data-theme="dark"]', file: 'colors.dark.json' },
    'high-contrast': { selector: '[data-theme="high-contrast"]', file: 'colors.high-contrast.json' },
  };

  const sharedSemanticFiles = ['typography.json', 'motion.json', 'elevation.json'].map(f =>
    JSON.parse(readFileSync(join(TOKENS_DIR, 'semantic', f), 'utf-8'))
  );
  const componentFiles = readJsonDir(join(TOKENS_DIR, 'component'));

  const perThemeTokensJson = {};

  for (const [themeName, cfg] of Object.entries(themes)) {
    const themeColorFile = JSON.parse(readFileSync(join(TOKENS_DIR, 'semantic', cfg.file), 'utf-8'));
    const semanticTree = mergeAll([themeColorFile, ...sharedSemanticFiles]);

    // Resolve semantic against primitives+brand+itself.
    const semanticRoot = deepMerge(structuredClone(primitivePlusBrandTree), semanticTree);
    const semanticResolved = resolveTree(semanticRoot);

    // Resolve components against primitives+brand+semantic(resolved-as-source, still with refs re-walked).
    const componentRoot = deepMerge(structuredClone(semanticRoot), mergeAll(componentFiles));
    const componentResolvedFull = resolveTree(componentRoot);

    // CSS output: only what semantic/component source files actually declared (Chapter 7 §7.7 — no raw
    // primitive/brand leakage into theme CSS, even though they were merged in above purely to resolve refs).
    const semanticOnly = pluck(semanticTree, semanticResolved);
    const semanticVars = flatten(semanticOnly, [], {});

    const componentShape = mergeAll(componentFiles);
    const componentOnly = pluck(componentShape, componentResolvedFull);
    const componentVars = flatten(componentOnly, [], {});

    writeFileSync(join(BUILD_DIR, 'css', `${themeName}.css`), cssBlock(cfg.selector, { ...semanticVars, ...componentVars }));

    perThemeTokensJson[themeName] = { color: semanticResolved.color, a11y: semanticResolved.a11y, ...componentOnly };
  }

  // Canonical tokens.json (§3.9 "مصدر الحقيقة الآلي الوحيد") — invariant base + brand-resolved primitives + all 3 themes.
  const tokensJson = {
    $schema: 'https://design-tokens.github.io/community-group/format/',
    meta: { version: '1.0.0', generatedFrom: 'packages/design-tokens/tokens/**', pipeline: 'Chapter 3 §3.9' },
    primitive: invariantResolved,
    brand: brandResolved.color.brand,
    themes: perThemeTokensJson,
  };
  writeFileSync(join(BUILD_DIR, 'tokens.json'), JSON.stringify(tokensJson, null, 2));

  // Tailwind theme extension (§21.3 — MUST import from generated CSS Variables, no default Tailwind palette values).
  const allThemeVarNames = new Set([
    ...Object.keys(flatten(perThemeTokensJson.light, [], {})),
    ...Object.keys(baseVars),
  ]);
  const tailwindLines = [...allThemeVarNames].sort().map(name => {
    const jsKey = name.replace(/^--/, '');
    return `    '${jsKey}': 'var(${name})',`;
  });

  const tailwindTheme = `// AUTO-GENERATED by packages/design-tokens/scripts/build.mjs — do not edit by hand.
// Consumed by apps/*/tailwind.config.js per Chapter 21 §21.3.
module.exports = {
${tailwindLines.join('\n')}
};
`;
  writeFileSync(join(BUILD_DIR, 'tailwind-vars.cjs'), tailwindTheme);

  writeFileSync(
    join(BUILD_DIR, 'css', 'index.css'),
    `/* AUTO-GENERATED by packages/design-tokens/scripts/build.mjs — do not edit by hand. */\n@import './base.css';\n@import './light.css';\n@import './dark.css';\n@import './high-contrast.css';\n`
  );

  console.log('[design-tokens] build complete:');
  console.log('  build/css/base.css, light.css, dark.css, high-contrast.css');
  console.log('  build/tokens.json');
  console.log('  build/tailwind-vars.cjs');
}

main();
