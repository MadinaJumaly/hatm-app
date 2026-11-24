-- 0001_init: all tables for v1 (design §C).
-- Times: UTC ISO-8601 text. start_date / deadline_date: calendar dates in UTC+5 (YYYY-MM-DD).
-- Columns marked (v1.1) are prepared now so v1.1 needs no table rebuild; v1 code doesn't use them.

CREATE TABLE groups (
  id         INTEGER PRIMARY KEY,
  title      TEXT    NOT NULL CHECK (length(title) BETWEEN 1 AND 80),
  link_token TEXT    NOT NULL UNIQUE,  -- 16 random bytes, base64url (design §F)
  created_at TEXT    NOT NULL
);

CREATE TABLE rounds (
  id            INTEGER PRIMARY KEY,
  group_id      INTEGER NOT NULL REFERENCES groups (id),
  number        INTEGER NOT NULL CHECK (number >= 1),
  duration_days INTEGER NOT NULL CHECK (duration_days IN (7, 15, 20, 30)),
  start_date    TEXT    NOT NULL,
  deadline_date TEXT    NOT NULL,
  created_at    TEXT    NOT NULL,
  closed_at     TEXT,                  -- (v1.1)
  UNIQUE (group_id, number)
);

CREATE TABLE members (
  id               INTEGER PRIMARY KEY,
  group_id         INTEGER NOT NULL REFERENCES groups (id),
  display_name     TEXT    NOT NULL CHECK (length(display_name) BETWEEN 1 AND 40),
  name_key         TEXT    NOT NULL,   -- trimmed, lower-cased name: duplicates are refused
  pin_hash         TEXT,               -- NULL = no PIN yet
  pin_fail_count   INTEGER NOT NULL DEFAULT 0 CHECK (pin_fail_count >= 0),
  pin_locked_until TEXT,
  created_at       TEXT    NOT NULL,
  UNIQUE (group_id, name_key)
);

CREATE TABLE seats (
  id               INTEGER PRIMARY KEY,
  round_id         INTEGER NOT NULL REFERENCES rounds (id),
  juz              INTEGER NOT NULL CHECK (juz BETWEEN 1 AND 30),
  part             INTEGER NOT NULL DEFAULT 0 CHECK (part IN (0, 1, 2)),  -- 0 = whole juz; 1-2 = halves (v1.1)
  member_id        INTEGER REFERENCES members (id),                       -- NULL = «Бос»
  status           TEXT    NOT NULL DEFAULT 'unread'
                   CHECK (status IN ('unread', 'read', 'released')),       -- 'released' is v1.1
  helper_member_id INTEGER REFERENCES members (id),                       -- (v1.1)
  read_at          TEXT,
  updated_at       TEXT    NOT NULL,
  UNIQUE (round_id, juz, part)
);
CREATE INDEX seats_member_id ON seats (member_id);

CREATE TABLE sessions (
  token_hash TEXT    PRIMARY KEY,      -- SHA-256 of the cookie token; the token itself is never stored
  role       TEXT    NOT NULL CHECK (role IN ('participant', 'organizer')),
  member_id  INTEGER REFERENCES members (id),
  created_at TEXT    NOT NULL,
  expires_at TEXT    NOT NULL,
  -- A participant session always has a member; an organizer session never has one.
  CHECK ((role = 'participant' AND member_id IS NOT NULL) OR (role = 'organizer' AND member_id IS NULL))
);
CREATE INDEX sessions_member_id ON sessions (member_id);

-- Rate-limit counters. Rows older than 15 minutes are deleted, so IPs are never kept long-term.
CREATE TABLE auth_failures (
  key          TEXT    PRIMARY KEY,    -- 'ip:' + HMAC(PEPPER, ip), or 'org'
  window_start TEXT    NOT NULL,
  count        INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  locked_until TEXT
);

-- Change log (S-1). No foreign keys on purpose: the log must outlive anything it mentions.
CREATE TABLE change_log (
  id              INTEGER PRIMARY KEY,
  at              TEXT    NOT NULL,
  actor_role      TEXT    NOT NULL CHECK (actor_role IN ('participant', 'organizer')),
  actor_member_id INTEGER,
  action          TEXT    NOT NULL
                  CHECK (action IN ('create_khatm', 'mark', 'unmark', 'undo', 'pin_set', 'pin_reset')),
  group_id        INTEGER,
  round_id        INTEGER,
  seat_id         INTEGER,
  juz             INTEGER
);

-- The change log is append-only: rows can never be edited or deleted.
CREATE TRIGGER change_log_no_update BEFORE UPDATE ON change_log
BEGIN
  SELECT RAISE(ABORT, 'change_log is append-only');
END;

CREATE TRIGGER change_log_no_delete BEFORE DELETE ON change_log
BEGIN
  SELECT RAISE(ABORT, 'change_log is append-only');
END;
