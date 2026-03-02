#!/usr/bin/env node
import { readdir } from 'fs/promises';
import { writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const firmwareDir = join(root, 'firmware');

async function main() {
  const versionDirs = await readdir(firmwareDir, { withFileTypes: true });
  const versions = [];

  for (const dirent of versionDirs) {
    if (!dirent.isDirectory()) continue;
    const versionDir = join(firmwareDir, dirent.name);
    const files = await readdir(versionDir);
    const brumcFiles = files.filter((f) => f.endsWith('.brumc')).sort();
    versions.push({ version: dirent.name, files: brumcFiles });
  }

  versions.sort((a, b) => a.version.localeCompare(b.version, undefined, { numeric: true }));

  const index = {
    lastUpdated: new Date().toISOString(),
    versions,
  };

  const indexPath = join(root, 'firmware.json');
  await writeFile(indexPath, JSON.stringify(index, null, 2) + '\n', 'utf8');

  console.log(`Generated firmware.json with ${versions.length} version(s)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
