import { bootstrapApplication } from '@angular/platform-browser'
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router'
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone'
import { defineCustomElements as jeepSqlite } from 'jeep-sqlite/loader'

import { routes } from './app/app.routes'
import { AppComponent } from './app/app.component'
import { DatabaseService } from './app/services/database'

// Initialize jeep-sqlite web component
jeepSqlite(window)

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    DatabaseService
  ],
}).catch(err => console.error(err))
