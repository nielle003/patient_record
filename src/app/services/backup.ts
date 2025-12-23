import { Injectable } from '@angular/core'
import { DatabaseService } from './database'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { Capacitor } from '@capacitor/core'

@Injectable({ providedIn: 'root' })
export class BackupService {
    constructor(private db: DatabaseService) { }

    // Export database table to CSV
    async exportTableToCSV(tableName: string): Promise<string> {
        await this.db.init()

        // Get all data from the table
        const result: any = await this.db.query(`SELECT * FROM ${tableName}`, [])
        const rows = result.values || []

        if (rows.length === 0) {
            throw new Error(`No data found in ${tableName}`)
        }

        // Get column names from first row
        const columns = Object.keys(rows[0])

        // Create CSV header
        let csv = columns.join(',') + '\n'

        // Add data rows
        for (const row of rows) {
            const values = columns.map(col => {
                const value = row[col]
                // Escape quotes and wrap in quotes if contains comma or newline
                if (value === null || value === undefined) return ''
                const stringValue = String(value)
                if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
                    return `"${stringValue.replace(/"/g, '""')}"`
                }
                return stringValue
            })
            csv += values.join(',') + '\n'
        }

        return csv
    }

    // Export all tables
    async exportAllTables(): Promise<void> {
        const tables = ['users', 'patients', 'visits', 'payments']

        // Create a single timestamped folder for all backups
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const folderName = `Backups-${timestamp}`

        for (const table of tables) {
            await this.shareBackup(table, folderName)
            // Small delay between saves
            await new Promise(resolve => setTimeout(resolve, 500))
        }
    }

    // Save backup directly to local storage (Downloads folder on Android)
    async shareBackup(tableName: string, folderName?: string): Promise<void> {
        const csv = await this.exportTableToCSV(tableName)
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const fileName = `${tableName}_backup_${timestamp}.csv`

        // Use provided folder name or create a new one
        const backupFolder = folderName || `Backups-${timestamp}`

        if (Capacitor.getPlatform() === 'web') {
            // For web, download directly
            this.downloadCSV(csv, fileName)
            return
        }

        try {
            // Create backup folder (ignore error if already exists)
            try {
                await Filesystem.mkdir({
                    path: `Download/${backupFolder}`,
                    directory: Directory.ExternalStorage,
                    recursive: true
                })
            } catch (e) {
                // Directory might already exist, continue anyway
            }

            // Save file inside the backup folder
            await Filesystem.writeFile({
                path: `Download/${backupFolder}/${fileName}`,
                data: csv,
                directory: Directory.ExternalStorage,
                encoding: Encoding.UTF8
            })

            console.log(`Backup saved successfully to Downloads/${backupFolder}/${fileName}`)
        } catch (error) {
            console.error('Backup error:', error)
            throw error
        }
    }

    // Download CSV for web platform
    private downloadCSV(csv: string, fileName: string) {
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = fileName
        link.click()
        window.URL.revokeObjectURL(url)
    }

    // Import CSV to database
    async importCSV(tableName: string, csvContent: string): Promise<{ imported: number, failed: number, errors: string[] }> {
        await this.db.init()

        // Parse CSV
        const lines = csvContent.split('\n').filter(line => line.trim())
        if (lines.length < 2) {
            throw new Error('CSV file is empty or invalid')
        }

        // Get headers
        const headers = this.parseCSVLine(lines[0])
        let importedCount = 0
        let failedCount = 0
        const errors: string[] = []

        // Process each data row
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i])

            if (values.length !== headers.length) {
                failedCount++
                errors.push(`Row ${i + 1}: Column count mismatch (expected ${headers.length}, got ${values.length})`)
                continue
            }

            // Build INSERT query
            const placeholders = headers.map(() => '?').join(', ')
            const columnNames = headers.join(', ')

            try {
                await this.db.run(
                    `INSERT OR REPLACE INTO ${tableName} (${columnNames}) VALUES (${placeholders})`,
                    values.map(v => v === '' ? null : v)
                )
                importedCount++
            } catch (error) {
                failedCount++
                const errorMsg = (error as Error).message || String(error)
                errors.push(`Row ${i + 1}: ${errorMsg}`)
                console.error(`Error importing row ${i + 1}:`, error)
            }
        }

        return { imported: importedCount, failed: failedCount, errors }
    }

    // Parse CSV line handling quoted values
    private parseCSVLine(line: string): string[] {
        const result: string[] = []
        let current = ''
        let inQuotes = false

        for (let i = 0; i < line.length; i++) {
            const char = line[i]
            const nextChar = line[i + 1]

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Escaped quote
                    current += '"'
                    i++ // Skip next quote
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes
                }
            } else if (char === ',' && !inQuotes) {
                // End of field
                result.push(current)
                current = ''
            } else {
                current += char
            }
        }

        // Add last field
        result.push(current)
        return result
    }

    // Read CSV file from device
    async readCSVFile(path: string): Promise<string> {
        const result = await Filesystem.readFile({
            path: `PatientRecordsBackup/${path}`,
            directory: Directory.Documents,
            encoding: Encoding.UTF8
        })
        return result.data as string
    }

    // Delete backup file
    async deleteBackupFile(fileName: string): Promise<void> {
        await Filesystem.deleteFile({
            path: `PatientRecordsBackup/${fileName}`,
            directory: Directory.Documents
        })
    }

    // List backup files
    async listBackupFiles(): Promise<string[]> {
        try {
            // Ensure directory exists
            try {
                await Filesystem.mkdir({
                    path: 'PatientRecordsBackup',
                    directory: Directory.Documents,
                    recursive: true
                })
            } catch (e) {
                // Directory might already exist
            }

            const result = await Filesystem.readdir({
                path: 'PatientRecordsBackup',
                directory: Directory.Documents
            })
            return result.files
                .map((f: any) => f.name || f)
                .filter((name: string) => name.endsWith('.csv'))
                .sort()
                .reverse() // Most recent first
        } catch (error) {
            console.error('Error listing files:', error)
            return []
        }
    }
}
