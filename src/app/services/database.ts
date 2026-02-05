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
  // Encryption passphrase - in production, consider storing this more securely
  private readonly ENCRYPTION_SECRET = 'PatientRecords@2025!Secure#Key'

  async init() {
    if (this.initialized && this.db) {
      console.log('✅ Database already initialized')
      return // Already initialized
    }

    try {
      console.log('🔧 Initializing database...')

      // Try to retrieve first, if that fails, create new
      try {
        console.log('📂 Attempting to retrieve existing connection...')
        this.db = await this.sqlite.retrieveConnection(this.DB_NAME, false)
        console.log('✅ Retrieved existing connection')
      } catch (retrieveError: any) {
        console.log('📂 No existing connection found, creating new...')
        try {
          this.db = await this.sqlite.createConnection(
            this.DB_NAME,
            false,
            'no-encryption',
            1,
            false
          )
          console.log('✅ Connection created')
        } catch (createError: any) {
          // If creation fails, try closing and recreating
          console.log('⚠️ Create failed, attempting cleanup and retry...')
          try {
            await this.sqlite.closeConnection(this.DB_NAME, false)
          } catch (e) {
            // Ignore close errors
          }
          this.db = await this.sqlite.createConnection(
            this.DB_NAME,
            false,
            'no-encryption',
            1,
            false
          )
          console.log('✅ Connection created after cleanup')
        }
      }

      // Open database
      console.log('🔓 Opening database...')
      await this.db.open()
      console.log('✅ Database opened successfully')

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
      this.initialized = false
      this.db = null
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
        attachments TEXT,
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

      -- Indexes for faster queries
      -- Speed up patient search by name
      CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(lastName, firstName);
      
      -- Speed up loading visits for a patient
      CREATE INDEX IF NOT EXISTS idx_visits_patientId ON visits(patientId);
      
      -- Speed up loading payments for a visit
      CREATE INDEX IF NOT EXISTS idx_payments_visitId ON payments(visitId);
      
      -- Speed up visit date searches
      CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(dateOfVisit);
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
      // Enable WAL mode using executeSet which runs statements without transaction wrapper
      // PRAGMA commands cannot be executed within a transaction
      await this.db.executeSet([
        { statement: 'PRAGMA journal_mode=WAL;', values: [] },
        { statement: 'PRAGMA synchronous=NORMAL;', values: [] }
      ])

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
   * Execute multiple database operations as a single atomic transaction using executeSet
   * Either ALL operations succeed or ALL are rolled back
   * Prevents partial updates and data inconsistency
   * 
   * @param statements Array of SQL statements with their values to execute
   * @returns Result from the transaction
   * @throws Error if transaction fails (automatically rolls back)
   * 
   * @example
   * await db.runTransaction([
   *   { statement: 'INSERT INTO visits ...', values: [data] },
   *   { statement: 'UPDATE patients ...', values: [data] }
   * ])
   */
  async runTransactionSet(statements: Array<{ statement: string, values?: any[] }>): Promise<any> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      console.log('🔄 Executing transaction with', statements.length, 'statements')

      const set = statements.map(stmt => ({
        statement: stmt.statement,
        values: stmt.values || []
      }))

      const result = await this.db.executeSet(set, true) // true = use transaction
      console.log('✅ Transaction completed successfully')

      return result
    } catch (error) {
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
