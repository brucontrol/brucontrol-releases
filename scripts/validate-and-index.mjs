#!/usr/bin/env node
import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { validate } from 'uuid';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const pluginsDir = join(root, 'plugins');
const scriptsDir = join(root, 'scripts');

function isValidUuid(s) {
  return typeof s === 'string' && validate(s);
}

const REQUIRED = ['name', 'author', 'description', 'repo', 'path', 'version', 'commitHash'];

async function loadCorePluginIds() {
  try {
    const path = join(scriptsDir, 'core-plugins.json');
    const content = await readFile(path, 'utf8');
    const data = JSON.parse(content);
    return new Set(Array.isArray(data.corePluginIds) ? data.corePluginIds : []);
  } catch {
    return new Set();
  }
}

async function main() {
  const corePluginIds = await loadCorePluginIds();
  const files = await readdir(pluginsDir);
  const manifestFiles = files.filter((f) => f.endsWith('.json'));
  const entries = [];
  const seenIds = new Set();

  for (const file of manifestFiles) {
    const filePath = join(pluginsDir, file);
    const content = await readFile(filePath, 'utf8');
    let manifest;
    try {
      manifest = JSON.parse(content);
    } catch (e) {
      console.error(`Invalid JSON: ${file}`);
      process.exit(1);
    }

    if (!manifest.id || String(manifest.id).trim() === '') {
      console.error(`${file}: manifest must have 'id' (assigned by plugin-library generate-manifests)`);
      process.exit(1);
    }

    const expectedId = file.replace(/\.json$/, '');
    if (manifest.id !== expectedId) {
      console.error(`${file}: manifest 'id' must match filename (expected ${expectedId}, got ${manifest.id})`);
      process.exit(1);
    }
    if (!isValidUuid(manifest.id)) {
      console.error(`${file}: 'id' must be a valid UUID`);
      process.exit(1);
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

    const isCore = corePluginIds.has(manifest.id);
    if (manifest.core !== isCore) {
      manifest.core = isCore;
      await writeFile(filePath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    }

    entries.push({
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      official: manifest.official === true,
      core: isCore,
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
