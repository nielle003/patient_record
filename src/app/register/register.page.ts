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
  IonButtons,
  IonIcon,
  IonBackButton,
  IonCard,
  IonCardContent
} from '@ionic/angular/standalone';
import { UserService } from '../services/user';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
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
    IonButtons,
    IonIcon,
    IonBackButton,
    IonCard,
    IonCardContent
  ]
})
export class RegisterPage implements OnInit {
  username = ''
  password = ''
  confirmPassword = ''
  error = ''
  success = ''

  constructor(
    private userService: UserService,
    private router: Router
  ) { }

  ngOnInit() {
  }

  async register() {
    this.error = ''
    this.success = ''

    if (!this.username || !this.password || !this.confirmPassword) {
      this.error = 'Please fill in all fields'
      return
    }

    if (this.password !== this.confirmPassword) {
      this.error = 'Passwords do not match'
      return
    }

    if (this.password.length < 4) {
      this.error = 'Password must be at least 4 characters'
      return
    }

    try {
      const userId = await this.userService.register(this.username, this.password)
      if (userId > 0) {
        this.success = 'Registration successful! Redirecting to login...'
        setTimeout(() => {
          this.router.navigate(['/login'])
        }, 1500)
      } else {
        this.error = 'Registration failed. Username may already exist.'
      }
    } catch (err) {
      this.error = 'Registration failed. Please try again.'
    }
  }

}
