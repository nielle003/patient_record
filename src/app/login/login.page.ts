import { Component } from '@angular/core'
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
  IonText
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
    IonText
  ]
})
export class LoginComponent {
  username = ''
  password = ''
  error = ''

  constructor(private userService: UserService, private router: Router) { }

  async login() {
    const valid = await this.userService.login(this.username, this.password)
    if (valid) {
      this.error = ''
      alert('Login successful!')
      this.router.navigate(['/home'])
    } else {
      this.error = 'Invalid username or password'
    }
  }
}