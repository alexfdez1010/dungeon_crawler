import test from "node:test";
import assert from "node:assert/strict";
import {
  freshProfile,
  saveProfile,
  loadProfile,
  syncProgress,
  validateProfile,
  SAVE_KEY,
  BACKUP_KEY,
} from "../web/storage.js";
import { createRun } from "../web/engine.js";
import { classUnlocked } from "../web/content.js";

const store = () => {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
};
function profileWithRun() {
  const profile = freshProfile();
  profile.run = createRun({ seed: 20261017 });
  profile.meta.runs = 1;
  return profile;
}

test("save survives reload and credits rewards once across snapshots", () => {
  const storage = store(),
    profile = profileWithRun();
  Object.assign(profile.run, {
    shards: 21,
    kills: 8,
    bosses: ["cinder_warden"],
  });
  syncProgress(profile);
  assert.equal(saveProfile(storage, profile), true);
  const loaded = loadProfile(storage).profile;
  syncProgress(loaded);
  assert.equal(loaded.meta.shards, 21);
  assert.equal(loaded.meta.kills, 8);
  loaded.run.shards += 3;
  syncProgress(loaded);
  assert.equal(loaded.meta.shards, 24);
  assert.deepEqual(loaded.meta.bosses, ["cinder_warden"]);
  assert.equal(
    classUnlocked("ranger", loaded.meta),
    true,
    "boss credit unlocks the next class immediately",
  );
  assert.equal(classUnlocked("arcanist", loaded.meta), false);
  loaded.run.bosses.push("briar_queen");
  syncProgress(loaded);
  assert.equal(classUnlocked("arcanist", loaded.meta), true);
});

test("corrupt current save recovers backup; corrupt both returns safe defaults", () => {
  const storage = store(),
    profile = freshProfile();
  saveProfile(storage, profile);
  profile.meta.runs = 1;
  saveProfile(storage, profile);
  storage.setItem(SAVE_KEY, "{broken");
  assert.equal(loadProfile(storage).status, "recovered");
  storage.setItem(BACKUP_KEY, "null");
  assert.equal(loadProfile(storage).status, "corrupt");
});

test("saving after recovery preserves the valid backup if the current slot is corrupt", () => {
  const storage = store(),
    profile = profileWithRun();
  saveProfile(storage, profile);
  profile.meta.runs = 2;
  saveProfile(storage, profile);
  storage.setItem(SAVE_KEY, "{broken");
  const recovered = loadProfile(storage);
  assert.equal(recovered.status, "recovered");
  assert.equal(recovered.profile.meta.runs, 1);
  assert.equal(saveProfile(storage, recovered.profile), true);
  storage.setItem(SAVE_KEY, "{broken again");
  assert.equal(loadProfile(storage).status, "recovered");
  storage.setItem(SAVE_KEY, "");
  assert.equal(
    loadProfile(storage).status,
    "recovered",
    "a missing current slot can still recover its backup",
  );
});

test("unavailable or full browser storage does not throw and preserves the prior save", () => {
  const unavailable = {
    getItem() {
      throw Error("denied");
    },
    setItem() {
      throw Error("full");
    },
  };
  assert.equal(loadProfile(unavailable).status, "unavailable");
  assert.equal(saveProfile(unavailable, freshProfile()), false);
  const storage = store(),
    original = freshProfile();
  saveProfile(storage, original);
  const quota = {
    getItem: storage.getItem,
    setItem(key, value) {
      if (key === SAVE_KEY) throw Error("quota");
      storage.setItem(key, value);
    },
  };
  const changed = freshProfile();
  changed.meta.runs = 2;
  assert.equal(saveProfile(quota, changed), false);
  assert.deepEqual(loadProfile(storage).profile, original);
});

test("profile rejects malformed scores, upgrades, run shape and duplicate boss credit", () => {
  const mutations = [
    (profile) => {
      profile.meta.upgrades.vitality = 500;
    },
    (profile) => {
      profile.meta.shards = Infinity;
    },
    (profile) => {
      profile.meta.kills = "12";
    },
    (profile) => {
      profile.meta.bosses = ["cinder_warden", "cinder_warden"];
    },
    (profile) => {
      profile.run = { floor: 1 };
    },
    (profile) => {
      profile.run = undefined;
    },
    (profile) => {
      profile.run.creditedKills = profile.run.kills + 1;
    },
    (profile) => {
      profile.run.creditedShards = profile.run.shards + 1;
    },
    (profile) => {
      profile.run.victoryCredited = "yes";
    },
    (profile) => {
      profile.run.victoryCredited = true;
    },
  ];
  for (const mutate of mutations) {
    const profile = profileWithRun();
    mutate(profile);
    assert.equal(validateProfile(profile), false, mutate.toString());
    assert.equal(
      saveProfile(store(), profile),
      false,
      "invalid state must not replace a good browser save",
    );
  }
});

test("victory counted only once", () => {
  const profile = freshProfile();
  profile.run = { floor: 12, shards: 100, kills: 50, bosses: [], phase: "won" };
  syncProgress(profile);
  syncProgress(profile);
  assert.equal(profile.meta.wins, 1);
  assert.equal(profile.meta.shards, 100);
});
