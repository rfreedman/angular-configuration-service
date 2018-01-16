import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {configurationServiceInitializerFactory, ConfigService} from './config.service';
import {HttpClientModule} from '@angular/common/http';

@NgModule({
  imports: [
    CommonModule,
    HttpClientModule
  ]
})
export class ConfigModule { }
export {configurationServiceInitializerFactory, ConfigService};

