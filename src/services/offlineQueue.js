const QUEUE_KEY = "webkore-offline-queue-v1";

export function readQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY)) || [];
  } catch {
    return [];
  }
}

export function enqueueOfflineAction(action) {
  const queue = readQueue();
  const nextQueue = [
    ...queue,
    {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: navigator.onLine ? "ready" : "offline",
      action
    }
  ];
  localStorage.setItem(QUEUE_KEY, JSON.stringify(nextQueue));
  return nextQueue;
}

export function flushQueue() {
  const queue = readQueue();
  const synced = queue.map((item) => ({ ...item, status: "synced", syncedAt: new Date().toISOString() }));
  localStorage.setItem(QUEUE_KEY, JSON.stringify(synced));
  return synced;
}
