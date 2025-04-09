import { LiturgicalDay, LiturgicalSeason } from './calendar';
import * as SQLite from 'expo-sqlite';
// import AsyncStorage from '@react-native-async-storage/async-storage'; // (Commenting out until properly installed & typed)
import { TextFileParser } from './TextFileParser';

// Type declarations are now in src/types/expo-sqlite.d.ts

interface BilingualText {
  latin: string;
  english: string;
}

export interface MassProper {
  introit: BilingualText;
  collect: BilingualText;
  epistle: BilingualText;
  gradual: BilingualText;
  alleluia?: BilingualText;
  tract?: BilingualText;
  gospel: BilingualText;
  offertory: BilingualText;
  secret: BilingualText;
  communion: BilingualText;
  postcommunion: BilingualText;
}

export interface OfficeHourProper {
  antiphons: BilingualText[];
  psalms: BilingualText[];
  chapter: BilingualText;
  hymn: BilingualText;
  versicle: BilingualText;
  benedictus?: BilingualText;
  magnificat?: BilingualText;
  nunc?: BilingualText;
  collect: BilingualText;
}

interface TextRow {
  part: string;
  latin: string;
  english: string;
}

export class LiturgicalTexts {

  // We store a reference to the database and an init flag
  private static db: SQLite.WebSQLDatabase | null = null;
  private static readonly DB_NAME = 'liturgical_texts.db';
  private static isInitialized = false;

  /**
   * Open or create the DB, create tables if needed, and initialize seed data if necessary.
   */
  private static async initialize(): Promise<void> {
    if (!this.db) {
      this.db = SQLite.openDatabase(this.DB_NAME);
    }
    if (!this.isInitialized) {
      await this.createTables();
      await this.initializeData();
      this.isInitialized = true;
    }
  }

