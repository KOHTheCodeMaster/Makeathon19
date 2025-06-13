import {Component, OnDestroy, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Router} from '@angular/router';
import {SessionService} from '../../service/session-service';
import {LeftSidePanelComponent} from './left-side-panel/left-side-panel.component';
import {Subscription} from 'rxjs';
import {ChatBoxComponent} from './chat-box/chat-box.component';

@Component({
  selector: 'app-session-active',
  standalone: true,
  imports: [CommonModule, LeftSidePanelComponent, ChatBoxComponent],
  templateUrl: './session-active.component.html'
})
export class SessionActiveComponent implements OnInit, OnDestroy {
  private sessionSubscription: Subscription | undefined;

  constructor(private sessionService: SessionService,
              private router: Router) {
  }

  ngOnInit(): void {
    // Redirect if no active session
    this.sessionSubscription = this.sessionService.sessionActive$.subscribe(isActive => {
      if (!isActive) {
        this.router.navigate(['/']); // Redirect to home/start new session page
      }
    });
  }

  ngOnDestroy(): void {
    if (this.sessionSubscription) {
      this.sessionSubscription.unsubscribe();
    }
  }
}
