import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs/Observable';
import {EMPTY} from 'rxjs';
import 'rxjs/add/operator/delay';
import 'rxjs/add/operator/catch';
import 'rxjs/add/observable/empty';
import 'rxjs/add/observable/of';

export function configurationServiceInitializerFactory(configurationService: ConfigService): Function {
  // a lambda is required here, otherwise `this` won't work inside ConfigurationService::load
  return () => configurationService.load();
}

@Injectable()
export class ConfigService {

  private loaded = false;
  private configuration: any;

  constructor(private http: HttpClient) {
  }

  public getConfig(): any {
    return this.configuration;
  }


  // the return value (Promise) of this method is used as an APP_INITIALIZER,
  // so the application's initialization will not complete until the Promise resolves.
  public load(): Promise<any> {
    if(this.loaded) {
      return Observable.of(this, this.configuration).toPromise();
    } else {
      const configurationObservable = this.http.get(`config/ui-config.json`); // path is relative to that for app's index.html
      configurationObservable
        .catch(error => {
          console.log(`error loading configuration: ${JSON.stringify(error)}`);
          return EMPTY;
        })
        .subscribe(config => {
            this.configuration = config;
            console.log(`got configuration: ${JSON.stringify(this.configuration)}`);
            this.loaded = true;
          }
        );
      return configurationObservable.toPromise();
    }
  }

}
