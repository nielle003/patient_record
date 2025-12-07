import { Injectable } from '@angular/core'
import { Capacitor } from '@capacitor/core'
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection
} from '@capacitor-community/sqlite'

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  private sqlite = new SQLiteConnection(CapacitorSQLite)
  private db: SQLiteDBConnection | null = null
  private DB_NAME = 'patient_records'
  private isWeb = Capacitor.getPlatform() === 'web'

  async init() {
    try {
      if (this.isWeb) {
        // For web platform (development only)
        await this.waitForJeepSqlite()
        await this.sqlite.initWebStore()
      }

      this.db = await this.sqlite.createConnection(
        this.DB_NAME,
        false,
        'no-encryption',
        1,
        false
      )
      await this.db.open()
      await this.createTables()
    } catch (error) {
      console.error('Database initialization error:', error)
      if (this.isWeb) {
        console.warn('SQLite web support has issues. Please test on a real device or emulator.')
      }
      throw error
    }
  }

  private async waitForJeepSqlite() {
    return new Promise<void>((resolve, reject) => {
      let attempts = 0
      const maxAttempts = 100 // 5 seconds max
      const checkElement = () => {
        const jeepEl = document.querySelector('jeep-sqlite')
        if (jeepEl && customElements.get('jeep-sqlite')) {
          console.log('jeep-sqlite element found and defined!')
          // Give it a bit more time to fully initialize
          setTimeout(() => resolve(), 100)
        } else {
          attempts++
          if (attempts >= maxAttempts) {
            reject(new Error('jeep-sqlite element not found after 5 seconds'))
          } else {
            setTimeout(checkElement, 50)
          }
        }
      }
      checkElement()
    })
  }

  private async createTables() {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const sql = `
      CREATE TABLE IF NOT EXISTS patients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firstName TEXT,
        lastName TEXT,
        gender TEXT,
        birthday TEXT,
        occupation TEXT,
        company TEXT,
        hmo TEXT,
        hmoNumber TEXT,
        validId TEXT,
        idNumber TEXT,
        createdAt INTEGER
      );

      CREATE TABLE IF NOT EXISTS visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patientId INTEGER,
        procedureDone TEXT,
        comments TEXT,
        dateOfVisit TEXT,
        modeOfPayment TEXT,
        payment REAL,
        balance REAL,
        FOREIGN KEY (patientId) REFERENCES patients(id)
      );
    `
    await this.db.execute(sql)

    await this.db?.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY NOT NULL,
        username TEXT UNIQUE,
        password TEXT,
        createdAt INTEGER
      );
    `);

    await this.db.run(
      `INSERT OR IGNORE INTO users (id, username, password, createdAt) VALUES (1, 'admin', '1234', ?)`,
      [Date.now()]
    )

  }

  async run(query: string, values: any[] = []) {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    return await this.db.run(query, values)
  }

  async query(query: string, values: any[] = []) {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    return await this.db.query(query, values)
  }
}
