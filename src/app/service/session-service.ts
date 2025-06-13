import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {Router} from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class SessionService {

  private sessionActive$ = new BehaviorSubject<boolean>(false);
  private currentFile$ = new BehaviorSubject<File | null>(null);

  constructor(private router: Router) {
  }

  startSession(file: File): void {
    this.sessionActive$.next(true);
    this.currentFile$.next(file);
    console.log('Session started with file:', file.name);

    //  navigate to /session-active
    this.router.navigate(['/session-active']);
  }

  endSession(): void {
    this.sessionActive$.next(false);
    this.currentFile$.next(null);
    console.log('Session ended');

    //  navigate to /start-new-session
    this.router.navigate(['/start-new-session']);
  }

  isSessionActive(): boolean {
    return this.sessionActive$.value;
  }

}
