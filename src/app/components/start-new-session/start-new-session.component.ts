import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Router, RouterLink} from '@angular/router';
import {SessionService} from '../../service/session-service'; // Assuming path

@Component({
    selector: 'app-start-new-session',
    standalone: true, // Add standalone: true
    imports: [CommonModule, RouterLink], // Add CommonModule and RouterLink
    templateUrl: './start-new-session.component.html'
})
export class StartNewSessionComponent {

    protected readonly navigator = navigator;

    selectedFile: File | null = null;
    errorMessage: string | null = null;
    micErrorMessage: string | null = null;
    isDragOver = false;
    micPermissionStatus: 'prompt' | 'granted' | 'denied' | 'unavailable' = 'prompt';

    constructor(private sessionService: SessionService,
                private router: Router) {
    }

    ngOnInit(): void {
      this.checkMicPermission();
    }

    async checkMicPermission(requestIfPrompt: boolean = false): Promise<void> {
      this.micErrorMessage = null;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.micPermissionStatus = 'unavailable';
        this.sessionService.setMicStatus(false);
        this.micErrorMessage = 'Microphone access is not available on this browser or device.';
        return;
      }

      try {
        // Check current permission status without prompting, if possible
        // Note: Permissions API for microphone is not universally supported for querying without prompt
        // So, we often have to try getUserMedia to know for sure or rely on a previous attempt.

        if (requestIfPrompt) {
          await navigator.mediaDevices.getUserMedia({ audio: true });
          this.micPermissionStatus = 'granted';
          this.sessionService.setMicStatus(true);
          this.micErrorMessage = null;
        } else {
          // Attempt to check status by a prior grant or by a quick check if supported
          // This is a simplified check; a more robust solution might involve the Permissions API
          // For now, assume we need to prompt or it was already granted/denied
          if (this.sessionService.isMicEnabled()) { // Check if service already knows it's enabled
            this.micPermissionStatus = 'granted';
          }
          // If not explicitly granted or denied, it remains 'prompt' or last known state
        }
      } catch (err) {
        this.sessionService.setMicStatus(false);
        if (err instanceof Error && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
          this.micPermissionStatus = 'denied';
          this.micErrorMessage = 'Microphone access was denied. Please enable it in your browser settings.';
        } else if (err instanceof Error && err.name === 'NotFoundError') {
          this.micPermissionStatus = 'unavailable';
          this.micErrorMessage = 'No microphone was found. Please ensure a microphone is connected and enabled.';
        } else {
          this.micPermissionStatus = 'unavailable'; // Or some other error state
          this.micErrorMessage = 'Could not access microphone. Please ensure it is not in use by another application and is properly configured.';
          console.error('Error accessing microphone:', err);
        }
      }
    }

    requestMicPermission(): void {
      this.checkMicPermission(true);
    }

    onDragOver(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragOver = true;
    }

    onDragLeave(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragOver = false;
    }

    onDrop(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragOver = false;
        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
            this.handleFile(files[0]);
        }
    }

    private handleFile(file: File): void {
        this.selectedFile = null;
        this.errorMessage = null;
        const allowedTypes = ['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        if (allowedTypes.includes(file.type)) {
            this.selectedFile = file;
        } else {
            this.errorMessage = 'Invalid file type. Please upload a PDF or Excel file only.';
        }
    }

    onFileSelected(event: Event): void {
        const element = event.currentTarget as HTMLInputElement;
        const fileList: FileList | null = element.files;
        if (fileList && fileList.length > 0) {
            this.handleFile(fileList[0]);
        }
    }

    startSession(): void {
        if (this.selectedFile && !this.errorMessage && this.micPermissionStatus === 'granted') {
            this.sessionService.startSession(this.selectedFile);
        } else if (this.micPermissionStatus !== 'granted') {
            this.micErrorMessage = this.micErrorMessage || 'Microphone access is required to start the session.';
            // Optionally, trigger the request again or guide the user
            if (this.micPermissionStatus === 'prompt') {
              this.requestMicPermission();
            }
        }
    }

}
