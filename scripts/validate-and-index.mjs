#!/usr/bin/env node
import { readdir, readFile, writeFile, rename } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v5 } from 'uuid';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const pluginsDir = join(root, 'plugins');
const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

function normalizeName(name) {
  if (typeof name !== 'string') return '';
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

function isValidUuid(s) {
  const re = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return re.test(s);
}

const REQUIRED = ['name', 'author', 'description', 'repo', 'path', 'version', 'commitHash'];

async function main() {
  const files = await readdir(pluginsDir);
  const manifestFiles = files.filter((f) => f.endsWith('.json'));
  const entries = [];
  const seenIds = new Set();

  for (const file of manifestFiles) {
    const filePath = join(pluginsDir, file);
    let content = await readFile(filePath, 'utf8');
    let manifest;
    try {
      manifest = JSON.parse(content);
    } catch (e) {
      console.error(`Invalid JSON: ${file}`);
      process.exit(1);
    }

    if (!manifest.id || String(manifest.id).trim() === '') {
      const normalized = normalizeName(manifest.name);
      if (!normalized) {
        console.error(`${file}: Cannot assign id without 'name'`);
        process.exit(1);
      }
      manifest.id = v5(normalized, NAMESPACE);
      content = JSON.stringify(manifest, null, 2);
      await writeFile(filePath, content + '\n', 'utf8');
      const expectedFileName = `${manifest.id}.json`;
      if (file !== expectedFileName) {
        const newPath = join(pluginsDir, expectedFileName);
        await rename(filePath, newPath);
      }
    } else {
      const expectedId = file.replace(/\.json$/, '');
      if (manifest.id !== expectedId) {
        console.error(`${file}: manifest 'id' must match filename (expected ${expectedId}, got ${manifest.id})`);
        process.exit(1);
      }
      if (!isValidUuid(manifest.id)) {
        console.error(`${file}: 'id' must be a valid UUID v5`);
        process.exit(1);
      }
    }

    for (const key of REQUIRED) {
      if (manifest[key] === undefined || manifest[key] === null || String(manifest[key]).trim() === '') {
        console.error(`${file}: Missing required field '${key}'`);
        process.exit(1);
      }
    }

    if (seenIds.has(manifest.id)) {
      console.error(`Duplicate plugin id: ${manifest.id}`);
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
    plugins: entries,
  };

  const indexPath = join(root, 'plugins.json');
  await writeFile(indexPath, JSON.stringify(index, null, 2) + '\n', 'utf8');

  console.log(`Generated plugins.json with ${entries.length} plugins`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
