import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Router} from '@angular/router';
import {SessionService} from '../../../service/session-service';

@Component({
  selector: 'app-left-side-panel',
  imports: [CommonModule],
  templateUrl: './left-side-panel.component.html'
})
export class LeftSidePanelComponent {

  constructor(private sessionService: SessionService,
              private router: Router) {
  }

}
