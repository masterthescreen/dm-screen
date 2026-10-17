const { test } = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript"),
  fs = require("node:fs"),
  Module = require("node:module"),
  path = require("node:path");
function load(file, stubs = {}) {
  const filename = path.resolve(file),
    m = new Module(filename, module);
  m.paths = module.paths;
  m.require = (id) => (id in stubs ? stubs[id] : require(id));
  m._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    filename,
  );
  return m.exports;
}
const policy = load("lib/server/nyxi-policy.ts");
function setup({ failAudit = false } = {}) {
  let value = [{ id: "a", title: "Before", content: "Saved", tags: [] }],
    pending,
    audits = [],
    staged = [],
    calls = [];
  const conn = {
    beginTransaction: async () => {
      pending = structuredClone(value);
      staged = [];
      calls.push("begin");
    },
    commit: async () => {
      value = pending;
      audits.push(...staged);
      calls.push("commit");
    },
    rollback: async () => {
      calls.push("rollback");
    },
    release: () => calls.push("release"),
    query: async (sql, args) => {
      calls.push(sql);
      if (sql.startsWith("SELECT state_value"))
        return [[{ state_value: JSON.stringify(pending) }]];
      if (sql.startsWith("SELECT *"))
        return [[audits.find((a) => a.id === args[0])].filter(Boolean)];
      if (sql.startsWith("INSERT INTO codex_nyxi_audit")) {
        if (failAudit) throw Error("disk full");
        staged.push({
          id: args[0],
          state_key: args[1],
          actor: args[2],
          reason: args[3],
          before_value: args[4],
          after_value: args[5],
        });
      }
      if (sql.startsWith("UPDATE codex_state")) pending = JSON.parse(args[0]);
      return [{}];
    },
  };
  const server = load("lib/server/nyxi.ts", {
    "@/lib/server/db": {
      ensureTables: async () => {},
      getPool: () => ({ getConnection: async () => conn }),
      getState: async () => value,
    },
    "@/lib/server/players": {
      listPublic: async () => [
        {
          id: "p",
          character: { level: 3 },
          notes: [{ content: "Private journal" }],
        },
      ],
    },
    "@/lib/server/session": {
      requireGm: async () => ({ ok: false, res: { status: 403 } }),
      fail: (status, message) => ({ status, message }),
    },
    "@/lib/server/crypto": { safeEqual: (a, b) => a === b },
    "@/lib/server/ratelimit": {
      takeToken: () => ({ ok: true }),
      clientIp: () => "test",
    },
    "@/lib/server/nyxi-policy": policy,
  });
  return {
    server,
    calls,
    audits,
    get value() {
      return value;
    },
    set value(v) {
      value = v;
    },
  };
}
const edit = (value) => ({
  dataset: "gmnotes",
  revision: policy.revision(value),
  operation: "update",
  id: "a",
  fields: { title: "After" },
  reason: "GM requested rename",
});
test("successful mutation commits snapshot before write and undo restores original", async () => {
  const s = setup(),
    before = s.value;
  const result = await s.server.mutate(edit(before));
  assert.equal(s.value[0].title, "After");
  assert.equal(s.audits.length, 1);
  assert.deepEqual(JSON.parse(s.audits[0].before_value), before);
  assert.ok(
    s.calls.findIndex((x) => x.startsWith("INSERT INTO codex_nyxi_audit")) <
      s.calls.findIndex((x) => x.startsWith("UPDATE codex_state")),
  );
  await s.server.undo(result.id);
  assert.deepEqual(s.value, before);
  assert.equal(s.audits[1].actor, "gm-undo");
});
test("audit failure rolls back without writing campaign data", async () => {
  const s = setup({ failAudit: true }),
    before = s.value;
  await assert.rejects(s.server.mutate(edit(before)));
  assert.deepEqual(s.value, before);
  assert.ok(s.calls.includes("rollback"));
  assert.ok(!s.calls.some((x) => x.startsWith("UPDATE codex_state")));
  assert.ok(s.calls.includes("release"));
});
test("stale mutation rolls back and leaves no audit", async () => {
  const s = setup();
  await assert.rejects(
    s.server.mutate({ ...edit(s.value), revision: "stale" }),
    (e) => e.status === 409,
  );
  assert.equal(s.audits.length, 0);
  assert.ok(s.calls.includes("rollback"));
});
test("undo refuses to overwrite subsequent manual changes", async () => {
  const s = setup();
  const result = await s.server.mutate(edit(s.value));
  s.value = [{ ...s.value[0], content: "Later manual edit" }];
  await assert.rejects(s.server.undo(result.id), (e) => e.status === 409);
  assert.equal(s.value[0].content, "Later manual edit");
  assert.equal(s.audits.length, 1);
});
test("player session and incorrect bearer rejected; scoped bearer accepted", async () => {
  const s = setup();
  const previous = process.env.NYXI_APP_KEY;
  process.env.NYXI_APP_KEY = "x".repeat(40);
  try {
    assert.equal(
      (
        await s.server.requireNyxi(
          new Request("https://dev.example/api/nyxi/context"),
        )
      ).res.status,
      403,
    );
    assert.equal(
      (
        await s.server.requireNyxi(
          new Request("https://dev.example/api/nyxi/context", {
            headers: { authorization: "Bearer bad" },
          }),
        )
      ).res.status,
      401,
    );
    assert.equal(
      (
        await s.server.requireNyxi(
          new Request("https://dev.example/api/nyxi/context", {
            headers: { authorization: "Bearer " + "x".repeat(40) },
          }),
        )
      ).ok,
      true,
    );
  } finally {
    if (previous === undefined) delete process.env.NYXI_APP_KEY;
    else process.env.NYXI_APP_KEY = previous;
  }
});
test("context returns sanitized player notebooks and sheets", async () => {
  const s = setup();
  const out = await s.server.context("players");
  assert.equal(out.players[0].character.level, 3);
  assert.equal(out.players[0].notes[0].content, "Private journal");
  await assert.rejects(s.server.context("auth"), (e) => e.status === 404);
});
