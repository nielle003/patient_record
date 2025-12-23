import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonApp, IonRouterOutlet, Platform } from '@ionic/angular/standalone';
import { DatabaseService } from './services/database';
import { App } from '@capacitor/app';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit, OnDestroy {
  private appStateListener?: any;

  constructor(
    private platform: Platform,
    private databaseService: DatabaseService
  ) { }

  async ngOnInit() {
    await this.platform.ready();
    await this.databaseService.init();
    await this.setupAppLifecycle();
  }

  private async setupAppLifecycle() {
    // Monitor app state changes for cleanup opportunities
    // Don't close database on pause - keep it open for better UX
    this.appStateListener = await App.addListener('appStateChange', async (state) => {
      if (!state.isActive) {
        console.log('App backgrounded - database remains open');
        // Database stays open for faster resume
        // WAL mode prevents corruption even if app is killed
      } else {
        console.log('App foregrounded');
        // Verify database is still healthy
        const isOpen = await this.databaseService.isOpen();
        if (!isOpen) {
          console.log('Database was closed, reinitializing...');
          await this.databaseService.init();
        }
      }
    });
  }

  async ngOnDestroy() {
    // Clean up listener
    if (this.appStateListener) {
      await this.appStateListener.remove();
    }
    
    // Close database on app destruction
    await this.databaseService.close();
  }
}
