import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonText,
  IonSearchbar,
  IonModal,
  IonDatetime,
  IonDatetimeButton,
  IonTextarea,
  IonInput,
  IonSelect,
  IonSelectOption,
  AlertController
} from '@ionic/angular/standalone';
import { PatientService, Patient } from '../services/patient';
import { VisitService, Visit } from '../services/visit';
import { PaymentService, Payment } from '../services/payment';

@Component({
  selector: 'app-viewpatient',
  templateUrl: './viewpatient.page.html',
  styleUrls: ['./viewpatient.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonList,
    IonItem,
    IonLabel,
    IonButton,
    IonButtons,
    IonBackButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonText,
    IonSearchbar,
    IonModal,
    IonDatetime,
    IonDatetimeButton,
    IonTextarea,
    IonInput,
    IonSelect,
    IonSelectOption
  ]
})
export class ViewpatientPage implements OnInit {
  patients: Patient[] = []
  filteredPatients: Patient[] = []
  selectedPatient: Patient | null = null
  visits: Visit[] = []
  searchTerm = ''
  selectedVisit: Visit | null = null
  payments: Payment[] = []
  showPaymentForm = false
  showEditVisitForm = false
  showEditPaymentForm = false
  editingVisit: Visit | null = null
  editingPayment: Payment | null = null
  newPayment: Payment = {
    visitId: 0,
    amount: 0,
    paymentDate: new Date().toISOString(),
    paymentMethod: 'Cash',
    notes: ''
  }

  procedures = [
    'Consultation',
    'Oral Prophylaxis',
    'Restoration',
    'Extraction',
    'Odontectomy',
    'Deep Scaling',
    'Frenectomy',
    'Root Canal Treatment',
    'Orthodontic Treatment',
    'Implant',
    'Bonegrafting',
    'Build up',
    'Denture',
    'Fixed Bridge',
    'Jacket Crown',
    'Veneers'
  ]

  paymentModes = [
    'One-time Payment',
    'Installment'
  ]

  constructor(
    private patientService: PatientService,
    private visitService: VisitService,
    private paymentService: PaymentService,
    private router: Router,
    private alertController: AlertController
  ) { }

  async ngOnInit() {
    await this.loadPatients()
  }

  async loadPatients() {
    this.patients = await this.patientService.getAllPatients()
    this.filteredPatients = this.patients
    console.log('Loaded patients:', this.patients)
  }

  handleSearch(event: any) {
    const query = event.target.value.toLowerCase()
    this.searchTerm = query

    if (query.trim() === '') {
      this.filteredPatients = this.patients
    } else {
      this.filteredPatients = this.patients.filter(patient =>
        patient.firstName.toLowerCase().includes(query) ||
        patient.lastName.toLowerCase().includes(query) ||
        (patient.hmoNumber && patient.hmoNumber.toLowerCase().includes(query))
      )
    }
  }

  async selectPatient(patient: Patient) {
    this.selectedPatient = patient
    if (patient.id) {
      this.visits = await this.visitService.getVisitsByPatient(patient.id)
      console.log('Loaded visits:', this.visits)
    }
  }

  backToList() {
    this.selectedPatient = null
    this.visits = []
  }

  editPatient(patient: Patient) {
    if (patient.id) {
      this.router.navigate(['/addpatient', patient.id])
    }
  }

  async viewPayments(visit: Visit) {
    this.selectedVisit = visit
    if (visit.id) {
      this.payments = await this.paymentService.getPaymentsByVisit(visit.id)
      console.log('Loaded payments:', this.payments)
    }
  }

  closePayments() {
    this.selectedVisit = null
    this.payments = []
    this.showPaymentForm = false
  }

  openPaymentForm(visit: Visit) {
    this.selectedVisit = visit
    this.showPaymentForm = true
    this.newPayment = {
      visitId: visit.id || 0,
      amount: 0,
      paymentDate: new Date().toISOString(),
      paymentMethod: 'Cash',
      notes: ''
    }
  }

  async addPayment() {
    if (!this.newPayment.amount || this.newPayment.amount <= 0) {
      alert('Please enter a valid payment amount')
      return
    }

    if (!this.selectedVisit || !this.selectedVisit.id) {
      alert('No visit selected')
      return
    }

    try {
      const paymentId = await this.paymentService.addPayment(this.newPayment)
      if (paymentId > 0) {
        alert('Payment added successfully!')
        // Reload visit data to get updated balance
        if (this.selectedPatient && this.selectedPatient.id) {
          this.visits = await this.visitService.getVisitsByPatient(this.selectedPatient.id)
          this.selectedVisit = this.visits.find(v => v.id === this.selectedVisit?.id) || null
        }
        // Reload payments
        if (this.selectedVisit && this.selectedVisit.id) {
          this.payments = await this.paymentService.getPaymentsByVisit(this.selectedVisit.id)
        }
        this.showPaymentForm = false
      } else {
        alert('Failed to add payment')
      }
    } catch (err) {
      console.error('Error adding payment:', err)
      alert('Error adding payment: ' + (err as Error).message)
    }
  }

  cancelPayment() {
    this.showPaymentForm = false
  }

  openEditVisit(visit: Visit) {
    this.editingVisit = { ...visit }
    this.showEditVisitForm = true
  }

  cancelEditVisit() {
    this.editingVisit = null
    this.showEditVisitForm = false
  }

