#!/usr/bin/env node
import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const colorThemesDir = join(root, 'color-themes');

function isValidUuid(s) {
  const re = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return re.test(s);
}

const REQUIRED = ['name', 'author', 'description', 'repo', 'path', 'version', 'commitHash'];

async function main() {
  let files = [];
  try {
    files = await readdir(colorThemesDir);
  } catch (e) {
    if (e.code === 'ENOENT') {
      console.log('color-themes/ directory does not exist, creating empty index');
      const index = { lastUpdated: new Date().toISOString(), colorThemes: [] };
      await writeFile(join(root, 'color-themes.json'), JSON.stringify(index, null, 2) + '\n', 'utf8');
      return;
    }
    throw e;
  }

  const manifestFiles = files.filter((f) => f.endsWith('.json'));
  const entries = [];
  const seenIds = new Set();

  for (const file of manifestFiles) {
    const filePath = join(colorThemesDir, file);
    const content = await readFile(filePath, 'utf8');
    let manifest;
    try {
      manifest = JSON.parse(content);
    } catch (e) {
      console.error(`Invalid JSON: ${file}`);
      process.exit(1);
    }

    const expectedId = file.replace(/\.json$/, '');
    if (manifest.id !== expectedId) {
      console.error(`${file}: manifest 'id' must match filename (expected ${expectedId}, got ${manifest.id})`);
      process.exit(1);
    }
    if (!isValidUuid(manifest.id)) {
      console.error(`${file}: 'id' must be a valid UUID v5`);
      process.exit(1);
    }

    for (const key of REQUIRED) {
      if (manifest[key] === undefined || manifest[key] === null || String(manifest[key]).trim() === '') {
        console.error(`${file}: Missing required field '${key}'`);
        process.exit(1);
      }
    }

    if (seenIds.has(manifest.id)) {
      console.error(`Duplicate color theme id: ${manifest.id}`);
      process.exit(1);
    }
    seenIds.add(manifest.id);

    entries.push({
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      official: manifest.official === true,
      beta: manifest.beta === true,
      tags: Array.isArray(manifest.tags) ? manifest.tags : [],
    });
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));

  const index = {
    lastUpdated: new Date().toISOString(),
    colorThemes: entries,
  };

  const indexPath = join(root, 'color-themes.json');
  await writeFile(indexPath, JSON.stringify(index, null, 2) + '\n', 'utf8');

  console.log(`Generated color-themes.json with ${entries.length} color themes`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