  /**
   * Helper to run an SQL statement using a Promise-based approach.
   */
  private static runSql(statement: string, params: any[] = []): Promise<SQLite.SQLResultSet> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('Database not initialized.'));
      }
      this.db.transaction((tx: SQLite.SQLTransaction) => {
        tx.executeSql(
          statement,
          params,
          (_: SQLite.SQLTransaction, resultSet: SQLite.SQLResultSet) => resolve(resultSet),
          (_: SQLite.SQLTransaction, err: Error) => {
            reject(err);
            return false;
          }
        );
      });
    });
  }

  /**
   * Create required tables if they don't exist yet.
   */
  private static async createTables(): Promise<void> {
    // Create mass_texts
    await this.runSql(`
      CREATE TABLE IF NOT EXISTS mass_texts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        season TEXT,
        celebration TEXT,
        part TEXT,
        latin TEXT,
        english TEXT
      );
    `);

    // Create office_texts
    await this.runSql(`
      CREATE TABLE IF NOT EXISTS office_texts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        season TEXT,
        celebration TEXT,
        hour TEXT,
        part TEXT,
        latin TEXT,
        english TEXT
      );
    `);
  }

  /**
   * Initialize with sample data if no data is present in mass_texts, for demonstration.
   */
  private static async initializeData(): Promise<void> {
    try {
      const result = await this.runSql('SELECT COUNT(*) as count FROM mass_texts');
      const rowCount = result.rows.item(0)?.count || 0;

      if (rowCount === 0) {
        // Insert a sample row
        await this.runSql(
          "INSERT INTO mass_texts (season, celebration, part, latin, english) VALUES (?, ?, ?, ?, ?)",
          [
            LiturgicalSeason.TEMPUS_PER_ANNUM,
            'Sunday',
            'introit',
            'Dominus illuminatio mea, et salus mea, quem timebo?',
            'The Lord is my light and my salvation; whom shall I fear?'
          ]
        );
      }
    } catch (error) {
      console.error('Failed to initialize data:', error);
    }
  }

  /**
   * Retrieve the Mass texts for a given day.
   */
  public static async getMassProper(day: LiturgicalDay): Promise<MassProper> {
    await this.initialize();

    const params = [ day.season, day.celebration || null ];
    const sql = `
      SELECT part, latin, english
      FROM mass_texts
      WHERE season = ?
        AND (celebration = ? OR celebration IS NULL)
      ORDER BY CASE WHEN celebration IS NOT NULL THEN 0 ELSE 1 END
    `;

    const result = await this.runSql(sql, params);
    const rows: TextRow[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      rows.push(result.rows.item(i));
    }

    const partial: Partial<MassProper> = {};
    for (const row of rows) {
      (partial[row.part as keyof MassProper] as BilingualText) = {
        latin: row.latin,
        english: row.english,
      };
    }

    return this.ensureCompleteMassProper(partial);
  }

  /**
   * Retrieve the Office hour text for a given day and hour.
   */
  public static async getOfficeHour(day: LiturgicalDay, hour: string): Promise<OfficeHourProper> {
    await this.initialize();

    const params = [ day.season, hour.toLowerCase(), day.celebration || null ];
    const sql = `
      SELECT part, latin, english
      FROM office_texts
      WHERE season = ?
        AND hour = ?
        AND (celebration = ? OR celebration IS NULL)
      ORDER BY CASE WHEN celebration IS NOT NULL THEN 0 ELSE 1 END
    `;

    const result = await this.runSql(sql, params);

    const typedRows: TextRow[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      typedRows.push(result.rows.item(i));
    }

    const partial: Partial<OfficeHourProper> = { antiphons: [], psalms: [] };
    for (const row of typedRows) {
      const text: BilingualText = {
        latin: row.latin,
        english: row.english,
      };
      switch (row.part) {
        case 'antiphon':
          partial.antiphons?.push(text);
          break;
        case 'psalm':
          partial.psalms?.push(text);
          break;
        default:
          (partial[row.part as keyof OfficeHourProper] as BilingualText) = text;
          break;
      }
    }

    return this.ensureCompleteOfficeProper(partial, hour);
  }

  private static ensureCompleteMassProper(partial: Partial<MassProper>): MassProper {
    const placeholder: BilingualText = {
      latin: 'Placeholder Latin Text',
      english: 'Placeholder English Text',
    };
    return {
      introit: partial.introit || placeholder,
      collect: partial.collect || placeholder,
      epistle: partial.epistle || placeholder,
      gradual: partial.gradual || placeholder,
      alleluia: partial.alleluia,
      tract: partial.tract,
      gospel: partial.gospel || placeholder,
      offertory: partial.offertory || placeholder,
      secret: partial.secret || placeholder,
      communion: partial.communion || placeholder,
      postcommunion: partial.postcommunion || placeholder,
    };
  }

  private static ensureCompleteOfficeProper(partial: Partial<OfficeHourProper>, hour: string): OfficeHourProper {
    const placeholder: BilingualText = {
      latin: 'Placeholder Latin Text',
      english: 'Placeholder English Text',
    };
    const proper: OfficeHourProper = {
      antiphons: partial.antiphons || [placeholder],
      psalms: partial.psalms || [placeholder],
      chapter: partial.chapter || placeholder,
      hymn: partial.hymn || placeholder,
      versicle: partial.versicle || placeholder,
      collect: partial.collect || placeholder,
    };
    if (hour.toLowerCase() === 'lauds') {
      proper.benedictus = partial.benedictus || placeholder;
    } else if (hour.toLowerCase() === 'vespers') {
      proper.magnificat = partial.magnificat || placeholder;
    } else if (hour.toLowerCase() === 'compline') {
      proper.nunc = partial.nunc || placeholder;
    }
    return proper;
  }

  /**
   * Import mass data from a given text file and store in 'mass_texts' table.
   */
  public static async importMassFile(fileUri: string): Promise<number> {
    await this.initialize();
    const records = await TextFileParser.parseMassFile(fileUri);

    let insertedCount = 0;
    for (const row of records) {
      // For now we set placeholders for season & celebration
      await this.runSql(
        'INSERT INTO mass_texts (season, celebration, part, latin, english) VALUES (?, ?, ?, ?, ?)',
        [
          LiturgicalSeason.TEMPUS_PER_ANNUM,
          null,
          row.part,
          row.latin,
          row.english
        ]
      );
      insertedCount++;
    }
    return insertedCount;
  }

  /**
   * Import office data from a given text file and store in 'office_texts' table.
   */
  public static async importOfficeFile(fileUri: string): Promise<number> {
    await this.initialize();
    const records = await TextFileParser.parseOfficeFile(fileUri);

    let insertedCount = 0;
    for (const row of records) {
      await this.runSql(
        'INSERT INTO office_texts (season, celebration, hour, part, latin, english) VALUES (?, ?, ?, ?, ?, ?)',
        [
          LiturgicalSeason.TEMPUS_PER_ANNUM,
          null,
          row.hour,
          row.part,
          row.latin,
          row.english
        ]
      );
      insertedCount++;
    }
    return insertedCount;
  }

  /**
   * Import from sets of mass and office files, returning total inserted for each category.
   */
  public static async importFromFiles(
    massFiles: string[],
    officeFiles: string[]
  ): Promise<{ massCount: number; officeCount: number }> {
    await this.initialize();
    let totalMass = 0;
    let totalOffice = 0;

    for (const mf of massFiles) {
      const mc = await this.importMassFile(mf);
      totalMass += mc;
    }
    for (const ofile of officeFiles) {
      const oc = await this.importOfficeFile(ofile);
      totalOffice += oc;
    }
    return { massCount: totalMass, officeCount: totalOffice };
  }
}