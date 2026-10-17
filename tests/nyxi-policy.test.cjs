const { test } = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const fs = require("node:fs");
const Module = require("node:module");
const filename = require("node:path").resolve("lib/server/nyxi-policy.ts");
const mod = new Module(filename, module);
mod.paths = module.paths;
mod._compile(
  ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  filename,
);
const { applyChange, revision } = mod.exports;
const notes = [
  { id: "a", title: "Old", content: "Keep", tags: [], createdAt: "yesterday" },
];
const change = (current, patch = {}) => ({
  dataset: "gmnotes",
  revision: revision(current),
  operation: "update",
  id: "a",
  fields: { title: "New" },
  reason: "GM asked",
  ...patch,
});
test("updates only requested fields without mutating original", () => {
  const next = applyChange(notes, change(notes));
  assert.equal(next[0].title, "New");
  assert.equal(next[0].content, "Keep");
  assert.equal(notes[0].title, "Old");
});
test("stale revision fails", () =>
  assert.throws(
    () => applyChange(notes, change(notes, { revision: "stale" })),
    (e) => e.status === 409,
  ));
for (const dataset of ["players", "auth", "dicehistory", "__proto__"])
  test(`${dataset} is not writable`, () =>
    assert.throws(
      () => applyChange(notes, change(notes, { dataset })),
      (e) => e.status === 403,
    ));
for (const key of ["sharedWith", "id", "codeHash", "passHash", "__proto__"])
  test(`cannot write ${key}`, () =>
    assert.throws(
      () =>
        applyChange(
          notes,
          change(notes, { fields: JSON.parse(`{"${key}":"bad"}`) }),
        ),
      (e) => e.status === 400,
    ));
test("no replace-all operation", () =>
  assert.throws(
    () => applyChange(notes, change(notes, { operation: "replace" })),
    (e) => e.status === 400,
  ));
test("server creates ID, timestamp and complete note defaults", () => {
  const next = applyChange(
    [],
    change([], { operation: "create", fields: { title: "Hello" } }),
  );
  assert.equal(next[0].content, "");
  assert.deepEqual(next[0].tags, []);
  assert.ok(next[0].createdAt);
  assert.ok(next[0].id);
});
const world = {
  id: "w",
  name: "World",
  continents: [{ id: "c", name: "Land", kingdoms: [], sharedWith: ["player"] }],
};
test("lore update preserves sharing", () => {
  const next = applyChange(
    world,
    change(world, { dataset: "world", id: "c", fields: { name: "New land" } }),
  );
  assert.deepEqual(next.continents[0].sharedWith, ["player"]);
});
test("nested create requires existing valid parent and collection", () => {
  const next = applyChange(
    world,
    change(world, {
      dataset: "world",
      operation: "create",
      parentId: "c",
      collection: "kingdoms",
      fields: { name: "Kingdom" },
    }),
  );
  assert.deepEqual(next.continents[0].kingdoms[0].cities, []);
  assert.throws(() =>
    applyChange(
      world,
      change(world, {
        dataset: "world",
        operation: "create",
        parentId: "missing",
        collection: "cities",
        fields: { name: "No" },
      }),
    ),
  );
});
test("populated container and root deletion blocked", () => {
  assert.throws(() =>
    applyChange(
      world,
      change(world, { dataset: "world", id: "w", operation: "delete" }),
    ),
  );
  const full = {
    ...world,
    continents: [
      { ...world.continents[0], sharedWith: [], kingdoms: [{ id: "k" }] },
    ],
  };
  assert.throws(() =>
    applyChange(
      full,
      change(full, { dataset: "world", id: "c", operation: "delete" }),
    ),
  );
});
test("shared entry deletion blocked", () =>
  assert.throws(
    () =>
      applyChange(
        world,
        change(world, { dataset: "world", id: "c", operation: "delete" }),
      ),
    (e) => e.status === 403,
  ));
test("one deletion preserves other entries", () => {
  const data = [...notes, { ...notes[0], id: "b" }];
  assert.deepEqual(
    applyChange(data, change(data, { operation: "delete" })).map((x) => x.id),
    ["b"],
  );
});
test("child array replacement blocked", () =>
  assert.throws(() =>
    applyChange(
      world,
      change(world, { dataset: "world", id: "w", fields: { continents: [] } }),
    ),
  ));
test("wrong field types blocked", () =>
  assert.throws(() =>
    applyChange(notes, change(notes, { fields: { tags: "bad" } })),
  ));
test("table entry can be edited individually", () => {
  const data = [
    {
      id: "t",
      name: "Table",
      entries: [{ id: "a", range: "1", result: "Old" }],
    },
  ];
  assert.equal(
    applyChange(
      data,
      change(data, { dataset: "encountertables", fields: { result: "New" } }),
    )[0].entries[0].result,
    "New",
  );
});
