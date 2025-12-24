import { Component, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { Router, RouterModule } from '@angular/router'
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonText,
  IonIcon,
  IonCardContent,
  IonCard
} from '@ionic/angular/standalone'
import { UserService } from '../services/user'


@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonText,
    IonIcon,
    IonCardContent,
    IonCard
  ]
})
export class LoginComponent implements OnInit {
  username = ''
  password = ''
  error = ''

  constructor(private userService: UserService, private router: Router) { }

  ngOnInit() {
    const today = new Date()

    if (today.getDate() === 15) {
      alert('📅 Monthly Backup Reminder\n\nIt\'s the 15th of the month! Don\'t forget to backup your patient records.\n\nGo to Backup page > Export tables.')
    }
  }

  async login() {
    try {

      const valid = await this.userService.login(this.username, this.password)

      if (valid) {
        this.error = ''
        alert('Login successful!')
        this.router.navigate(['/home'])
      } else {
        this.error = 'Invalid username or password'
      }
    } catch (error) {
      console.error('❌ Login error:', error)
      alert('Login failed: ' + (error as Error).message)
      this.error = 'Login failed: ' + (error as Error).message
    }
  }
}