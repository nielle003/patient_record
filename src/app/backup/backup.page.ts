import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonButtons,
  IonBackButton,
  IonList,
  IonItem,
  IonLabel,
  IonText,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon
} from '@ionic/angular/standalone';
import { BackupService } from '../services/backup';
import { addIcons } from 'ionicons';
import { cloudDownloadOutline, cloudUploadOutline, shareOutline } from 'ionicons/icons';
import { FilePicker } from '@capawesome/capacitor-file-picker';

@Component({
  selector: 'app-backup',
  templateUrl: './backup.page.html',
  styleUrls: ['./backup.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton,
    IonButtons,
    IonBackButton,
    IonList,
    IonItem,
    IonLabel,
    IonText,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonIcon
  ]
})
export class BackupPage implements OnInit {
  backupFiles: string[] = []
  message = ''
  error = ''
  isLoading = false

  constructor(
    private backupService: BackupService,
    private router: Router
  ) {
    addIcons({ cloudDownloadOutline, cloudUploadOutline, shareOutline })
  }

  async ngOnInit() {
    await this.loadBackupFiles()
  }

  async loadBackupFiles() {
    try {
      this.backupFiles = await this.backupService.listBackupFiles()
    } catch (error) {
      console.error('Error loading backup files:', error)
    }
  }

  async exportTable(tableName: string) {
    this.message = ''
    this.error = ''
    this.isLoading = true

    try {
      await this.backupService.shareBackup(tableName)
      this.message = `${tableName} backup saved in the Downloads Folder.`
      await this.loadBackupFiles()
    } catch (err) {
      console.error('Export error:', err)
      this.error = `Failed to export ${tableName}: ` + (err as Error).message
    } finally {
      this.isLoading = false
    }
  }

  async restoreFromBackup(fileName: string) {
    this.message = ''
    this.error = ''

    const confirm = window.confirm(`Restore from ${fileName}? This will overwrite existing data.`)
    if (!confirm) return

    try {
      this.isLoading = true
      const csvContent = await this.backupService.readCSVFile(fileName)

      // Determine table name from filename
      let tableName = ''
      if (fileName.includes('users')) tableName = 'users'
      else if (fileName.includes('patients')) tableName = 'patients'
      else if (fileName.includes('visits')) tableName = 'visits'

      const count = await this.backupService.importCSV(tableName, csvContent)
      this.message = `Successfully restored ${count} records from ${fileName}`
    } catch (err) {
      this.error = 'Restore failed: ' + (err as Error).message
    } finally {
      this.isLoading = false
    }
  }

  async deleteBackup(fileName: string) {
    const confirm = window.confirm(`Delete ${fileName}?`)
    if (!confirm) return

    try {
      await this.backupService.deleteBackupFile(fileName)
      this.message = `Deleted ${fileName}`
      await this.loadBackupFiles()
    } catch (err) {
      this.error = 'Delete failed: ' + (err as Error).message
    }
  }

  getTableName(fileName: string): string {
    if (fileName.includes('users')) return 'Users'
    if (fileName.includes('patients')) return 'Patients'
    if (fileName.includes('visits')) return 'Visits'
    return 'Unknown'
  }

  getFileDate(fileName: string): string {
    // Extract timestamp from filename like "users_backup_2025-12-07T06-30-00-000Z.csv"
    const match = fileName.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/)
    if (match) {
      const dateStr = match[1].replace(/-/g, ':').replace('T', ' ')
      return new Date(dateStr).toLocaleString()
    }
    return fileName
  }

  async exportAllTables() {
    this.message = ''
    this.error = ''
    this.isLoading = true

    try {
      await this.backupService.exportAllTables()
      this.message = 'All tables exported successfully!'
      await this.loadBackupFiles()
    } catch (err) {
      console.error('Export all error:', err)
      this.error = 'Failed to export all tables: ' + (err as Error).message
    } finally {
      this.isLoading = false
    }
  }

  async importFile() {
    this.message = ''
    this.error = ''

    try {
      // Pick CSV file using native file picker
      const result = await FilePicker.pickFiles({
        types: ['text/csv', 'text/comma-separated-values'],
        readData: true
      })

      if (!result.files || result.files.length === 0) {
        return
      }

      const file = result.files[0]
      this.isLoading = true

      // Get file content
      let csvContent = ''
      if (file.data) {
        // Decode base64 data
        csvContent = atob(file.data)
      } else if (file.blob) {
        csvContent = await file.blob.text()
      } else {
        this.error = 'Could not read file content'
        this.isLoading = false
        return
      }

      // Determine table name from filename
      const fileName = file.name.toLowerCase()
      let tableName = ''

      if (fileName.includes('users')) tableName = 'users'
      else if (fileName.includes('patients')) tableName = 'patients'
      else if (fileName.includes('visits')) tableName = 'visits'
      else {
        this.error = 'Cannot determine table from filename. Use users_, patients_, or visits_ prefix.'
        this.isLoading = false
        return
      }

      try {
        const count = await this.backupService.importCSV(tableName, csvContent)
        this.message = `Successfully imported ${count} records into ${tableName}`
        await this.loadBackupFiles()
      } catch (err) {
        this.error = 'Import failed: ' + (err as Error).message
      } finally {
        this.isLoading = false
      }
    } catch (err) {
      this.error = 'File picker error: ' + (err as Error).message
      this.isLoading = false
    }
  }
}
