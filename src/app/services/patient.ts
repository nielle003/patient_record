import { Injectable } from '@angular/core'
import { DatabaseService } from './database'

export interface Patient {
    id?: number
    firstName: string
    lastName: string
    gender: string
    birthday: string
    occupation: string
    company: string
    hmo: string
    hmoNumber: string
    validId: string
    idNumber: string
    createdAt?: number
}

@Injectable({ providedIn: 'root' })
export class PatientService {
    private initialized = false

    constructor(private db: DatabaseService) {
        this.init()
    }

    private async init() {
        if (!this.initialized) {
            await this.db.init()
            this.initialized = true
        }
    }

    async addPatient(patient: Patient): Promise<number> {
        await this.init()
        const ts = Date.now()
        console.log('Adding patient:', patient)
        const res: any = await this.db.run(
            `INSERT INTO patients (
        firstName, lastName, gender, birthday, occupation, 
        company, hmo, hmoNumber, validId, idNumber, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                patient.firstName,
                patient.lastName,
                patient.gender,
                patient.birthday,
                patient.occupation,
                patient.company,
                patient.hmo,
                patient.hmoNumber,
                patient.validId,
                patient.idNumber,
                ts
            ]
        )
        console.log('Add patient result:', res)
        return res.changes?.lastId ?? -1
    }

    async getAllPatients(): Promise<Patient[]> {
        await this.init()
        console.log('Querying all patients...')
        const res: any = await this.db.query('SELECT * FROM patients ORDER BY createdAt DESC', [])
        console.log('Patients result:', res)
        return res.values ?? []
    }

    async getPatient(id: number): Promise<Patient | null> {
        await this.init()
        const res: any = await this.db.query('SELECT * FROM patients WHERE id = ?', [id])
        return res.values?.[0] ?? null
    }

    async updatePatient(patient: Patient): Promise<boolean> {
        await this.init()
        const res: any = await this.db.run(
            `UPDATE patients SET 
        firstName = ?, lastName = ?, gender = ?, birthday = ?, 
        occupation = ?, company = ?, hmo = ?, hmoNumber = ?, 
        validId = ?, idNumber = ?
      WHERE id = ?`,
            [
                patient.firstName,
                patient.lastName,
                patient.gender,
                patient.birthday,
                patient.occupation,
                patient.company,
                patient.hmo,
                patient.hmoNumber,
                patient.validId,
                patient.idNumber,
                patient.id
            ]
        )
        return (res.changes?.changes ?? 0) > 0
    }

    async deletePatient(id: number): Promise<boolean> {
        await this.init()
        const res: any = await this.db.run('DELETE FROM patients WHERE id = ?', [id])
        return (res.changes?.changes ?? 0) > 0
    }

    async searchPatients(searchTerm: string): Promise<Patient[]> {
        await this.init()
        const term = `%${searchTerm}%`
        const res: any = await this.db.query(
            `SELECT * FROM patients 
       WHERE firstName LIKE ? OR lastName LIKE ? OR hmoNumber LIKE ?
       ORDER BY createdAt DESC`,
            [term, term, term]
        )
        return res.values ?? []
    }
}
