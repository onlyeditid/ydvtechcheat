import { createSqliteStore, ExecuteResult } from "./sqlite-store";

export type QueryResult = ExecuteResult;

export default class Database {
  private store = createSqliteStore();

  static async load(_path: string): Promise<Database> {
    return new Database();
  }

  async execute(
    query: string,
    bindValues?: unknown[]
  ): Promise<ExecuteResult> {
    return this.store.execute(query, bindValues);
  }

  async select<T>(query: string, bindValues?: unknown[]): Promise<T> {
    return this.store.select<T>(query, bindValues);
  }

  async close(): Promise<boolean> {
    return true;
  }
}
