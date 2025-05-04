-- Enhanced SQLite Database Schema for SanctissiMissa
-- This file contains the SQL statements to create the enhanced database schema
-- for the flexible liturgical calendar implementation

-- Liturgical seasons table
CREATE TABLE IF NOT EXISTS liturgical_seasons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  description TEXT
);

-- Celebration definitions table
CREATE TABLE IF NOT EXISTS celebrations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rank INTEGER NOT NULL,
  color TEXT NOT NULL,
  cycle TEXT NOT NULL, -- 'temporal' or 'sanctoral'
  date TEXT, -- For fixed date celebrations (format: MM-DD)
  movable BOOLEAN NOT NULL DEFAULT 0,
  calculation_rule TEXT, -- For movable feasts (e.g., 'easter+40' for Ascension)
  proper_texts BOOLEAN NOT NULL DEFAULT 0,
  common_texts TEXT,
  description TEXT
);

-- Precedence rules table
CREATE TABLE IF NOT EXISTS precedence_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  higher_celebration_type TEXT NOT NULL,
  lower_celebration_type TEXT NOT NULL,
  action TEXT NOT NULL, -- 'transfer', 'commemorate', 'suppress'
  description TEXT
);

-- Enhanced liturgical days table
CREATE TABLE IF NOT EXISTS liturgical_days_enhanced (
  date TEXT PRIMARY KEY,
  season_id TEXT NOT NULL,
  celebration_id TEXT,
  rank INTEGER NOT NULL,
  color TEXT NOT NULL,
  is_holy_day BOOLEAN NOT NULL DEFAULT 0,
  is_feast_day BOOLEAN NOT NULL DEFAULT 0,
  mass_proper TEXT,
  commemorations TEXT, -- JSON array of celebration IDs
  FOREIGN KEY (season_id) REFERENCES liturgical_seasons(id),
  FOREIGN KEY (celebration_id) REFERENCES celebrations(id)
);

-- Parish information table for customization
CREATE TABLE IF NOT EXISTS parish_information (
  id TEXT PRIMARY KEY DEFAULT 'default',
  name TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  country TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  pastor TEXT,
  logo_blob BLOB,
  custom_css TEXT
);

-- Local feast customization table
CREATE TABLE IF NOT EXISTS local_feasts (
  id TEXT PRIMARY KEY,
  parish_id TEXT NOT NULL,
  celebration_id TEXT NOT NULL,
  date TEXT, -- Override date if needed
  rank INTEGER, -- Override rank if needed
  description TEXT,
  FOREIGN KEY (parish_id) REFERENCES parish_information(id),
  FOREIGN KEY (celebration_id) REFERENCES celebrations(id)
);

-- Rendering templates table
CREATE TABLE IF NOT EXISTS rendering_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  format TEXT NOT NULL, -- 'text', 'html', 'pdf', 'json', 'markdown', 'svg'
  template_content TEXT NOT NULL,
  description TEXT
);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id TEXT PRIMARY KEY,
  default_language TEXT NOT NULL DEFAULT 'latin',
  show_rubrics BOOLEAN NOT NULL DEFAULT 1,
  show_translations BOOLEAN NOT NULL DEFAULT 1,
  default_template_id TEXT,
  parish_id TEXT DEFAULT 'default',
  FOREIGN KEY (default_template_id) REFERENCES rendering_templates(id),
  FOREIGN KEY (parish_id) REFERENCES parish_information(id)
);

-- Import log table
CREATE TABLE IF NOT EXISTS import_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  source TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  success BOOLEAN NOT NULL DEFAULT 1
);
