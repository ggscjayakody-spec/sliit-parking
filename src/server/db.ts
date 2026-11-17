/**
 * Database connection + schema for the built-in backend (src/app/api/[...path]).
 *
 * Connection string: DATABASE_URL (set automatically when you connect a Neon database to the
 * project in Vercel → Storage). POSTGRES_URL is accepted too.
 *
 * Tables are created automatically on the first request, so there's no migration step.
 */
import "server-only";
import postgres, { type TransactionSql } from "postgres";
import bcrypt from "bcryptjs";
import { HttpError } from "./http";

export const TIMEZONE = "Asia/Colombo"; // "today" for fees, payments and pass expiry

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";

type Sql = ReturnType<typeof postgres>;
/** A connection or a transaction — both run queries the same way. */
export type Q = Sql | TransactionSql;
const globalForDb = globalThis as unknown as { __sql?: Sql; __schemaReady?: Promise<void> };

export function db(): Sql {
  if (!url) {
    throw new HttpError(503, "The database isn't connected yet. In Vercel, add a Neon database under Storage and redeploy.");
  }
  globalForDb.__sql ??= postgres(url, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 15,
    onnotice: () => {},
  });
  return globalForDb.__sql;
}

/** Create tables (once per server instance) and make sure the admin account exists. */
export function ready(): Promise<void> {
  globalForDb.__schemaReady ??= setup().catch((e) => {
    globalForDb.__schemaReady = undefined; // try again on the next request
    throw e;
  });
  return globalForDb.__schemaReady;
}

async function setup() {
  const sql = db();
  await sql.begin(async (sql) => {
    // Two server instances starting at once would race on CREATE TABLE; serialize with a lock.
    await sql`select pg_advisory_xact_lock(727274)`;

    await sql`
      create table if not exists students (
        id                text primary key,
        full_name         text not null,
        contact           text not null,
        vehicle_number    text not null,
        vehicle_type      text not null,
        password_hash     text not null,
        pass_status       text not null default 'pending',  -- pending | active | rejected  (expired is worked out from the date)
        pass_valid_until  date,
        qr_token          text unique,
        created_at        timestamptz not null default now()
      )`;
    await sql`create index if not exists students_vehicle_idx on students (upper(replace(vehicle_number, ' ', '')))`;

    await sql`
      create table if not exists enforcers (
        id            text primary key,
        full_name     text not null,
        password_hash text not null,
        created_by    text,
        created_at    timestamptz not null default now()
      )`;

    await sql`
      create table if not exists admins (
        id            text primary key,
        full_name     text not null,
        password_hash text not null
      )`;

    await sql`
      create table if not exists slips (
        id         uuid primary key default gen_random_uuid(),
        mime       text not null,
        data       bytea not null,
        created_at timestamptz not null default now()
      )`;

    await sql`
      create table if not exists fees (
        id             text primary key default gen_random_uuid()::text,
        student_id     text not null references students(id),
        vehicle_number text not null,
        hours          int  not null,
        amount         int  not null,
        date           date not null,
        status         text not null default 'unpaid',      -- unpaid | pending | paid
        issued_by      text not null references enforcers(id),
        created_at     timestamptz not null default now()
      )`;

    await sql`
      create table if not exists payments (
        id          text primary key default gen_random_uuid()::text,
        student_id  text not null references students(id),
        kind        text not null,                          -- pass | fee
        amount      int  not null,
        date        date not null,
        status      text not null default 'pending',        -- pending | approved | rejected
        slip_id     uuid references slips(id),
        fee_id      text references fees(id),
        reviewed_by text,
        reviewed_at timestamptz,
        created_at  timestamptz not null default now()
      )`;

    // What enforcers do: every lookup (QR scan or search) and every fee they add.
    await sql`
      create table if not exists enforcer_activity (
        id          bigserial primary key,
        enforcer_id text not null references enforcers(id),
        action      text not null,                          -- scan | search | fee
        query       text,
        student_id  text references students(id),
        fee_id      text references fees(id),
        amount      int,
        hours       int,
        at          timestamptz not null default now()
      )`;
    await sql`create index if not exists enforcer_activity_idx on enforcer_activity (enforcer_id, at desc)`;
  });

  // The admin logs in with a password only. It comes from the ADMIN_PASSWORD environment variable.
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminPassword) {
    const [row] = await sql<{ password_hash: string }[]>`select password_hash from admins where id = 'ADMIN01'`;
    if (!row || !(await bcrypt.compare(adminPassword, row.password_hash))) {
      const hash = await bcrypt.hash(adminPassword, 10);
      await sql`
        insert into admins (id, full_name, password_hash) values ('ADMIN01', 'Parking Admin', ${hash})
        on conflict (id) do update set password_hash = excluded.password_hash`;
    }
  }
}

/** Today's date (YYYY-MM-DD) in Sri Lanka, as SQL. */
export const todaySql = (sql: Q) => sql`(now() at time zone ${TIMEZONE})::date`;
