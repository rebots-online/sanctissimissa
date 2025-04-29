-- SQLite Database Schema for SanctissiMissa
-- This file contains the SQL statements to create the database schema

-- Liturgical days table
CREATE TABLE IF NOT EXISTS liturgical_days (
  date TEXT PRIMARY KEY,
  season TEXT NOT NULL,
  celebration TEXT NOT NULL,
  rank INTEGER NOT NULL,
  color TEXT NOT NULL,
  is_holy_day INTEGER NOT NULL DEFAULT 0,
  is_feast_day INTEGER NOT NULL DEFAULT 0,
  mass_proper TEXT,
  commemorations TEXT
);

-- Mass texts table
CREATE TABLE IF NOT EXISTS mass_texts (
  id TEXT PRIMARY KEY,
  part TEXT NOT NULL,
  title_latin TEXT,
  title_english TEXT,
  introit_latin TEXT,
  introit_english TEXT,
  introit_reference TEXT,
  collect_latin TEXT,
  collect_english TEXT,
  epistle_latin TEXT,
  epistle_english TEXT,
  epistle_reference TEXT,
  gradual_latin TEXT,
  gradual_english TEXT,
  sequence_latin TEXT,
  sequence_english TEXT,
  sequence_rubric TEXT,
  gospel_latin TEXT,
  gospel_english TEXT,
  gospel_reference TEXT,
  offertory_latin TEXT,
  offertory_english TEXT,
  offertory_reference TEXT,
  secret_latin TEXT,
  secret_english TEXT,
  communion_latin TEXT,
  communion_english TEXT,
  communion_reference TEXT,
  postcommunion_latin TEXT,
  postcommunion_english TEXT
);

-- Office texts table
CREATE TABLE IF NOT EXISTS office_texts (
  id TEXT PRIMARY KEY,
  hour TEXT NOT NULL,
  title_latin TEXT,
  title_english TEXT,
  hymn_latin TEXT,
  hymn_english TEXT,
  chapter_latin TEXT,
  chapter_english TEXT,
  chapter_reference TEXT,
  prayer_latin TEXT,
  prayer_english TEXT
);

-- Psalms table
CREATE TABLE IF NOT EXISTS psalms (
  id TEXT PRIMARY KEY,
  office_id TEXT NOT NULL,
  number INTEGER NOT NULL,
  title_latin TEXT,
  title_english TEXT,
  text_latin TEXT,
  text_english TEXT,
  FOREIGN KEY (office_id) REFERENCES office_texts (id)
);

-- Readings table
CREATE TABLE IF NOT EXISTS readings (
  id TEXT PRIMARY KEY,
  office_id TEXT NOT NULL,
  number INTEGER NOT NULL,
  text_latin TEXT,
  text_english TEXT,
  FOREIGN KEY (office_id) REFERENCES office_texts (id)
);

-- Prayers table
CREATE TABLE IF NOT EXISTS prayers (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  title_latin TEXT,
  title_english TEXT,
  text_latin TEXT,
  text_english TEXT,
  tags TEXT
);

-- Journal entries table
CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  type TEXT NOT NULL,
  date TEXT NOT NULL,
  tags TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  audio_blob BLOB,
  position_x REAL,
  position_y REAL
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_liturgical_days_season ON liturgical_days(season);
CREATE INDEX IF NOT EXISTS idx_liturgical_days_rank ON liturgical_days(rank);
CREATE INDEX IF NOT EXISTS idx_mass_texts_part ON mass_texts(part);
CREATE INDEX IF NOT EXISTS idx_office_texts_hour ON office_texts(hour);
CREATE INDEX IF NOT EXISTS idx_psalms_office_id ON psalms(office_id);
CREATE INDEX IF NOT EXISTS idx_readings_office_id ON readings(office_id);
CREATE INDEX IF NOT EXISTS idx_prayers_category ON prayers(category);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_type ON journal_entries(type);