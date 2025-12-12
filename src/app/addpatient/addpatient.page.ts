import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
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
  IonButtons
} from '@ionic/angular/standalone';
import { PatientService, Patient } from '../services/patient';

@Component({
  selector: 'app-addpatient',
  templateUrl: './addpatient.page.html',
  styleUrls: ['./addpatient.page.scss'],
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
    IonButtons
  ]
})
export class AddpatientPage implements OnInit {
  patient: Patient = {
    firstName: '',
    lastName: '',
    gender: '',
    birthday: '',
    contactNumber: '',
    occupation: '',
    company: '',
    hmo: '',
    hmoNumber: '',
    validId: '',
    idNumber: ''
  }

  error = ''
  success = ''
  isEditMode = false
  patientId: number | null = null

  constructor(
    private patientService: PatientService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  async ngOnInit() {
    // Check if we're in edit mode
    const id = this.route.snapshot.paramMap.get('id')
    if (id) {
      this.isEditMode = true
      this.patientId = parseInt(id, 10)
      await this.loadPatient()
    }
  }

  async loadPatient() {
    if (this.patientId) {
      try {
        const patient = await this.patientService.getPatient(this.patientId)
        if (patient) {
          this.patient = patient
        } else {
          this.error = 'Patient not found'
          alert(this.error)
          this.router.navigate(['/viewpatient'])
        }
      } catch (err) {
        console.error('Error loading patient:', err)
        this.error = 'Failed to load patient data'
        alert(this.error)
      }
    }
  }

  async addPatient() {
    this.error = ''
    this.success = ''

    // Validate required fields
    if (!this.patient.firstName || !this.patient.lastName || !this.patient.gender || !this.patient.birthday || !this.patient.contactNumber) {
      this.error = 'Please fill in all required fields (Name, Gender, Birthday, Contact Number)'
      return
    }

    try {
      if (this.isEditMode) {
        // Update existing patient
        console.log('Attempting to update patient:', this.patient)
        const success = await this.patientService.updatePatient(this.patient)

        if (success) {
          this.success = 'Patient updated successfully!'
          alert(this.success)
          setTimeout(() => {
            this.router.navigate(['/viewpatient'])
          }, 1000)
        } else {
          this.error = 'Failed to update patient'
          console.error(this.error)
          alert(this.error)
        }
      } else {
        // Add new patient
        console.log('Attempting to add patient:', this.patient)
        const patientId = await this.patientService.addPatient(this.patient)
        console.log('Patient added with ID:', patientId)

        if (patientId && patientId > 0) {
          this.success = 'Patient added successfully!'
          alert(this.success)
          this.resetForm()
          setTimeout(() => {
            this.router.navigate(['/home'])
          }, 1000)
        } else {
          this.error = 'Failed to add patient - no ID returned'
          console.error(this.error)
          alert(this.error)
        }
      }
    } catch (err) {
      console.error('Error saving patient:', err)
      this.error = 'An error occurred while saving patient: ' + (err as Error).message
      alert(this.error)
    }
  }

  resetForm() {
    this.patient = {
      firstName: '',
      lastName: '',
      gender: '',
      birthday: '',
      contactNumber: '',
      occupation: '',
      company: '',
      hmo: '',
      hmoNumber: '',
      validId: '',
      idNumber: ''
    }
    this.error = ''
    this.success = ''
  }
}
