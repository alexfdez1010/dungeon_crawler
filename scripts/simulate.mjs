#!/usr/bin/env node
import * as currentWorld from "../web/content.js";
import * as currentEngine from "../web/engine.js";
import { simulateRun, summarize, upgradePreset } from "../web/simulation.js";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const argument = args.find((arg) => arg.startsWith(`--${name}=`));
  return argument ? argument.slice(name.length + 3) : fallback;
};
if (args.includes("--help")) {
  console.log("node scripts/simulate.mjs [--seeds=1,2,3 | --count=20 --start=1] [--classes=warden,ranger,arcanist,luminary] [--presets=zero,mid,max] [--policies=naive,tactical] [--max-turns=20000] [--floor-turns=2000] [--ref=git-commit] [--json] [--trace]");
  process.exit(0);
}
let world = currentWorld;
let engine = currentEngine;
let revision = "working-tree";
if (option("ref", "")) {
  // Compare the identical policy against real historical code, isolated from the checkout.
  const cwd = fileURLToPath(new URL("..", import.meta.url));
  revision = execFileSync("git", ["rev-parse", "--verify", `${option("ref")}^{commit}`], { cwd, encoding: "utf8" }).trim();
  const directory = mkdtempSync(join(tmpdir(), "yala-balance-"));
  process.on("exit", () => rmSync(directory, { recursive: true, force: true }));
  writeFileSync(join(directory, "package.json"), '{"type":"module"}');
  for (const file of ["content.js", "engine.js"]) {
    writeFileSync(join(directory, file), execFileSync("git", ["show", `${revision}:web/${file}`], { cwd }));
  }
  world = await import(pathToFileURL(join(directory, "content.js")));
  engine = await import(pathToFileURL(join(directory, "engine.js")));
}
const positive = (value, name, max = 1000000) => {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > max) throw new Error(`${name} must be an integer from 1 to ${max}`);
  return number;
};
const seeds = option("seeds", "").split(",").filter(Boolean).map((seed) => {
  const n = Number(seed);
  if (!Number.isSafeInteger(n) || n < 0 || n > 4294967295) throw new Error(`Invalid seed: ${seed}`);
  return n;
});
if (!seeds.length) {
  const count = positive(option("count", "5"), "count", 10000);
  const start = positive(option("start", "1"), "start", 4294967295);
  for (let i = 0; i < count; i++) {
    if (start + i > 4294967295) throw new Error("Seed range exceeds uint32");
    seeds.push(start + i);
  }
}
const classes = option("classes", world.CLASSES.map((c) => c.id).join(",")).split(",");
for (const id of classes) if (!world.CLASSES.some((c) => c.id === id)) throw new Error(`Unknown class: ${id}`);
const presets = option("presets", "zero,mid,max").split(",");
const policies = option("policies", "naive,tactical").split(",");
const maxTurns = positive(option("max-turns", "20000"), "max-turns");
const maxFloorTurns = positive(option("floor-turns", "2000"), "floor-turns");
const results = [];
for (const classId of classes) for (const preset of presets) for (const policy of policies) for (const seed of seeds) {
  const result = simulateRun({ classId, seed, upgrades: upgradePreset(preset, world), policy, maxTurns, maxFloorTurns, trace: args.includes("--trace"), engine, world });
  results.push({ ...result, preset });
  if (!args.includes("--json")) console.error(`${classId}/${preset}/${policy} seed=${seed}: ${result.outcome} floor=${result.floor} turns=${result.turns}${result.reason ? ` (${result.reason})` : ""}`);
}
const summary = summarize(results);
if (args.includes("--json")) console.log(JSON.stringify({ schemaVersion: 1, revision, totalFloors: world.TOTAL_FLOORS, seeds,
  limits: { maxTurns, maxFloorTurns }, summary, results }, null, 2));
else console.table(summary.map(({ floors, ...row }) => row));
