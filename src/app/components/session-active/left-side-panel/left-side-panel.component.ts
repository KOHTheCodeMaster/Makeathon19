import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { SessionService } from '../../../service/session-service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-left-side-panel',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './left-side-panel.component.html'
})
export class LeftSidePanelComponent implements OnInit, OnDestroy {
  reportTitle: string = 'Report';
  summary: string = 'This is a brief summary of the report content. Details will be extracted and shown here.';
  private fileSubscription: Subscription | undefined;

  constructor(
    private sessionService: SessionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.fileSubscription = this.sessionService.currentFile$.subscribe(file => {
      if (file) {
        this.reportTitle = file.name;
      } else {
        this.reportTitle = 'Report';
      }
    });
  }

  endSession(): void {
    this.sessionService.endSession();
  }

  ngOnDestroy(): void {
    if (this.fileSubscription) {
      this.fileSubscription.unsubscribe();
    }
  }
}
