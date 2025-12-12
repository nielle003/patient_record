import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./register/register.page').then(m => m.RegisterPage)
  },
  {
    path: 'addpatient',
    loadComponent: () => import('./addpatient/addpatient.page').then(m => m.AddpatientPage)
  },
  {
    path: 'addpatient/:id',
    loadComponent: () => import('./addpatient/addpatient.page').then(m => m.AddpatientPage)
  },
  {
    path: 'viewpatient',
    loadComponent: () => import('./viewpatient/viewpatient.page').then(m => m.ViewpatientPage)
  },
  {
    path: 'addvisit',
    loadComponent: () => import('./addvisit/addvisit.page').then(m => m.AddvisitPage)
  },
  {
    path: 'backup',
    loadComponent: () => import('./backup/backup.page').then(m => m.BackupPage)
  },
];
