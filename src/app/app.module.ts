import { BrowserModule } from '@angular/platform-browser';
import {APP_INITIALIZER, NgModule} from '@angular/core';
import { AppComponent } from './app.component';
import {ConfigModule, ConfigService, configurationServiceInitializerFactory} from './config/index';
import {HttpClient} from '@angular/common/http';
import {PeopleService} from './people.service';


@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    ConfigModule
  ],
  providers: [
    ConfigService,
    { provide: APP_INITIALIZER, useFactory: configurationServiceInitializerFactory, deps: [ConfigService], multi: true },
    HttpClient,
    PeopleService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
