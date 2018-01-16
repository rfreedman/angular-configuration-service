import {Injectable} from '@angular/core';
import {Person} from './person';
import {Observable} from 'rxjs/Observable';
import {HttpClient} from '@angular/common/http';
import {ConfigService} from './config';

@Injectable()
export class PeopleService {

  private peopleApiUrl: string;

  constructor(private http: HttpClient, private configService: ConfigService) {
    this.peopleApiUrl = `${this.configService.getConfig().apiUrl}/people.json`;
  }

  public getPeople(): Observable<Person[]> {
    return this.http.get<Person[]>(this.peopleApiUrl);
  }
}
