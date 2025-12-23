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

        // Use executeSet transaction to ensure all deletes happen together atomically
        // If any step fails, ALL are rolled back
        
        // First get all visit IDs for this patient
        const visitsRes: any = await this.db.query(
            'SELECT id FROM visits WHERE patientId = ?',
            [id]
        )

        // Build statements array for the transaction
        const statements: Array<{ statement: string, values: any[] }> = []

        // Delete all payments for each visit
        if (visitsRes.values && visitsRes.values.length > 0) {
            for (const visit of visitsRes.values) {
                statements.push({
                    statement: 'DELETE FROM payments WHERE visitId = ?',
                    values: [visit.id]
                })
            }
        }

        // Delete all visits for this patient
        statements.push({
            statement: 'DELETE FROM visits WHERE patientId = ?',
            values: [id]
        })

        // Delete the patient
        statements.push({
            statement: 'DELETE FROM patients WHERE id = ?',
            values: [id]
        })

        // Execute all deletes in a single transaction
        const result = await this.db.runTransactionSet(statements)
        return (result?.changes?.changes ?? 0) > 0
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

    // Get paginated patients (for efficient loading)
    async getPatientsPaginated(page: number, pageSize: number): Promise<Patient[]> {
        await this.init()
        const offset = page * pageSize
        const res: any = await this.db.query(
            `SELECT * FROM patients 
             ORDER BY lastName, firstName
             LIMIT ? OFFSET ?`,
            [pageSize, offset]
        )
        return res.values ?? []
    }

    // Get total count of patients
    async getPatientsCount(): Promise<number> {
        await this.init()
        const res: any = await this.db.query(
            'SELECT COUNT(*) as count FROM patients',
            []
        )
        return res.values?.[0]?.count ?? 0
    }

    // Search patients with pagination
    async searchPatientsPaginated(searchTerm: string, page: number, pageSize: number): Promise<Patient[]> {
        await this.init()
        const term = `%${searchTerm}%`
        const offset = page * pageSize
        const res: any = await this.db.query(
            `SELECT * FROM patients 
             WHERE firstName LIKE ? OR lastName LIKE ? OR hmoNumber LIKE ?
             ORDER BY lastName, firstName
             LIMIT ? OFFSET ?`,
            [term, term, term, pageSize, offset]
        )
        return res.values ?? []
    }

    // Get search results count
    async getSearchResultsCount(searchTerm: string): Promise<number> {
        await this.init()
        const term = `%${searchTerm}%`
        const res: any = await this.db.query(
            `SELECT COUNT(*) as count FROM patients 
             WHERE firstName LIKE ? OR lastName LIKE ? OR hmoNumber LIKE ?`,
            [term, term, term]
        )
        return res.values?.[0]?.count ?? 0
    }
}
