const listeners = new Set();

export const sessionBus = {
  onUnauthorized(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  emitUnauthorized() {
    listeners.forEach((fn) => fn());
  },
};
