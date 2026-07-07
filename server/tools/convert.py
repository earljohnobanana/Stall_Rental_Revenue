#!/usr/bin/env python3
"""Build stall_rental.db (SQLite) from a MySQL dump + the converted schema.

USAGE (Windows):
  1. Put these THREE files in the SAME folder (e.g. C:\\stall-revenue-system\\tools\\):
       convert.py             (this script)
       schema_sqlite.sql      (the SQLite schema)
       stall_rental_db.sql    (fresh export from phpMyAdmin)
  2. Open a terminal in that folder and run:
       python convert.py
     or, if your dump has a different filename:
       python convert.py my_export.sql
  3. It creates stall_rental.db in the same folder.
  4. Copy stall_rental.db into  server\\data\\  (replace the old one).
"""
import re, sqlite3, sys, pathlib

HERE = pathlib.Path(__file__).resolve().parent

# Dump file: first command-line argument, or default name in this folder
if len(sys.argv) > 1:
    DUMP = pathlib.Path(sys.argv[1])
else:
    DUMP = HERE / "stall_rental_db.sql"

SCHEMA = HERE / "schema_sqlite.sql"
OUT    = HERE / "stall_rental.db"

# --- sanity checks with friendly messages -----------------------------------
if not DUMP.exists():
    sys.exit(f"ERROR: dump file not found: {DUMP}\n"
             f"Export your database from phpMyAdmin and save it as "
             f"'stall_rental_db.sql' next to this script, or pass the "
             f"filename: python convert.py yourdump.sql")
if not SCHEMA.exists():
    sys.exit(f"ERROR: schema_sqlite.sql not found next to this script ({SCHEMA})")

raw = DUMP.read_text(encoding="utf-8")

# --- collect full INSERT statements (they can span many lines, end with ;) ---
inserts = re.findall(r"INSERT INTO `\w+`.*?;\n", raw, flags=re.S)
print(f"found {len(inserts)} INSERT statements in {DUMP.name}")

def mysql_to_sqlite_stmt(stmt: str) -> str:
    stmt = stmt.replace("`", '"')                 # identifier quoting
    # escape conversion inside string literals: do \\ first via placeholder
    stmt = stmt.replace("\\\\", "\x00")           # literal backslash
    stmt = stmt.replace("\\'", "''")              # MySQL escaped quote -> SQL std
    stmt = stmt.replace('\\"', '"')
    stmt = stmt.replace("\\n", "\n").replace("\\r", "\r").replace("\\t", "\t")
    stmt = stmt.replace("\x00", "\\")
    return stmt

if OUT.exists():
    OUT.unlink()                                  # start fresh each run

con = sqlite3.connect(OUT)
con.executescript(SCHEMA.read_text(encoding="utf-8"))

con.execute("PRAGMA foreign_keys = OFF")          # dump order isn't FK-sorted
con.execute("BEGIN")
for stmt in inserts:
    s = mysql_to_sqlite_stmt(stmt)
    try:
        con.execute(s)
    except sqlite3.Error as e:
        table = re.search(r'INSERT INTO "(\w+)"', s).group(1)
        print(f"ERROR in table {table}: {e}", file=sys.stderr)
        print(s[:300], file=sys.stderr)
        con.execute("ROLLBACK")
        sys.exit(1)
con.execute("COMMIT")

# --- verify FK integrity now that all rows are in ----------------------------
con.execute("PRAGMA foreign_keys = ON")
violations = con.execute("PRAGMA foreign_key_check").fetchall()
if violations:
    print("FK VIOLATIONS:", violations[:20], file=sys.stderr)
else:
    print("FK check: clean")

# --- sync AUTOINCREMENT counters to the dump's AUTO_INCREMENT values ---------
for m in re.finditer(r"ALTER TABLE `(\w+)`\s*\n\s*MODIFY[^;]*AUTO_INCREMENT=(\d+)", raw):
    tbl, nextval = m.group(1), int(m.group(2))
    con.execute("DELETE FROM sqlite_sequence WHERE name = ?", (tbl,))
    con.execute("INSERT INTO sqlite_sequence(name, seq) VALUES(?, ?)", (tbl, nextval - 1))
con.commit()

# --- report -------------------------------------------------------------------
print("\nRow counts:")
for (tbl,) in con.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
):
    n = con.execute(f'SELECT COUNT(*) FROM "{tbl}"').fetchone()[0]
    print(f"  {tbl:24s} {n}")

print("\nSequence values (next id will be seq+1):")
for name, seq in con.execute("SELECT name, seq FROM sqlite_sequence ORDER BY name"):
    print(f"  {name:24s} {seq}")

con.close()
print(f"\nDone -> {OUT}")
print("Now copy stall_rental.db into your project's  server\\data\\  folder.")