  async updateVisit() {
    if (!this.editingVisit) return

    // Validate required fields
    if (!this.editingVisit.procedureDone) {
      alert('Please select a procedure')
      return
    }
    if (!this.editingVisit.modeOfPayment) {
      alert('Please select mode of payment')
      return
    }
    if (!this.editingVisit.dateOfVisit) {
      alert('Please select date of visit')
      return
    }

    // Recalculate balance
    this.editingVisit.balance = this.editingVisit.totalCost - this.editingVisit.totalPaid

    try {
      const success = await this.visitService.updateVisit(this.editingVisit)
      if (success) {
        alert('Visit updated successfully!')
        // Reload visits
        if (this.selectedPatient && this.selectedPatient.id) {
          this.visits = await this.visitService.getVisitsByPatient(this.selectedPatient.id)
        }
        this.showEditVisitForm = false
        this.editingVisit = null
      } else {
        alert('Failed to update visit')
      }
    } catch (err) {
      console.error('Error updating visit:', err)
      alert('Error updating visit: ' + (err as Error).message)
    }
  }

  async deleteVisit(visit: Visit) {
    const confirmAlert = await this.alertController.create({
      header: 'Confirm Delete',
      message: `Are you sure you want to delete this visit? This will also delete all associated payment records.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            try {
              if (visit.id) {
                // First delete all payments for this visit
                await this.paymentService.deletePaymentsByVisit(visit.id)
                // Then delete the visit
                const success = await this.visitService.deleteVisit(visit.id)
                if (success) {
                  window.alert('Visit deleted successfully!')
                  // Reload visits
                  if (this.selectedPatient && this.selectedPatient.id) {
                    this.visits = await this.visitService.getVisitsByPatient(this.selectedPatient.id)
                  }
                } else {
                  window.alert('Failed to delete visit')
                }
              }
            } catch (err) {
              console.error('Error deleting visit:', err)
              window.alert('Error deleting visit: ' + (err as Error).message)
            }
          }
        }
      ]
    })

    await confirmAlert.present()
  }

  openEditPayment(payment: Payment) {
    this.editingPayment = { ...payment }
    this.showEditPaymentForm = true
  }

  cancelEditPayment() {
    this.editingPayment = null
    this.showEditPaymentForm = false
  }

  async updatePayment() {
    if (!this.editingPayment) return

    // Validate required fields
    if (!this.editingPayment.amount || this.editingPayment.amount <= 0) {
      alert('Please enter a valid payment amount')
      return
    }
    if (!this.editingPayment.paymentMethod) {
      alert('Please select a payment method')
      return
    }
    if (!this.editingPayment.paymentDate) {
      alert('Please select a payment date')
      return
    }

    try {
      const success = await this.paymentService.updatePayment(this.editingPayment)
      if (success) {
        alert('Payment updated successfully!')
        // Reload visit data to get updated balance
        if (this.selectedPatient && this.selectedPatient.id) {
          this.visits = await this.visitService.getVisitsByPatient(this.selectedPatient.id)
          this.selectedVisit = this.visits.find(v => v.id === this.selectedVisit?.id) || null
        }
        // Reload payments
        if (this.selectedVisit && this.selectedVisit.id) {
          this.payments = await this.paymentService.getPaymentsByVisit(this.selectedVisit.id)
        }
        this.showEditPaymentForm = false
        this.editingPayment = null
      } else {
        alert('Failed to update payment')
      }
    } catch (err) {
      console.error('Error updating payment:', err)
      alert('Error updating payment: ' + (err as Error).message)
    }
  }

  async deletePayment(payment: Payment) {
    const confirmAlert = await this.alertController.create({
      header: 'Confirm Delete',
      message: `Are you sure you want to delete this payment of ₱${payment.amount.toFixed(2)}?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            try {
              if (payment.id && payment.visitId) {
                const success = await this.paymentService.deletePayment(payment.id, payment.visitId)
                if (success) {
                  window.alert('Payment deleted successfully!')
                  // Reload visit data to get updated balance
                  if (this.selectedPatient && this.selectedPatient.id) {
                    this.visits = await this.visitService.getVisitsByPatient(this.selectedPatient.id)
                    this.selectedVisit = this.visits.find(v => v.id === this.selectedVisit?.id) || null
                  }
                  // Reload payments
                  if (this.selectedVisit && this.selectedVisit.id) {
                    this.payments = await this.paymentService.getPaymentsByVisit(this.selectedVisit.id)
                  }
                } else {
                  window.alert('Failed to delete payment')
                }
              }
            } catch (err) {
              console.error('Error deleting payment:', err)
              window.alert('Error deleting payment: ' + (err as Error).message)
            }
          }
        }
      ]
    })

    await confirmAlert.present()
  }

  async deletePatient(patient: Patient) {
    const confirmAlert = await this.alertController.create({
      header: 'Confirm Delete',
      message: `Are you sure you want to delete ${patient.firstName} ${patient.lastName}? This will permanently delete all visit records and payment history for this patient.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            try {
              if (patient.id) {
                const success = await this.patientService.deletePatient(patient.id)
                if (success) {
                  window.alert('Patient deleted successfully!')
                  // Go back to patient list
                  this.backToList()
                  // Reload patients
                  await this.loadPatients()
                } else {
                  window.alert('Failed to delete patient')
                }
              }
            } catch (err) {
              console.error('Error deleting patient:', err)
              window.alert('Error deleting patient: ' + (err as Error).message)
            }
          }
        }
      ]
    })

    await confirmAlert.present()
  }

  getAge(birthday: string): number {
    const birthDate = new Date(birthday)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }
}
