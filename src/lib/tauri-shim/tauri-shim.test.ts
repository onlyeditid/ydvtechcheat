import test from 'node:test';
import assert from 'node:assert/strict';
import { createSqliteStore, type StorageAdapter } from './sqlite-store';
import {
  createCommandRouter,
  maskLicenseKey,
  validateShortcutKey,
} from './command-handler';

function createMemoryStorage(): StorageAdapter {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
  };
}

test('sqlite-store handles system_prompts CRUD', async () => {
  const store = createSqliteStore(createMemoryStorage());

  const insertRes = await store.execute(
    'INSERT INTO system_prompts (name, prompt) VALUES (?, ?)',
    ['Interview Coach', 'Give concise answers']
  );
  assert.equal(insertRes.rowsAffected, 1);
  assert.equal(insertRes.lastInsertId, 1);

  const all = await store.select<Array<{ id: number; name: string; prompt: string }>>(
    'SELECT * FROM system_prompts ORDER BY created_at DESC'
  );
  assert.equal(all.length, 1);
  assert.equal(all[0].name, 'Interview Coach');

  await store.execute(
    'UPDATE system_prompts SET name = ?, prompt = ? WHERE id = ?',
    ['Senior Coach', 'Give structured answers', 1]
  );

  const updated = await store.select<Array<{ id: number; name: string; prompt: string }>>(
    'SELECT * FROM system_prompts WHERE id = ?',
    [1]
  );
  assert.equal(updated[0].name, 'Senior Coach');
  assert.equal(updated[0].prompt, 'Give structured answers');

  const del = await store.execute('DELETE FROM system_prompts WHERE id = ?', [1]);
  assert.equal(del.rowsAffected, 1);
  const afterDel = await store.select<Array<unknown>>(
    'SELECT * FROM system_prompts ORDER BY created_at DESC'
  );
  assert.equal(afterDel.length, 0);
});

test('sqlite-store handles conversations and messages with cascade delete', async () => {
  const store = createSqliteStore(createMemoryStorage());

  await store.execute(
    'INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)',
    ['conv-1', 'Test Chat', 1000, 1000]
  );
  await store.execute(
    'INSERT INTO messages (id, conversation_id, role, content, timestamp, attached_files) VALUES (?, ?, ?, ?, ?, ?)',
    ['msg-1', 'conv-1', 'user', 'Hello', 1500, null]
  );

  const convs = await store.select<Array<{ id: string; updated_at: number }>>(
    'SELECT * FROM conversations ORDER BY updated_at DESC'
  );
  assert.equal(convs.length, 1);
  assert.equal(convs[0].updated_at, 1500);

  const msgs = await store.select<Array<{ id: string; content: string }>>(
    'SELECT * FROM messages WHERE conversation_id IN (?) ORDER BY conversation_id, timestamp ASC',
    ['conv-1']
  );
  assert.equal(msgs.length, 1);
  assert.equal(msgs[0].content, 'Hello');

  await store.execute('DELETE FROM conversations WHERE id = ?', ['conv-1']);
  const remainingMsgs = await store.select<Array<unknown>>(
    'SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC',
    ['conv-1']
  );
  assert.equal(remainingMsgs.length, 0);
});

test('command-handler handles version, navigation, secure storage, and license masking', async () => {
  const visited: string[] = [];
  const invoke = createCommandRouter({
    storage: createMemoryStorage(),
    navigate: (path) => visited.push(path),
    getPath: () => visited[visited.length - 1] ?? '/',
  });

  assert.equal(await invoke('get_app_version'), '0.1.9');

  await invoke('open_dashboard');
  assert.deepEqual(visited, ['/dashboard']);

  await invoke('exit_app');
  assert.deepEqual(visited, ['/dashboard', '/']);

  await invoke('secure_storage_save', {
    items: [{ key: 'pluely_license_key', value: 'abcd1234efgh5678' }],
  });
  const storage = await invoke<{ license_key?: string; instance_id?: string }>(
    'secure_storage_get'
  );
  assert.equal(storage.license_key, 'abcd1234efgh5678');
  assert.ok(storage.instance_id && storage.instance_id.length > 0);

  assert.equal(maskLicenseKey('abcd1234efgh5678'), 'abcd****5678');
  assert.equal(validateShortcutKey('CommandOrControl+Shift+A'), true);
  assert.equal(validateShortcutKey(''), false);
});
