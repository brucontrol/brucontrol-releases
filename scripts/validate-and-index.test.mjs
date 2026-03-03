/**
 * Tests for validate-and-index.mjs core plugin logic.
 * Run with: node --test validate-and-index.test.mjs
 */
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { test, describe } from 'node:test';
import assert from 'node:assert';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('core-plugins.json', () => {
  test('exists and has valid structure', async () => {
    const path = join(__dirname, 'core-plugins.json');
    const content = await readFile(path, 'utf8');
    const data = JSON.parse(content);
    assert.ok(Array.isArray(data.corePluginIds), 'corePluginIds must be an array');
    assert.ok(data.corePluginIds.length > 0, 'corePluginIds must not be empty');
  });

  test('all core plugin IDs are valid UUIDs', async () => {
    const path = join(__dirname, 'core-plugins.json');
    const content = await readFile(path, 'utf8');
    const data = JSON.parse(content);
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    for (const id of data.corePluginIds) {
      assert.ok(uuidRe.test(id), `Invalid UUID: ${id}`);
    }
  });

  test('core list does not include Water Level Meter (optional plugin)', async () => {
    const waterLevelId = 'ce890220-fd42-4197-9fda-c522e286f0ca';
    const path = join(__dirname, 'core-plugins.json');
    const content = await readFile(path, 'utf8');
    const data = JSON.parse(content);
    assert.ok(!data.corePluginIds.includes(waterLevelId), 'Water Level Meter should not be core');
  });

  test('core list includes Button - Card (core plugin)', async () => {
    const buttonId = 'a64ba026-7833-492f-8893-672cf530ae76';
    const path = join(__dirname, 'core-plugins.json');
    const content = await readFile(path, 'utf8');
    const data = JSON.parse(content);
    assert.ok(data.corePluginIds.includes(buttonId), 'Button - Card should be core');
  });
});
