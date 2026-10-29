import { UPGRADES, TOTAL_FLOORS, REGIONS } from "./content.js?v=3.2.0";
import { validateRun as validateSavedRun } from "./engine.js?v=3.2.0";

export const SAVE_KEY = "yala.save.v1";
export const BACKUP_KEY = "yala.backup.v1";
export function freshProfile() {
  return {
    version: 1,
    meta: {
      shards: 0,
      lifetimeShards: 0,
      runs: 0,
      wins: 0,
      bestFloor: 0,
      kills: 0,
      bosses: [],
      upgrades: {},
    },
    run: null,
    settings: { sound: false, reducedMotion: false },
  };
}
const integer = (n, max = 10000000) =>
  Number.isSafeInteger(n) && n >= 0 && n <= max;
export function validateProfile(value, validateRun = validateSavedRun) {
  if (!value || value.version !== 1 || !value.meta || !value.settings)
    return false;
  const m = value.meta;
  if (
    !["shards", "lifetimeShards", "runs", "wins", "bestFloor", "kills"].every(
      (k) => integer(m[k], k === "bestFloor" ? TOTAL_FLOORS : 10000000),
    )
  )
    return false;
  if (
    !Array.isArray(m.bosses) ||
    m.bosses.length > REGIONS.length ||
    new Set(m.bosses).size !== m.bosses.length ||
    !m.bosses.every((id) =>
      REGIONS.some((region) => region.bossId === id),
    )
  )
    return false;
  if (
    !m.upgrades ||
    typeof m.upgrades !== "object" ||
    Array.isArray(m.upgrades)
  )
    return false;
  if (
    !Object.entries(m.upgrades).every(([id, level]) =>
      UPGRADES.some((u) => u.id === id && integer(level, u.maxLevel)),
    )
  )
    return false;
  if (
    typeof value.settings.sound !== "boolean" ||
    typeof value.settings.reducedMotion !== "boolean"
  )
    return false;
  if (value.run === null) return true;
  const r = value.run;
  if (!r || typeof r !== "object" || !validateRun(r)) return false;
  if (
    !["creditedShards", "creditedKills"].every(
      (k) => r[k] === undefined || integer(r[k]),
    )
  )
    return false;
  if ((r.creditedShards || 0) > r.shards || (r.creditedKills || 0) > r.kills)
    return false;
  return (
    r.victoryCredited === undefined ||
    (typeof r.victoryCredited === "boolean" &&
      (!r.victoryCredited || r.phase === "won"))
  );
}
export function loadProfile(storage, validateRun) {
  if (!storage) return { profile: freshProfile(), status: "unavailable" };
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (raw) {
      try {
        const profile = JSON.parse(raw);
        if (validateProfile(profile, validateRun))
          return { profile, status: "ok" };
      } catch {
        /* Try the previous atomic snapshot. */
      }
    }
    try {
      const profile = JSON.parse(storage.getItem(BACKUP_KEY));
      if (validateProfile(profile, validateRun))
        return { profile, status: "recovered" };
    } catch {
      /* Keep invalid bytes until an explicit new save. */
    }
    return { profile: freshProfile(), status: raw ? "corrupt" : "new" };
  } catch {
    return { profile: freshProfile(), status: "unavailable" };
  }
}
export function saveProfile(storage, profile) {
  if (!storage) return false;
  try {
    if (!validateProfile(profile)) return false;
    const encoded = JSON.stringify(profile);
    const previous = storage.getItem(SAVE_KEY);
    // Backup failure must not prevent the current, more valuable save.
    if (previous) {
      try {
        // Never replace the recovery snapshot with the invalid bytes we recovered from.
        if (validateProfile(JSON.parse(previous)))
          storage.setItem(BACKUP_KEY, previous);
      } catch {
        /* Quota can still permit replacement. */
      }
    }
    storage.setItem(SAVE_KEY, encoded);
    return true;
  } catch {
    return false;
  }
}
/** Credit only new rewards. Run counters travel with the run in the same atomic save. */
export function syncProgress(profile) {
  const r = profile.run;
  if (!r) return;
  const m = profile.meta;
  const shardDelta = Math.max(0, (r.shards || 0) - (r.creditedShards || 0));
  m.shards += shardDelta;
  m.lifetimeShards += shardDelta;
  r.creditedShards = r.shards || 0;
  m.kills += Math.max(0, (r.kills || 0) - (r.creditedKills || 0));
  r.creditedKills = r.kills || 0;
  m.bestFloor = Math.max(m.bestFloor, r.floor);
  for (const boss of r.bosses || [])
    if (!m.bosses.includes(boss)) m.bosses.push(boss);
  if (r.phase === "won" && !r.victoryCredited) {
    m.wins++;
    r.victoryCredited = true;
  }
}
