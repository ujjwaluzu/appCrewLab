import { beforeEach, describe, expect, it, vi } from "vitest";

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const PROJECT = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const INCOMING = "bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb";
const OUTGOING = "cccccccc-1111-4111-8111-cccccccccccc";

let authenticated = true;
let tables: Record<string, Record<string, unknown>[]>;
let failingTable: string | null;
let failingRpc = false;
let writes: { table: string; payload: unknown; options?: unknown }[];

type QueryResult = { data: Record<string, unknown>[] | null; error: { message: string } | null };
type QueryBuilder = PromiseLike<QueryResult> & {
  select(): QueryBuilder;
  eq(column: string, value: unknown): QueryBuilder;
  neq(column: string, value: unknown): QueryBuilder;
  in(column: string, value: unknown): QueryBuilder;
  ilike(column: string, value: unknown): QueryBuilder;
  order(column: string, options: { ascending: boolean }): QueryBuilder;
  limit(value: number): QueryBuilder;
  upsert(rows: unknown, options: unknown): Promise<QueryResult>;
};

vi.mock("@/lib/auth", () => ({
  getAuthState: async () => authenticated
    ? { status: "authenticated", user: { id: USER }, onboardingCompleted: true }
    : { status: "unauthenticated", user: null, onboardingCompleted: false },
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => fakeDb() }));

function fakeDb() {
  function query(table: string): QueryBuilder {
    const filters: { op: string; column: string; value: unknown }[] = [];
    let maxRows = Infinity;
    let sort: { column: string; ascending: boolean } | null = null;
    const api: QueryBuilder = {
      select: () => api,
      eq: (column: string, value: unknown) => { filters.push({ op: "eq", column, value }); return api; },
      neq: (column: string, value: unknown) => { filters.push({ op: "neq", column, value }); return api; },
      ilike: () => api,
      in: (column: string, value: unknown) => { filters.push({ op: "in", column, value }); return api; },
      order: (column: string, options: { ascending: boolean }) => { sort = { column, ascending: options.ascending }; return api; },
      limit: (value: number) => { maxRows = value; return api; },
      upsert: (rows: unknown, options: unknown) => { writes.push({ table, payload: rows, options }); return Promise.resolve({ data: null, error: failingTable === table ? { message: "database failure" } : null }); },
      then<TResult1 = QueryResult, TResult2 = never>(resolve?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null, reject?: ((error: unknown) => TResult2 | PromiseLike<TResult2>) | null): PromiseLike<TResult1 | TResult2> {
        if (failingTable === table) return Promise.resolve({ data: null, error: { message: "database failure" } }).then(resolve, reject);
        let rows = (tables[table] ?? []).filter((row) => filters.every((filter) => {
          if (filter.op === "eq") return row[filter.column] === filter.value;
          if (filter.op === "neq") return row[filter.column] !== filter.value;
          return Array.isArray(filter.value) && filter.value.includes(row[filter.column]);
        }));
        if (sort) { const current = sort as { column: string; ascending: boolean }; rows = [...rows].sort((a, b) => String(a[current.column]).localeCompare(String(b[current.column])) * (current.ascending ? 1 : -1)); }
        return Promise.resolve({ data: rows.slice(0, maxRows), error: null }).then(resolve, reject);
      },
    };
    return api;
  }
  return {
    from: (table: string) => ({ select: () => query(table), upsert: (payload: unknown, options: unknown) => query(table).upsert(payload, options) }),
    rpc: async () => failingRpc ? { data: null, error: { message: "rpc failure" } } : { data: [], error: null },
  };
}

beforeEach(() => {
  authenticated = true;
  failingTable = null;
  failingRpc = false;
  writes = [];
  tables = {
    projects: [{ id: PROJECT, owner_id: USER }],
    join_requests: [
      { id: INCOMING, project_id: PROJECT, user_id: OTHER, status: "pending", created_at: "2026-01-02T00:00:00Z", updated_at: "2026-01-02T00:00:00Z" },
      { id: OUTGOING, project_id: PROJECT, user_id: USER, status: "accepted", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-03T00:00:00Z" },
    ],
    notification_reads: [{ user_id: USER, join_request_id: OUTGOING }],
    skills: [{ id: "skill-1", name: "React", slug: "react" }],
  };
  vi.resetModules();
});

describe("notification routes", () => {
  it("requires an authenticated account", async () => {
    authenticated = false;
    const { GET } = await import("@/app/api/notifications/route");
    expect((await GET()).status).toBe(401);
  });

  it("returns incoming and outgoing notifications with server read state", async () => {
    const { GET } = await import("@/app/api/notifications/route");
    const response = await GET();
    const body = await response.json();
    expect(body.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: INCOMING, text: "New incoming application", isRead: false }),
      expect.objectContaining({ id: OUTGOING, text: "Application accepted", isRead: true }),
    ]));
  });

  it("persists visible read markers idempotently and rejects inaccessible ids", async () => {
    const { POST } = await import("@/app/api/notifications/route");
    const request = () => new Request("http://localhost/api/notifications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ids: [INCOMING] }) });
    expect((await POST(request())).status).toBe(200);
    expect((await POST(request())).status).toBe(200);
    expect(writes).toHaveLength(2);
    expect(writes[0].table).toBe("notification_reads");
    expect(writes[0].options).toEqual({ onConflict: "user_id,join_request_id", ignoreDuplicates: true });
    const forbidden = await POST(new Request("http://localhost/api/notifications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ids: ["dddddddd-1111-4111-8111-dddddddddddd"] }) }));
    expect(forbidden.status).toBe(403);
  });

  it("returns unavailable when any notification lookup fails", async () => {
    failingTable = "projects";
    const { GET } = await import("@/app/api/notifications/route");
    expect((await GET()).status).toBe(503);
  });

  it("returns unavailable when reading markers or persisting a read fails", async () => {
    failingTable = "notification_reads";
    const { GET, POST } = await import("@/app/api/notifications/route");
    expect((await GET()).status).toBe(503);
    const response = await POST(new Request("http://localhost/api/notifications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ids: [INCOMING] }) }));
    expect(response.status).toBe(503);
  });
});

describe("search route failures", () => {
  it.each([
    ["projects", "projects"],
    ["builders", "rpc"],
    ["skills", "skills"],
    ["skills", "project_skills"],
    ["discussions", "project_discussion_posts"],
  ])("returns unavailable for %s lookup failure (%s)", async (scope, failure) => {
    if (failure === "rpc") failingRpc = true;
    else failingTable = failure;
    const { GET } = await import("@/app/api/search/route");
    const response = await GET(new Request(`http://localhost/api/search?q=React&in=${scope}`));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Search is unavailable" });
  });
});
