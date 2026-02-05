import { Injectable } from '@angular/core'
import { DatabaseService } from './database'
import { Payment } from './payment'
import { PhotoService } from './photo'

export interface Visit {
    id?: number
    patientId: number
    firstName: string
    lastName: string
    procedureDone: string
    comments: string
    dateOfVisit: string
    modeOfPayment: string
    totalCost: number
    totalPaid: number
    balance: number
    attachments?: string[] // Array of file paths to x-ray images
}

@Injectable({ providedIn: 'root' })
export class VisitService {
    private initialized = false

    constructor(
        private db: DatabaseService,
        private photoService: PhotoService
    ) {
        this.init()
    }

    private async init() {
        if (!this.initialized) {
            await this.db.init()
            this.initialized = true
        }
    }

    async addVisit(visit: Visit): Promise<number> {
        await this.init()
        console.log('Adding visit:', visit)
        const attachmentsJson = visit.attachments ? JSON.stringify(visit.attachments) : null
        const res: any = await this.db.run(
            `INSERT INTO visits (
        patientId, firstName, lastName, procedureDone, comments, dateOfVisit,
        modeOfPayment, totalCost, totalPaid, balance, attachments
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                visit.patientId,
                visit.firstName,
                visit.lastName,
                visit.procedureDone,
                visit.comments,
                visit.dateOfVisit,
                visit.modeOfPayment,
                visit.totalCost,
                visit.totalPaid,
                visit.balance,
                attachmentsJson
            ]
        )
        return res.changes?.lastId ?? -1
    }

    async getVisitsByPatient(patientId: number): Promise<Visit[]> {
        await this.init()
        console.log('Getting visits for patient:', patientId)
        const res: any = await this.db.query(
            'SELECT * FROM visits WHERE patientId = ? ORDER BY dateOfVisit DESC',
            [patientId]
        )
        console.log('Visits result:', res)
        const visits: any[] = res.values ?? []
        // Parse attachments JSON string back to array
        return visits.map(visit => ({
            ...visit,
            attachments: visit.attachments ? JSON.parse(visit.attachments as string) : []
        }))
    }

    async getAllVisits(): Promise<Visit[]> {
        await this.init()
        const res: any = await this.db.query('SELECT * FROM visits ORDER BY dateOfVisit DESC', [])
        const visits: any[] = res.values ?? []
        // Parse attachments JSON string back to array
        return visits.map(visit => ({
            ...visit,
            attachments: visit.attachments ? JSON.parse(visit.attachments as string) : []
        }))
    }

    async updateVisit(visit: Visit): Promise<boolean> {
        await this.init()
        const res: any = await this.db.run(
            `UPDATE visits SET 
        firstName = ?, lastName = ?, procedureDone = ?, comments = ?, dateOfVisit = ?,
        modeOfPayment = ?, totalCost = ?, totalPaid = ?, balance = ?, attachments = ?
      WHERE id = ?`,
            [
                visit.firstName,
                visit.lastName,
                visit.procedureDone,
                visit.comments,
                visit.dateOfVisit,
                visit.modeOfPayment,
                visit.totalCost,
                visit.totalPaid,
                visit.balance,
                visit.attachments ? JSON.stringify(visit.attachments) : null,
                visit.id
            ]
        )
        return (res.changes?.changes ?? 0) > 0
    }

    async deleteVisit(id: number): Promise<boolean> {
        await this.init()

        // First, get the visit to extract patientId for photo cleanup
        const visitResult: any = await this.db.query(
            'SELECT patientId FROM visits WHERE id = ?',
            [id]
        )

        if (visitResult.values && visitResult.values.length > 0) {
            const patientId = visitResult.values[0].patientId

            // Delete all photos for this visit
            console.log(`🗑️ Deleting photos for visit ${id} of patient ${patientId}`)
            await this.photoService.deleteVisitPhotos(patientId, id)
        }

        // Use executeSet transaction to delete visit and its payments together atomically
        const result = await this.db.runTransactionSet([
            { statement: 'DELETE FROM payments WHERE visitId = ?', values: [id] },
            { statement: 'DELETE FROM visits WHERE id = ?', values: [id] }
        ])

        return (result?.changes?.changes ?? 0) > 0
    }

    // Add visit with initial payment in a single transaction
    async addVisitWithPayment(visit: Visit, initialPayment?: Payment): Promise<number> {
        await this.init()
        console.log('Adding visit with payment:', visit, initialPayment)

        const attachmentsJson = visit.attachments ? JSON.stringify(visit.attachments) : null

        // Prepare statements for transaction
        const statements: Array<{ statement: string, values: any[] }> = [
            {
                statement: `INSERT INTO visits (
                    patientId, firstName, lastName, procedureDone, comments, dateOfVisit,
                    modeOfPayment, totalCost, totalPaid, balance, attachments
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                values: [
                    visit.patientId,
                    visit.firstName,
                    visit.lastName,
                    visit.procedureDone,
                    visit.comments,
                    visit.dateOfVisit,
                    visit.modeOfPayment,
                    visit.totalCost,
                    visit.totalPaid,
                    visit.balance,
                    attachmentsJson
                ]
            }
        ]

        // Execute the insert and get the visitId
        const result = await this.db.runTransactionSet(statements)
        const visitId = result?.changes?.lastId ?? -1

        // If there's an initial payment and visit was created successfully, add payment
        if (visitId > 0 && initialPayment && initialPayment.amount > 0) {
            const ts = Date.now()
            const totalPaid = initialPayment.amount
            const balance = visit.totalCost - totalPaid

            // Execute payment and update in a separate transaction
            await this.db.runTransactionSet([
                {
                    statement: `INSERT INTO payments (
                        visitId, firstName, lastName, amount, paymentDate, paymentMethod, notes, createdAt
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    values: [
                        visitId,
                        initialPayment.firstName,
                        initialPayment.lastName,
                        initialPayment.amount,
                        initialPayment.paymentDate,
                        initialPayment.paymentMethod,
                        initialPayment.notes || '',
                        ts
                    ]
                },
                {
                    statement: 'UPDATE visits SET totalPaid = ?, balance = ? WHERE id = ?',
                    values: [totalPaid, balance, visitId]
                }
            ])
        }

        return visitId
    }
}
