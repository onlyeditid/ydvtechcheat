export type UnlistenFn = () => void;

export interface Event<T> {
  event: string;
  id: number;
  payload: T;
}

type Handler<T = unknown> = (event: Event<T>) => void;

const listeners = new Map<string, Set<Handler<any>>>();
let nextId = 1;

export async function listen<T = unknown>(
  event: string,
  handler: Handler<T>
): Promise<UnlistenFn> {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  const set = listeners.get(event)!;
  set.add(handler);
  return () => {
    set.delete(handler);
  };
}

export async function once<T = unknown>(
  event: string,
  handler: Handler<T>
): Promise<UnlistenFn> {
  const unlisten = await listen<T>(event, (e) => {
    unlisten();
    handler(e);
  });
  return unlisten;
}

export async function emit<T = unknown>(
  event: string,
  payload?: T
): Promise<void> {
  const set = listeners.get(event);
  if (!set) return;
  const eventObj: Event<T> = {
    event,
    id: nextId++,
    payload: payload as T,
  };
  for (const handler of [...set]) {
    handler(eventObj);
  }
}
