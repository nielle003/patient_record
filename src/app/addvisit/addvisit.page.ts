import { Component, OnInit } from '@angular/core';
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
  IonList
} from '@ionic/angular/standalone';
import { VisitService, Visit } from '../services/visit';
import { PatientService, Patient } from '../services/patient';

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
    IonList
  ]
})
export class AddvisitPage implements OnInit {
  visit: Visit = {
    patientId: 0,
    procedureDone: '',
    comments: '',
    dateOfVisit: new Date().toISOString(),
    modeOfPayment: '',
    payment: 0,
    balance: 0
  }

  patients: Patient[] = []
  filteredPatients: Patient[] = []
  selectedPatient: Patient | null = null
  searchTerm = ''
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
    'Cash',
    'Installment'
  ]

  constructor(
    private visitService: VisitService,
    private patientService: PatientService,
    private router: Router
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

  selectPatient(patient: Patient) {
    this.selectedPatient = patient
    this.visit.patientId = patient.id || 0
    this.searchTerm = `${patient.firstName} ${patient.lastName}`
    this.filteredPatients = []
  }

  clearPatientSelection() {
    this.selectedPatient = null
    this.visit.patientId = 0
    this.searchTerm = ''
    this.filteredPatients = this.patients
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
      console.log('Attempting to add visit:', this.visit)
      const visitId = await this.visitService.addVisit(this.visit)
      console.log('Visit added with ID:', visitId)

      if (visitId && visitId > 0) {
        this.success = 'Visit added successfully!'
        alert(this.success)
        this.resetForm()
        setTimeout(() => {
          this.router.navigate(['/viewpatient'])
        }, 1000)
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
      procedureDone: '',
      comments: '',
      dateOfVisit: new Date().toISOString(),
      modeOfPayment: '',
      payment: 0,
      balance: 0
    }
    this.selectedPatient = null
    this.searchTerm = ''
    this.filteredPatients = this.patients
    this.error = ''
    this.success = ''
  }

  getPatientName(patientId: number): string {
    const patient = this.patients.find(p => p.id === patientId)
    return patient ? `${patient.firstName} ${patient.lastName}` : ''
  }
}
