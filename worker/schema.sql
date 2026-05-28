CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  date TEXT NOT NULL,
  num_combos INTEGER NOT NULL DEFAULT 0,
  time_seconds INTEGER NOT NULL DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE,
  UNIQUE (username, date)
);

CREATE TABLE IF NOT EXISTS presets (
  username TEXT NOT NULL,
  preset_name TEXT NOT NULL,
  preset_data JSON NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE,
  PRIMARY KEY (username, preset_name)
);

CREATE TABLE IF NOT EXISTS workouts (
  workout_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  date TEXT NOT NULL,
  started_at DATETIME NOT NULL,
  ended_at DATETIME NOT NULL,
  mode TEXT NOT NULL,
  preset_name TEXT,
  speed_ms INTEGER,
  combos_completed INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  workout_data JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(username, date);
