import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonText,
  IonSelect,
  IonSelectOption,
  IonBackButton,
  IonButtons,
  IonTextarea,
  IonSearchbar,
  IonList,
  IonIcon,
  IonCard,
  IonCardContent,
  IonCardTitle,
  IonCardHeader
} from '@ionic/angular/standalone';

import { VisitService, Visit } from '../services/visit';
import { PatientService, Patient } from '../services/patient';
import { PaymentService, Payment } from '../services/payment';

@Component({
  selector: 'app-addvisit',
  templateUrl: './addvisit.page.html',
  styleUrls: ['./addvisit.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonText,
    IonSelect,
    IonSelectOption,
    IonBackButton,
    IonButtons,
    IonTextarea,
    IonSearchbar,
    IonList,
    IonIcon,
    IonCard,
    IonCardContent,
    IonCardTitle,
    IonCardHeader
  ]
})
export class AddvisitPage implements OnInit, OnDestroy {
  visit: Visit = {
    patientId: 0,
    firstName: '',
    lastName: '',
    procedureDone: '',
    comments: '',
    dateOfVisit: new Date().toISOString(),
    modeOfPayment: '',
    totalCost: 0,
    totalPaid: 0,
    balance: 0
  }

  initialPayment: number = 0

  filteredPatients: Patient[] = []
  selectedPatient: Patient | null = null
  searchTerm = ''
  searchInProgress = false
  searchTimeout: any = null
  maxResults = 20  // Limit search results for performance
  error = ''
  success = ''

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
    private visitService: VisitService,
    private patientService: PatientService,
    private paymentService: PaymentService,
    private router: Router
  ) { }

  async ngOnInit() {
    // No need to load all patients on init
    // Search will be triggered as user types
  }

  async handleSearch(event: any) {
    const query = event.target.value.trim()
    this.searchTerm = query

    // Clear existing timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout)
    }

    // Clear results if search is empty
    if (query === '') {
      this.filteredPatients = []
      return
    }

    // Only search if query has at least 2 characters
    if (query.length < 2) {
      return
    }

    // Debounce search - wait 300ms after user stops typing
    this.searchInProgress = true
    this.searchTimeout = setTimeout(async () => {
      try {
        // Use database search with LIMIT for better performance
        const allResults = await this.patientService.searchPatients(query)
        // Limit results to maxResults to prevent memory issues
        this.filteredPatients = allResults.slice(0, this.maxResults)
        console.log(`Found ${allResults.length} patients, showing ${this.filteredPatients.length}`)
      } catch (error) {
        console.error('Search error:', error)
        this.filteredPatients = []
      } finally {
        this.searchInProgress = false
      }
    }, 300)  // 300ms debounce delay
  }

  selectPatient(patient: Patient) {
    this.selectedPatient = patient
    this.visit.patientId = patient.id || 0
    this.visit.firstName = patient.firstName
    this.visit.lastName = patient.lastName
    this.searchTerm = `${patient.firstName} ${patient.lastName}`
    this.filteredPatients = []
  }

  clearPatientSelection() {
    this.selectedPatient = null
    this.visit.patientId = 0
    this.visit.firstName = ''
    this.visit.lastName = ''
    this.searchTerm = ''
    this.filteredPatients = []
  }

  calculateBalance() {
    this.visit.balance = this.visit.totalCost - this.initialPayment
    this.visit.totalPaid = this.initialPayment
  }

  async addVisit() {
    this.error = ''
    this.success = ''

    // Validate required fields
    if (!this.visit.patientId || this.visit.patientId === 0) {
      this.error = 'Please select a patient'
      return
    }
    if (!this.visit.procedureDone) {
      this.error = 'Please select a procedure'
      return
    }
    if (!this.visit.modeOfPayment) {
      this.error = 'Please select mode of payment'
      return
    }
    if (!this.visit.dateOfVisit) {
      this.error = 'Please select date of visit'
      return
    }

    try {
      // Calculate final totals
      this.calculateBalance()

      console.log('Attempting to add visit:', this.visit)
      
      // Prepare initial payment if provided
      let initialPaymentData: Payment | undefined
      if (this.initialPayment > 0) {
        initialPaymentData = {
          visitId: 0, // Will be set by the service
          firstName: this.visit.firstName,
          lastName: this.visit.lastName,
          amount: this.initialPayment,
          paymentDate: new Date().toISOString(),
          paymentMethod: this.visit.modeOfPayment === 'Cash' ? 'Cash' : 'Down Payment',
          notes: 'Initial payment'
        }
      }

      // Add visit with payment in a single transaction
      const visitId = await this.visitService.addVisitWithPayment(this.visit, initialPaymentData)
      console.log('Visit added with ID:', visitId)

      if (visitId && visitId > 0) {
        this.success = 'Visit added successfully!'
        alert(this.success)
        this.resetForm()
      } else {
        this.error = 'Failed to add visit - no ID returned'
        console.error(this.error)
        alert(this.error)
      }
    } catch (err) {
      console.error('Error adding visit:', err)
      this.error = 'An error occurred while adding visit: ' + (err as Error).message
      alert(this.error)
    }
  }

  resetForm() {
    this.visit = {
      patientId: 0,
      firstName: '',
      lastName: '',
      procedureDone: '',
      comments: '',
      dateOfVisit: new Date().toISOString(),
      modeOfPayment: '',
      totalCost: 0,
      totalPaid: 0,
      balance: 0
    }
    this.initialPayment = 0
    this.selectedPatient = null
    this.searchTerm = ''
    this.filteredPatients = []
    this.error = ''
    this.success = ''
  }

  ngOnDestroy() {
    // Clean up search timeout to prevent memory leaks
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout)
    }
  }
}
