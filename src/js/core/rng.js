export function hashSeed(input) {
  const text = input == null ? '' : String(input);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function createRng(seed) {
  const initial = Number(seed);
  const safe = Number.isFinite(initial) ? Math.floor(initial) >>> 0 : 0;
  let state = safe;

  const rng = {
    seed: safe,
    next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int(min, max) {
      const lo = Math.ceil(Math.min(min, max));
      const hi = Math.floor(Math.max(min, max));
      if (!Number.isFinite(lo) || !Number.isFinite(hi)) return lo;
      return lo + Math.floor(this.next() * (hi - lo + 1));
    },
    pick(list) {
      if (!Array.isArray(list) || list.length === 0) return undefined;
      return list[Math.floor(this.next() * list.length)];
    },
    chance(probability) {
      return this.next() < probability;
    },
  };

  return rng;
}
