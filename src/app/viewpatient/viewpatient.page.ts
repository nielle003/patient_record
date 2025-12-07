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
  IonSearchbar
} from '@ionic/angular/standalone';
import { PatientService, Patient } from '../services/patient';
import { VisitService, Visit } from '../services/visit';

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
    IonSearchbar
  ]
})
export class ViewpatientPage implements OnInit {
  patients: Patient[] = []
  filteredPatients: Patient[] = []
  selectedPatient: Patient | null = null
  visits: Visit[] = []
  searchTerm = ''

  constructor(
    private patientService: PatientService,
    private visitService: VisitService,
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
