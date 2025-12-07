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
    occupation: '',
    company: '',
    hmo: '',
    hmoNumber: '',
    validId: '',
    idNumber: ''
  }

  error = ''
  success = ''

  constructor(
    private patientService: PatientService,
    private router: Router
  ) { }

  ngOnInit() {
  }

  async addPatient() {
    this.error = ''
    this.success = ''

    // Validate required fields
    if (!this.patient.firstName || !this.patient.lastName || !this.patient.gender || !this.patient.birthday) {
      this.error = 'Please fill in all required fields (Name, Gender, Birthday)'
      return
    }

    try {
      const patientId = await this.patientService.addPatient(this.patient)
      if (patientId > 0) {
        this.success = 'Patient added successfully!'
        await alert(this.success)
        setTimeout(() => {
          this.router.navigate(['/home'])
        }, 1500)
      } else {
        this.error = 'Failed to add patient'
        await alert(this.error)
      }
    } catch (err) {
      console.error('Error adding patient:', err)
      this.error = 'An error occurred while adding patient'
    }
  }

  resetForm() {
    this.patient = {
      firstName: '',
      lastName: '',
      gender: '',
      birthday: '',
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
