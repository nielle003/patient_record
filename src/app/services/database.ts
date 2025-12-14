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
  private initialized = false

  async init() {
    if (this.initialized && this.db) {
      return // Already initialized
    }

    try {
      // Check if connection already exists
      const isConnection = await this.sqlite.isConnection(this.DB_NAME, false)
      if (isConnection.result) {
        // Retrieve existing connection
        this.db = await this.sqlite.retrieveConnection(this.DB_NAME, false)
      } else {
        // Create new connection
        this.db = await this.sqlite.createConnection(
          this.DB_NAME,
          false,
          'no-encryption',
          1,
          false
        )
      }

      await this.db.open()
      await this.createTables()
      this.initialized = true
    } catch (error) {
      console.error('Database initialization error:', error)
      throw error
    }
  }

  private async createTables() {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY NOT NULL,
        username TEXT UNIQUE,
        password TEXT,
        createdAt INTEGER
      );

      CREATE TABLE IF NOT EXISTS patients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firstName TEXT,
        lastName TEXT,
        gender TEXT,
        birthday TEXT,
        contactNumber TEXT,
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
        totalCost REAL,
        totalPaid REAL DEFAULT 0,
        balance REAL,
        FOREIGN KEY (patientId) REFERENCES patients(id)
      );

      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        visitId INTEGER,
        amount REAL,
        paymentDate TEXT,
        paymentMethod TEXT,
        notes TEXT,
        createdAt INTEGER,
        FOREIGN KEY (visitId) REFERENCES visits(id)
      );
    `)

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

  async close() {
    if (this.db) {
      try {
        await this.db.close()
        await this.sqlite.closeConnection(this.DB_NAME, false)
        this.db = null
        this.initialized = false
        console.log('Database closed successfully')
      } catch (error) {
        console.error('Error closing database:', error)
      }
    }
  }

  async isOpen(): Promise<boolean> {
    return this.initialized && this.db !== null
  }
}
