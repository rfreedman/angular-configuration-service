import {Component, OnInit} from '@angular/core';
import {Person} from './person';
import {PeopleService} from './people.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  config: any;
  people: Person[];

  constructor(private peopleService: PeopleService) {
    this.peopleService.getPeople()
      .subscribe(people => this.people = people);
  }
}
