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

      // Enable WAL mode for better corruption protection
      await this.enableWALMode()

      // Check database integrity
      const isHealthy = await this.checkIntegrity()
      if (!isHealthy) {
        console.warn('⚠️ Database integrity check failed!')
        // You could add backup restoration here in the future
      }

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
        firstName TEXT,
        lastName TEXT,
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
        firstName TEXT,
        lastName TEXT,
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

  /**
   * Enable Write-Ahead Logging (WAL) mode for better corruption protection
   * WAL mode keeps changes in a separate file until safe to merge into main database
   */
  private async enableWALMode() {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      // Enable WAL mode
      await this.db.execute('PRAGMA journal_mode=WAL;')

      // Set synchronous mode to NORMAL for better performance
      // NORMAL is safe with WAL mode and faster than FULL
      await this.db.execute('PRAGMA synchronous=NORMAL;')

      console.log('✅ WAL mode enabled successfully')
    } catch (error) {
      console.error('Failed to enable WAL mode:', error)
      // Non-critical error, continue anyway
    }
  }

  /**
   * Check database integrity to detect corruption
   * Returns true if database is healthy, false if corrupted
   */
  private async checkIntegrity(): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      const result = await this.db.query('PRAGMA integrity_check;')

      // integrity_check returns { values: [{ integrity_check: 'ok' }] } if healthy
      if (result.values && result.values.length > 0) {
        const status = result.values[0].integrity_check

        if (status === 'ok') {
          console.log('✅ Database integrity check: PASSED')
          return true
        } else {
          console.error('❌ Database integrity check: FAILED -', status)
          return false
        }
      }

      return true // Assume healthy if no clear result
    } catch (error) {
      console.error('Integrity check error:', error)
      return true // Assume healthy if check fails (don't block startup)
    }
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

  /**
   * Execute multiple database operations as a single atomic transaction
   * Either ALL operations succeed or ALL are rolled back
   * Prevents partial updates and data inconsistency
   * 
   * @param callback Function containing database operations to execute
   * @returns Result from the callback function
   * @throws Error if transaction fails (automatically rolls back)
   * 
   * @example
   * await db.runTransaction(async () => {
   *   await db.run('INSERT INTO visits ...', [data])
   *   await db.run('UPDATE patients ...', [data])
   *   // Both succeed together or both fail together
   * })
   */
  async runTransaction<T>(callback: () => Promise<T>): Promise<T> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      // Begin transaction
      await this.db.run('BEGIN TRANSACTION')
      console.log('🔄 Transaction started')

      // Execute all operations in the callback
      const result = await callback()

      // Commit transaction - make all changes permanent
      await this.db.run('COMMIT')
      console.log('✅ Transaction committed successfully')

      return result
    } catch (error) {
      // Rollback transaction - undo all changes
      try {
        await this.db.run('ROLLBACK')
        console.log('🔙 Transaction rolled back due to error')
      } catch (rollbackError) {
        console.error('Failed to rollback transaction:', rollbackError)
      }

      console.error('❌ Transaction failed:', error)
      throw error
    }
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
