import { Injectable } from '@angular/core'
import { DatabaseService } from './database'

export interface Patient {
    id?: number
    firstName: string
    lastName: string
    gender: string
    birthday: string
    contactNumber: string
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
        try {
            const res: any = await this.db.run(
                `INSERT INTO patients (
        firstName, lastName, gender, birthday, contactNumber, occupation, 
        company, hmo, hmoNumber, validId, idNumber, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    patient.firstName,
                    patient.lastName,
                    patient.gender,
                    patient.birthday,
                    patient.contactNumber,
                    patient.occupation || '',
                    patient.company || '',
                    patient.hmo || '',
                    patient.hmoNumber || '',
                    patient.validId || '',
                    patient.idNumber || '',
                    ts
                ]
            )
            console.log('Add patient result:', res)
            // Check different possible response formats
            const lastId = res?.changes?.lastId || res?.lastId || -1
            console.log('Last inserted ID:', lastId)
            return lastId
        } catch (error) {
            console.error('Error in addPatient:', error)
            throw error
        }
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
        firstName = ?, lastName = ?, gender = ?, birthday = ?, contactNumber = ?, 
        occupation = ?, company = ?, hmo = ?, hmoNumber = ?, 
        validId = ?, idNumber = ?
      WHERE id = ?`,
            [
                patient.firstName,
                patient.lastName,
                patient.gender,
                patient.birthday,
                patient.contactNumber,
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

        // Use transaction to ensure all deletes happen together
        // If any step fails, ALL are rolled back
        return await this.db.runTransaction(async () => {
            // Delete in order: payments -> visits -> patient
            // First delete all payments associated with this patient's visits
            const visitsRes: any = await this.db.query(
                'SELECT id FROM visits WHERE patientId = ?',
                [id]
            )

            if (visitsRes.values && visitsRes.values.length > 0) {
                for (const visit of visitsRes.values) {
                    await this.db.run('DELETE FROM payments WHERE visitId = ?', [visit.id])
                }
            }

            // Then delete all visits
            await this.db.run('DELETE FROM visits WHERE patientId = ?', [id])

            // Finally delete the patient
            const res: any = await this.db.run('DELETE FROM patients WHERE id = ?', [id])
            return (res.changes?.changes ?? 0) > 0
        })
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
