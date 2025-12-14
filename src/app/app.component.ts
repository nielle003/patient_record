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
  constructor(
    private platform: Platform,
    private databaseService: DatabaseService
  ) { }

  async ngOnInit() {
    await this.platform.ready();
    await this.setupAppLifecycle();
  }

  private async setupAppLifecycle() {
    // Handle app state changes
    App.addListener('pause', async () => {
      console.log('App paused - closing database');
      await this.databaseService.close();
    });

    App.addListener('resume', async () => {
      console.log('App resumed - reopening database');
      await this.databaseService.init();
    });

    // Handle app termination
    App.addListener('appStateChange', async (state) => {
      if (!state.isActive) {
        await this.databaseService.close();
      }
    });
  }

  async ngOnDestroy() {
    await this.databaseService.close();
  }
}
