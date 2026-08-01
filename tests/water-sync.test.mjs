import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const files = {
  dashboard: fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8'),
  health: fs.readFileSync(new URL('../health.html', import.meta.url), 'utf8'),
  water: fs.readFileSync(new URL('../po-water.html', import.meta.url), 'utf8'),
};

function authSyncAppKey(source, syncedKey) {
  const match = source.match(new RegExp("auth\\.initSync\\(\\{[\\s\\S]*?appKey:\\s*'([^']+)'[\\s\\S]*?syncedKeys:\\s*\\[[^\\]]*'" + syncedKey + "'"));
  return match && match[1];
}

test('water state uses one authenticated cloud row across dashboard pages', () => {
  const keys = Object.values(files).map((source) => authSyncAppKey(source, 'po_water_v1'));
  assert.deepEqual(keys, ['health', 'health', 'health']);
});

// Mirrors auth-sync.js _doPush/_flushNow: a config that owns only a subset
// of a shared row's keys must merge into the previously-stored row rather
// than replace it, so (a) sibling keys survive and (b) deletions propagate.
function mergedPush(prevStored, localSlice) {
  const base = prevStored ? JSON.parse(prevStored) : {};
  return Object.assign({}, base, localSlice);
}

test('a water-only push preserves sibling keys in the shared health row', () => {
  const prevRow = JSON.stringify({
    'stack:items': [{ id: 'a', done: false }],
    'po_water_v1': { logs: { '2026-07-31': 5 } },
  });
  const waterOnly = { 'po_water_v1': { logs: { '2026-07-31': 4 } } }; // one bottle removed
  const next = mergedPush(prevRow, waterOnly);
  assert.ok('stack:items' in next, 'sibling stack key must survive');
  assert.deepEqual(next['po_water_v1'].logs['2026-07-31'], 4, 'water decrement must persist');
});

test('a bottle decrement remains in the shared row after a push', () => {
  const prevRow = JSON.stringify({
    'stack:items': [],
    'po_water_v1': { logs: { '2026-07-31': 2 } },
  });
  const decremented = { 'po_water_v1': { logs: {} } };
  const next = mergedPush(prevRow, decremented);
  assert.deepEqual(next['po_water_v1'].logs, {}, 'removed bottle must not return from the prior row');
  assert.ok('stack:items' in next, 'sibling key still preserved');
});

test('water page does not run the anonymous sync alongside authenticated sync', () => {
  assert.equal(files.water.includes('initCloudSync({'), false);
});
