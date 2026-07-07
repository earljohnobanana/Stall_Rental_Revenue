// server/db.js
// ---------------------------------------------------------------------------
// SQLite drop-in replacement for the old mysql2 pool.
//
// Goal: your controllers keep calling db.query(...), db.getConnection(),
// conn.beginTransaction()/commit()/rollback()/release(), and reading
// result.insertId / result.affectedRows / err.code === 'ER_DUP_ENTRY'
// exactly as they did with MySQL. This shim translates all of that onto
// better-sqlite3 (which is synchronous and single-file).
//
// Single device, single process (Electron main) => one connection is correct
// and safe. Transactions are serialized, which is fine for one user.
// ---------------------------------------------------------------------------

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// Where the database file lives. In Electron we pass SQLITE_DB_PATH pointing at
// the user's app-data folder so it survives app updates and isn't inside the
// read-only app bundle. Falls back to a local file for plain `node` dev runs.
const DB_PATH =
  process.env.SQLITE_DB_PATH || path.join(__dirname, '..', 'data', 'stall_rental.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');   // better concurrency + crash safety
sqlite.pragma('foreign_keys = ON');    // enforce FKs like InnoDB does

// --- Value coercion -------------------------------------------------------
// mysql2 tolerated Date objects, booleans, and undefined. better-sqlite3 does
// not: it only binds numbers, strings, bigints, buffers, and null. Normalize.
function coerceParams(params) {
  if (!Array.isArray(params)) return [];
  return params.map((p) => {
    if (p === undefined) return null;
    if (p instanceof Date) return p.toISOString().slice(0, 19).replace('T', ' ');
    if (typeof p === 'boolean') return p ? 1 : 0;
    return p;
  });
}

// --- Light MySQL->SQLite function rewriting -------------------------------
// Conservative: only the functions your reports actually use. Anything more
// exotic should be fixed in the source query, not hidden here.
function rewriteSql(sql) {
  return sql
    .replace(/\bYEAR\s*\(\s*([^)]+?)\s*\)/gi, "CAST(strftime('%Y', $1) AS INTEGER)")
    .replace(/\bMONTH\s*\(\s*([^)]+?)\s*\)/gi, "CAST(strftime('%m', $1) AS INTEGER)")
    .replace(/\bNOW\s*\(\s*\)/gi, 'CURRENT_TIMESTAMP')
    .replace(/\bCURDATE\s*\(\s*\)/gi, "date('now','localtime')");
}

function isSelect(sql) {
  return /^\s*(select|pragma|with)\b/i.test(sql);
}

// Wrap a better-sqlite3 error so callers checking err.code keep working.
function mapError(err) {
  if (err && typeof err.code === 'string' && err.code.startsWith('SQLITE_CONSTRAINT')) {
    if (err.code.includes('UNIQUE') || err.code.includes('PRIMARYKEY')) {
      err.code = 'ER_DUP_ENTRY';
    }
  }
  return err;
}

// Core executor shared by the pool and by connections.
function run(sql, params) {
  const rewritten = rewriteSql(sql);
  const values = coerceParams(params);
  try {
    const stmt = sqlite.prepare(rewritten);
    if (isSelect(rewritten)) {
      const rows = stmt.all(...values);
      return [rows, undefined];                    // mysql2: [rows, fields]
    }
    const info = stmt.run(...values);
    return [
      {                                            // mysql2 OkPacket shape
        insertId: Number(info.lastInsertRowid),
        affectedRows: info.changes,
        changedRows: info.changes,
      },
      undefined,
    ];
  } catch (err) {
    throw mapError(err);
  }
}

// A "connection" for transaction code. Because SQLite is one process/one file,
// every connection shares the same underlying handle; BEGIN/COMMIT/ROLLBACK are
// issued as statements, matching how your MySQL controllers drive transactions.
function makeConnection() {
  return {
    query: async (sql, params) => run(sql, params),
    execute: async (sql, params) => run(sql, params),
    beginTransaction: async () => { sqlite.exec('BEGIN'); },
    commit: async () => { sqlite.exec('COMMIT'); },
    rollback: async () => { try { sqlite.exec('ROLLBACK'); } catch (_) {} },
    release: () => {},        // no pool to return to; no-op
    destroy: () => {},
  };
}

// The exported object mimics a mysql2/promise pool.
const pool = {
  query: async (sql, params) => run(sql, params),
  execute: async (sql, params) => run(sql, params),
  getConnection: async () => makeConnection(),
  end: async () => sqlite.close(),
  _sqlite: sqlite,          // escape hatch if you ever need the raw handle
};

module.exports = pool;