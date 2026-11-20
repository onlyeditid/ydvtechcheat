export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface ExecuteResult {
  rowsAffected: number;
  lastInsertId: number;
}

interface SqliteDbState {
  conversations: Array<{
    id: string;
    title: string;
    created_at: number;
    updated_at: number;
  }>;
  messages: Array<{
    id: string;
    conversation_id: string;
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: number;
    attached_files: string | null;
  }>;
  system_prompts: Array<{
    id: number;
    name: string;
    prompt: string;
    created_at: string;
    updated_at: string;
  }>;
  nextPromptId: number;
}

const STORAGE_KEY = "pluely_sqlite_db_v1";

function createDefaultState(): SqliteDbState {
  return {
    conversations: [],
    messages: [],
    system_prompts: [],
    nextPromptId: 1,
  };
}

export function createSqliteStore(storage?: StorageAdapter) {
  const adapter: StorageAdapter =
    storage ??
    (typeof window !== "undefined" && window.localStorage
      ? window.localStorage
      : (() => {
          const mem = new Map<string, string>();
          return {
            getItem: (k: string) => mem.get(k) ?? null,
            setItem: (k: string, v: string) => {
              mem.set(k, v);
            },
          };
        })());

  const loadState = (): SqliteDbState => {
    try {
      const raw = adapter.getItem(STORAGE_KEY);
      if (!raw) return createDefaultState();
      const parsed = JSON.parse(raw) as Partial<SqliteDbState>;
      return {
        conversations: Array.isArray(parsed.conversations)
          ? parsed.conversations
          : [],
        messages: Array.isArray(parsed.messages) ? parsed.messages : [],
        system_prompts: Array.isArray(parsed.system_prompts)
          ? parsed.system_prompts
          : [],
        nextPromptId:
          typeof parsed.nextPromptId === "number" ? parsed.nextPromptId : 1,
      };
    } catch {
      return createDefaultState();
    }
  };

  const saveState = (state: SqliteDbState) => {
    adapter.setItem(STORAGE_KEY, JSON.stringify(state));
  };

  const nowSqlDatetime = () =>
    new Date().toISOString().replace("T", " ").slice(0, 19);

  async function execute(
    query: string,
    bindValues: unknown[] = []
  ): Promise<ExecuteResult> {
    const sql = query.replace(/\s+/g, " ").trim();
    const state = loadState();

    // INSERT INTO conversations
    if (/^INSERT INTO conversations\b/i.test(sql)) {
      const [id, title, created_at, updated_at] = bindValues as [
        string,
        string,
        number,
        number,
      ];
      const existingIdx = state.conversations.findIndex((c) => c.id === id);
      if (existingIdx >= 0) {
        throw new Error(`UNIQUE constraint failed: conversations.id (${id})`);
      }
      state.conversations.push({ id, title, created_at, updated_at });
      saveState(state);
      return { rowsAffected: 1, lastInsertId: 0 };
    }

    // INSERT INTO messages
    if (/^INSERT INTO messages\b/i.test(sql)) {
      const [id, conversation_id, role, content, timestamp, attached_files] =
        bindValues as [
          string,
          string,
          "user" | "assistant" | "system",
          string,
          number,
          string | null,
        ];
      state.messages.push({
        id,
        conversation_id,
        role,
        content,
        timestamp,
        attached_files: attached_files ?? null,
      });
      // Mirror SQLite trigger: update conversation updated_at
      const conv = state.conversations.find((c) => c.id === conversation_id);
      if (conv) {
        conv.updated_at = timestamp;
      }
      saveState(state);
      return { rowsAffected: 1, lastInsertId: 0 };
    }

    // UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?
    if (/^UPDATE conversations SET\b/i.test(sql)) {
      const [title, updated_at, id] = bindValues as [string, number, string];
      const conv = state.conversations.find((c) => c.id === id);
      if (!conv) return { rowsAffected: 0, lastInsertId: 0 };
      conv.title = title;
      conv.updated_at = updated_at;
      saveState(state);
      return { rowsAffected: 1, lastInsertId: 0 };
    }

    // DELETE FROM messages WHERE conversation_id = ?
    if (/^DELETE FROM messages WHERE conversation_id = \?/i.test(sql)) {
      const [conversationId] = bindValues as [string];
      const before = state.messages.length;
      state.messages = state.messages.filter(
        (m) => m.conversation_id !== conversationId
      );
      saveState(state);
      return { rowsAffected: before - state.messages.length, lastInsertId: 0 };
    }

    // DELETE FROM messages (all)
    if (/^DELETE FROM messages$/i.test(sql)) {
      const count = state.messages.length;
      state.messages = [];
      saveState(state);
      return { rowsAffected: count, lastInsertId: 0 };
    }

    // DELETE FROM conversations WHERE id = ?
    if (/^DELETE FROM conversations WHERE id = \?/i.test(sql)) {
      const [id] = bindValues as [string];
      const before = state.conversations.length;
      state.conversations = state.conversations.filter((c) => c.id !== id);
      // ON DELETE CASCADE
      state.messages = state.messages.filter((m) => m.conversation_id !== id);
      saveState(state);
      return {
        rowsAffected: before - state.conversations.length,
        lastInsertId: 0,
      };
    }

    // DELETE FROM conversations (all)
    if (/^DELETE FROM conversations$/i.test(sql)) {
      const count = state.conversations.length;
      state.conversations = [];
      state.messages = [];
      saveState(state);
      return { rowsAffected: count, lastInsertId: 0 };
    }

    // INSERT INTO system_prompts (name, prompt) VALUES (?, ?)
    if (/^INSERT INTO system_prompts\b/i.test(sql)) {
      const [name, prompt] = bindValues as [string, string];
      const id = state.nextPromptId++;
      const ts = nowSqlDatetime();
      state.system_prompts.push({
        id,
        name,
        prompt,
        created_at: ts,
        updated_at: ts,
      });
      saveState(state);
      return { rowsAffected: 1, lastInsertId: id };
    }

    // UPDATE system_prompts SET ... WHERE id = ?
    if (/^UPDATE system_prompts SET\b/i.test(sql)) {
      const id = Number(bindValues[bindValues.length - 1]);
      const item = state.system_prompts.find((p) => p.id === id);
      if (!item) return { rowsAffected: 0, lastInsertId: 0 };

      const setMatch = sql.match(/SET (.+?) WHERE/i);
      const clauses = setMatch
        ? setMatch[1].split(",").map((s) => s.trim())
        : [];
      clauses.forEach((clause, idx) => {
        if (clause.startsWith("name")) {
          item.name = String(bindValues[idx]);
        } else if (clause.startsWith("prompt")) {
          item.prompt = String(bindValues[idx]);
        }
      });
      item.updated_at = nowSqlDatetime();
      saveState(state);
      return { rowsAffected: 1, lastInsertId: 0 };
    }

    // DELETE FROM system_prompts WHERE id = ?
    if (/^DELETE FROM system_prompts WHERE id = \?/i.test(sql)) {
      const id = Number(bindValues[0]);
      const before = state.system_prompts.length;
      state.system_prompts = state.system_prompts.filter((p) => p.id !== id);
      saveState(state);
      return {
        rowsAffected: before - state.system_prompts.length,
        lastInsertId: 0,
      };
    }

    return { rowsAffected: 0, lastInsertId: 0 };
  }

  async function select<T = unknown[]>(
    query: string,
    bindValues: unknown[] = []
  ): Promise<T> {
    const sql = query.replace(/\s+/g, " ").trim();
    const state = loadState();

    // SELECT * FROM conversations ORDER BY updated_at DESC
    if (/^SELECT \* FROM conversations ORDER BY updated_at DESC/i.test(sql)) {
      return [...state.conversations].sort(
        (a, b) => b.updated_at - a.updated_at
      ) as unknown as T;
    }

    // SELECT * FROM conversations WHERE id = ?
    if (/^SELECT \* FROM conversations WHERE id = \?/i.test(sql)) {
      const [id] = bindValues as [string];
      return state.conversations.filter((c) => c.id === id) as unknown as T;
    }

    // SELECT * FROM messages WHERE conversation_id IN (...)
    if (/^SELECT \* FROM messages WHERE conversation_id IN \(/i.test(sql)) {
      const ids = new Set(bindValues as string[]);
      return state.messages
        .filter((m) => ids.has(m.conversation_id))
        .sort((a, b) => {
          if (a.conversation_id !== b.conversation_id) {
            return a.conversation_id.localeCompare(b.conversation_id);
          }
          return a.timestamp - b.timestamp;
        }) as unknown as T;
    }

    // SELECT * FROM messages WHERE conversation_id = ?
    if (/^SELECT \* FROM messages WHERE conversation_id = \?/i.test(sql)) {
      const [conversationId] = bindValues as [string];
      const filtered = state.messages.filter(
        (m) => m.conversation_id === conversationId
      );
      if (/ORDER BY timestamp ASC/i.test(sql)) {
        filtered.sort((a, b) => a.timestamp - b.timestamp);
      }
      return filtered as unknown as T;
    }

    // SELECT * FROM system_prompts ORDER BY created_at DESC
    if (/^SELECT \* FROM system_prompts ORDER BY created_at DESC/i.test(sql)) {
      return [...state.system_prompts].sort(
        (a, b) => b.id - a.id
      ) as unknown as T;
    }

    // SELECT * FROM system_prompts WHERE id = ?
    if (/^SELECT \* FROM system_prompts WHERE id = \?/i.test(sql)) {
      const id = Number(bindValues[0]);
      return state.system_prompts.filter((p) => p.id === id) as unknown as T;
    }

    return [] as unknown as T;
  }

  return { execute, select };
}
