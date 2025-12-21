import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonCard, IonCardContent, IonTitle, IonIcon, IonContent } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { add, people, calendar, save } from 'ionicons/icons';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [CommonModule, IonCard, IonCardContent, IonIcon, IonHeader, IonToolbar, IonTitle, IonContent],
})
export class HomePage {
  constructor(private router: Router) {
    addIcons({ add, people, calendar, save });
  }

  async patientRecords() {
    this.router.navigate(['/addpatient']);
  }
  async viewPatients() {
    this.router.navigate(['/viewpatient']);
  }

  async addVisit() {
    this.router.navigate(['/addvisit']);
  }

  async backup() {
    this.router.navigate(['/backup']);
  }
}
