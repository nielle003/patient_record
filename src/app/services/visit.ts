import { Injectable } from '@angular/core'
import { DatabaseService } from './database'
import { Payment } from './payment'

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
}

@Injectable({ providedIn: 'root' })
export class VisitService {
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

    async addVisit(visit: Visit): Promise<number> {
        await this.init()
        console.log('Adding visit:', visit)
        const res: any = await this.db.run(
            `INSERT INTO visits (
        patientId, firstName, lastName, procedureDone, comments, dateOfVisit,
        modeOfPayment, totalCost, totalPaid, balance
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
                visit.balance
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
        return res.values ?? []
    }

    async getAllVisits(): Promise<Visit[]> {
        await this.init()
        const res: any = await this.db.query('SELECT * FROM visits ORDER BY dateOfVisit DESC', [])
        return res.values ?? []
    }

    async updateVisit(visit: Visit): Promise<boolean> {
        await this.init()
        const res: any = await this.db.run(
            `UPDATE visits SET 
        firstName = ?, lastName = ?, procedureDone = ?, comments = ?, dateOfVisit = ?,
        modeOfPayment = ?, totalCost = ?, totalPaid = ?, balance = ?
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
                visit.id
            ]
        )
        return (res.changes?.changes ?? 0) > 0
    }

    async deleteVisit(id: number): Promise<boolean> {
        await this.init()

        // Use transaction to delete visit and its payments together
        return await this.db.runTransaction(async () => {
            // First delete all payments for this visit
            await this.db.run('DELETE FROM payments WHERE visitId = ?', [id])

            // Then delete the visit itself
            const res: any = await this.db.run('DELETE FROM visits WHERE id = ?', [id])
            return (res.changes?.changes ?? 0) > 0
        })
    }

    // Add visit with initial payment in a single transaction
    async addVisitWithPayment(visit: Visit, initialPayment?: Payment): Promise<number> {
        await this.init()
        console.log('Adding visit with payment:', visit, initialPayment)

        // Prepare statements for transaction
        const statements: Array<{ statement: string, values: any[] }> = [
            {
                statement: `INSERT INTO visits (
                    patientId, firstName, lastName, procedureDone, comments, dateOfVisit,
                    modeOfPayment, totalCost, totalPaid, balance
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
                    visit.balance
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
