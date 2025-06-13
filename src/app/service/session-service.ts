import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {Router} from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class SessionService {

  private sessionActive = new BehaviorSubject<boolean>(false); // Renamed to remove $ suffix for private subject
  sessionActive$ = this.sessionActive.asObservable(); // Public observable

  private currentFile = new BehaviorSubject<File | null>(null); // Renamed to remove $ suffix for private subject
  currentFile$ = this.currentFile.asObservable(); // Public observable

  private micEnabled = new BehaviorSubject<boolean>(false);
  micEnabled$ = this.micEnabled.asObservable();

  constructor(private router: Router) {
  }

  startSession(file: File): void {
    this.sessionActive.next(true);
    this.currentFile.next(file);
    console.log('Session started with file:', file.name);

    //  navigate to /session-active
    this.router.navigate(['/session-active']);
  }

  endSession(): void {
    this.sessionActive.next(false);
    this.currentFile.next(null);
    console.log('Session ended');

    //  navigate to /
    this.router.navigate(['/']);
  }

  isSessionActive(): boolean {
    return this.sessionActive.value;
  }

  // Getter for the current file, if needed by components
  getCurrentFile(): File | null {
    return this.currentFile.value;
  }

  setMicStatus(status: boolean): void {
    this.micEnabled.next(status);
  }

  isMicEnabled(): boolean {
    return this.micEnabled.value;
  }
}
