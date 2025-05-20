import { LiturgicalDay, LiturgicalSeason } from './calendar';
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
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
  private static useFallbackData = false;

  /**
   * Open or create the DB, create tables if needed, and initialize seed data if necessary.
   */
  private static async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      if (!this.db) {
        if (Platform.OS === 'web') {
          // Web implementation might need special handling
          console.log('[DEBUG] Using web SQLite implementation');
          this.db = SQLite.openDatabase(this.DB_NAME);
        } else {
          // Native implementation
          console.log('[DEBUG] Using native SQLite implementation');
          this.db = SQLite.openDatabase(this.DB_NAME);
        }
      }

      await this.createTables();
      await this.initializeData();
      this.isInitialized = true;
      this.useFallbackData = false;
      console.log('[DEBUG] SQLite database initialized successfully');
    } catch (error) {
      console.error('[ERROR] Failed to initialize SQLite database:', error);
      // Switch to fallback data source
      this.useFallbackData = true;
      this.isInitialized = true; // Mark as initialized to prevent further attempts
      console.log('[DEBUG] Using fallback data source');
    }
  }

  /**
   * Helper to run an SQL statement using a Promise-based approach.
   */
  private static runSql(statement: string, params: any[] = []): Promise<SQLite.SQLResultSet> {
    return new Promise((resolve, reject) => {
      if (this.useFallbackData) {
        // Return a mock result for fallback mode
        return resolve(this.createMockResultSet());
      }

      if (!this.db) {
        return reject(new Error('Database not initialized.'));
      }

      try {
        this.db.transaction((tx: SQLite.SQLTransaction) => {
          tx.executeSql(
            statement,
            params,
            (_: SQLite.SQLTransaction, resultSet: SQLite.SQLResultSet) => resolve(resultSet),
            (_: SQLite.SQLTransaction, err: Error) => {
              console.error('[ERROR] SQL execution failed:', err, statement, params);
              reject(err);
              return false;
            }
          );
        });
      } catch (error) {
        console.error('[ERROR] Transaction failed:', error);
        reject(error);
      }
    });
  }

  /**
   * Creates a mock result set for fallback mode
   */
  private static createMockResultSet(): SQLite.SQLResultSet {
    return {
      insertId: -1,
      rowsAffected: 0,
      rows: {
        length: 0,
        item: (idx: number) => null,
        _array: []
      }
    };
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
   * Fallback data for when SQLite is not available
   */
  private static getFallbackMassProper(day: LiturgicalDay): Partial<MassProper> {
    // Basic fallback data for the Mass
    const fallbackData: Partial<MassProper> = {
      introit: {
        latin: 'Dominus illuminatio mea, et salus mea, quem timebo?',
        english: 'The Lord is my light and my salvation; whom shall I fear?'
      },
      collect: {
        latin: 'Deus, qui diligéntibus te bona invisibília præparásti: infúnde córdibus nostris tui amóris afféctum; ut te in ómnibus et super ómnia diligéntes, promissiónes tuas, quæ omne desidérium súperant, consequámur.',
        english: 'O God, who hast prepared for them that love Thee good things unseen: pour into our hearts such love towards Thee, that we, loving Thee in all and above all, may obtain Thy promises which exceed all that we can desire.'
      },
      epistle: {
        latin: 'Léctio Epístolæ beáti Pauli Apóstoli ad Romános. Fratres: Existímo, quod non sunt condígnæ passiónes huius témporis ad futúram glóriam, quæ revelábitur in nobis.',
        english: 'Reading from the Epistle of Blessed Paul the Apostle to the Romans. Brethren: I reckon that the sufferings of this present time are not worthy to be compared with the glory to come, that shall be revealed in us.'
      },
      gradual: {
        latin: 'Propítius esto, Dómine, peccátis nostris: nequándo dicant gentes: Ubi est Deus eórum? Adiuva nos, Deus, salutáris noster: et propter honórem nóminis tui, Dómine, líbera nos.',
        english: 'Be merciful, O Lord, to our offences: lest the Gentiles should at any time say: Where is their God? Help us, O God, our Saviour: and for the honour of Thy Name, O Lord, deliver us.'
      },
      gospel: {
        latin: 'Sequéntia sancti Evangélii secúndum Lucam. In illo témpore: Cum turbæ irrúerent in Iesum, ut audírent verbum Dei, et ipse stabat secus stagnum Genésareth.',
        english: 'Continuation of the holy Gospel according to Luke. At that time, when the multitude pressed upon Jesus to hear the word of God, He stood by the lake of Genesareth.'
      },
      offertory: {
        latin: 'Illúmina óculos meos, ne umquam obdórmiam in morte: nequándo dicat inimícus meus: Præválui advérsus eum.',
        english: 'Enlighten my eyes, that I may never sleep in death: lest at any time my enemy say: I have prevailed against him.'
      },
      secret: {
        latin: 'Oblatiónibus nostris, quǽsumus, Dómine, placáre suscéptis: et ad te nostras étiam rebélles compélle propítius voluntátes.',
        english: 'Receive our offerings, we beseech Thee, O Lord, and be appeased by them: and graciously compel our wills, even though rebellious, to turn to Thee.'
      },
      communion: {
        latin: 'Dóminus firmaméntum meum, et refúgium meum, et liberátor meus: Deus meus, adiútor meus.',
        english: 'The Lord is my firmament, and my refuge, and my deliverer: my God is my helper.'
      },
      postcommunion: {
        latin: 'Mystéria nos, Dómine, quǽsumus, sumpta puríficent: et suo múnere tueántur.',
        english: 'May the Mysteries which we have received, we beseech Thee, O Lord, purify us, and by their virtue defend us.'
      }
    };

    return fallbackData;
  }

  /**
   * Retrieve the Mass texts for a given day.
   */
  public static async getMassProper(day: LiturgicalDay): Promise<MassProper> {
    await this.initialize();

    // If using fallback data, return it directly
    if (this.useFallbackData) {
      console.log('[DEBUG] Using fallback Mass data for', day.celebration || day.season);
      return this.ensureCompleteMassProper(this.getFallbackMassProper(day));
    }

    const params = [ day.season, day.celebration || null ];
    const sql = `
      SELECT part, latin, english
      FROM mass_texts
      WHERE season = ?
        AND (celebration = ? OR celebration IS NULL)
      ORDER BY CASE WHEN celebration IS NOT NULL THEN 0 ELSE 1 END
    `;

    try {
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
    } catch (error) {
      console.error('[ERROR] Failed to get Mass proper:', error);
      // Fall back to static data if query fails
      return this.ensureCompleteMassProper(this.getFallbackMassProper(day));
    }
  }

  /**
   * Fallback data for when SQLite is not available
   */
  private static getFallbackOfficeHour(day: LiturgicalDay, hour: string): Partial<OfficeHourProper> {
    // Basic fallback data for the Office
    const fallbackData: Partial<OfficeHourProper> = {
      antiphons: [
        {
          latin: 'Alleluia, alleluia, alleluia.',
          english: 'Alleluia, alleluia, alleluia.'
        }
      ],
      psalms: [
        {
          latin: 'Beatus vir, qui non abiit in consilio impiorum, et in via peccatorum non stetit, et in cathedra pestilentiæ non sedit.',
          english: 'Blessed is the man who hath not walked in the counsel of the ungodly, nor stood in the way of sinners, nor sat in the chair of pestilence.'
        }
      ],
      chapter: {
        latin: 'Fratres: Nox præcéssit, dies autem appropinquávit. Abiciámus ergo ópera tenebrárum, et induámur arma lucis. Sicut in die honéste ambulémus.',
        english: 'Brethren: The night is passed, and the day is at hand. Let us therefore cast off the works of darkness, and put on the armour of light. Let us walk honestly, as in the day.'
      },
      hymn: {
        latin: 'Te lucis ante términum, Rerum Creátor, póscimus, Ut pro tua cleméntia Sis præsul et custódia.',
        english: 'Before the ending of the day, Creator of the world, we pray, That with Thy wonted favor, Thou Wouldst be our guard and keeper now.'
      },
      versicle: {
        latin: 'V. Custódi nos, Dómine, ut pupíllam óculi. R. Sub umbra alárum tuárum prótege nos.',
        english: 'V. Keep us, O Lord, as the apple of Thine eye. R. Protect us under the shadow of Thy wings.'
      },
      collect: {
        latin: 'Vísita, quǽsumus, Dómine, habitatiónem istam, et omnes insídias inimíci ab ea longe repélle: Ángeli tui sancti hábitent in ea, qui nos in pace custódiant; et benedíctio tua sit super nos semper.',
        english: 'Visit, we beseech Thee, O Lord, this dwelling, and drive far from it all snares of the enemy: let Thy holy Angels dwell herein, who may keep us in peace; and may Thy blessing be always upon us.'
      }
    };

    // Add specific canticles based on the hour
    if (hour.toLowerCase() === 'lauds') {
      fallbackData.benedictus = {
        latin: 'Benedíctus Dóminus, Deus Israël: quia visitávit, et fecit redemptiónem plebis suæ.',
        english: 'Blessed be the Lord God of Israel; because He hath visited and wrought the redemption of His people.'
      };
    } else if (hour.toLowerCase() === 'vespers') {
      fallbackData.magnificat = {
        latin: 'Magníficat ánima mea Dóminum. Et exsultávit spíritus meus in Deo, salutári meo.',
        english: 'My soul doth magnify the Lord. And my spirit hath rejoiced in God my Saviour.'
      };
    } else if (hour.toLowerCase() === 'compline') {
      fallbackData.nunc = {
        latin: 'Nunc dimíttis servum tuum, Dómine, secúndum verbum tuum in pace.',
        english: 'Now Thou dost dismiss Thy servant, O Lord, according to Thy word in peace.'
      };
    }

    return fallbackData;
  }

  /**
   * Retrieve the Office hour text for a given day and hour.
   */
  public static async getOfficeHour(day: LiturgicalDay, hour: string): Promise<OfficeHourProper> {
    await this.initialize();

    // If using fallback data, return it directly
    if (this.useFallbackData) {
      console.log('[DEBUG] Using fallback Office data for', hour, day.celebration || day.season);
      return this.ensureCompleteOfficeProper(this.getFallbackOfficeHour(day, hour), hour);
    }

    const params = [ day.season, hour.toLowerCase(), day.celebration || null ];
    const sql = `
      SELECT part, latin, english
      FROM office_texts
      WHERE season = ?
        AND hour = ?
        AND (celebration = ? OR celebration IS NULL)
      ORDER BY CASE WHEN celebration IS NOT NULL THEN 0 ELSE 1 END
    `;

    try {
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
    } catch (error) {
      console.error('[ERROR] Failed to get Office hour:', error);
      // Fall back to static data if query fails
      return this.ensureCompleteOfficeProper(this.getFallbackOfficeHour(day, hour), hour);
    }
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