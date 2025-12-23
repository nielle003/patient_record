import { Injectable } from '@angular/core'
import { DatabaseService } from './database'

export interface Payment {
    id?: number
    visitId: number
    firstName: string
    lastName: string
    amount: number
    paymentDate: string
    paymentMethod: string
    notes: string
    createdAt?: number
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
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

    async addPayment(payment: Payment): Promise<number> {
        await this.init()
        const ts = Date.now()
        console.log('Adding payment:', payment)

        // Use transaction to ensure payment insert and balance update happen together
        return await this.db.runTransaction(async () => {
            const res: any = await this.db.run(
                `INSERT INTO payments (
                    visitId, firstName, lastName, amount, paymentDate, paymentMethod, notes, createdAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    payment.visitId,
                    payment.firstName,
                    payment.lastName,
                    payment.amount,
                    payment.paymentDate,
                    payment.paymentMethod,
                    payment.notes || '',
                    ts
                ]
            )

            const paymentId = res.changes?.lastId ?? -1

            // Update the visit's totalPaid and balance
            if (paymentId > 0) {
                await this.updateVisitBalance(payment.visitId)
            }

            return paymentId
        })
    }

    async getPaymentsByVisit(visitId: number): Promise<Payment[]> {
        await this.init()
        console.log('Getting payments for visit:', visitId)
        const res: any = await this.db.query(
            'SELECT * FROM payments WHERE visitId = ? ORDER BY paymentDate ASC, createdAt ASC',
            [visitId]
        )
        console.log('Payments result:', res)
        return res.values ?? []
    }

    async getAllPayments(): Promise<Payment[]> {
        await this.init()
        const res: any = await this.db.query(
            'SELECT * FROM payments ORDER BY paymentDate DESC, createdAt DESC',
            []
        )
        return res.values ?? []
    }

    async updatePayment(payment: Payment): Promise<boolean> {
        await this.init()

        // Use transaction to ensure payment update and balance recalculation happen together
        return await this.db.runTransaction(async () => {
            const res: any = await this.db.run(
                `UPDATE payments SET 
                    firstName = ?, lastName = ?, amount = ?, paymentDate = ?, paymentMethod = ?, notes = ?
                WHERE id = ?`,
                [
                    payment.firstName,
                    payment.lastName,
                    payment.amount,
                    payment.paymentDate,
                    payment.paymentMethod,
                    payment.notes,
                    payment.id
                ]
            )

            const success = (res.changes?.changes ?? 0) > 0

            // Update the visit's totalPaid and balance
            if (success && payment.visitId) {
                await this.updateVisitBalance(payment.visitId)
            }

            return success
        })
    }

    async deletePayment(id: number, visitId: number): Promise<boolean> {
        await this.init()

        // Use transaction to ensure payment delete and balance update happen together
        return await this.db.runTransaction(async () => {
            const res: any = await this.db.run('DELETE FROM payments WHERE id = ?', [id])
            const success = (res.changes?.changes ?? 0) > 0

            // Update the visit's totalPaid and balance
            if (success) {
                await this.updateVisitBalance(visitId)
            }

            return success
        })
    }

    private async updateVisitBalance(visitId: number): Promise<void> {
        await this.init()

        // Get all payments for this visit
        const payments = await this.getPaymentsByVisit(visitId)
        const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0)

        // Get the visit to get totalCost
        const visitRes: any = await this.db.query(
            'SELECT totalCost FROM visits WHERE id = ?',
            [visitId]
        )

        if (visitRes.values && visitRes.values.length > 0) {
            const totalCost = visitRes.values[0].totalCost || 0
            const balance = totalCost - totalPaid

            // Update the visit
            await this.db.run(
                'UPDATE visits SET totalPaid = ?, balance = ? WHERE id = ?',
                [totalPaid, balance, visitId]
            )
        }
    }

    async getTotalPaidForVisit(visitId: number): Promise<number> {
        await this.init()
        const payments = await this.getPaymentsByVisit(visitId)
        return payments.reduce((sum, payment) => sum + payment.amount, 0)
    }

    async deletePaymentsByVisit(visitId: number): Promise<boolean> {
        await this.init()
        const res: any = await this.db.run('DELETE FROM payments WHERE visitId = ?', [visitId])
        return (res.changes?.changes ?? 0) >= 0
    }

    async deletePaymentsByPatient(patientId: number): Promise<boolean> {
        await this.init()
        // First get all visits for this patient
        const visitsRes: any = await this.db.query(
            'SELECT id FROM visits WHERE patientId = ?',
            [patientId]
        )

        if (visitsRes.values && visitsRes.values.length > 0) {
            // Delete payments for each visit
            for (const visit of visitsRes.values) {
                await this.deletePaymentsByVisit(visit.id)
            }
        }
        return true
    }
}
