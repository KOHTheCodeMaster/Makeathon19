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

    selectedFile: File | null = null;
    errorMessage: string | null = null;
    isDragOver = false;

    constructor(private sessionService: SessionService,
                private router: Router) {
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
        if (this.selectedFile && !this.errorMessage) {
            // Proceed to start the session
            this.sessionService.startSession(this.selectedFile); // Pass the file if needed by the service
            // this.router.navigate(['/session-active']); // Or wherever the session takes place
            // For now, just update the BehaviorSubject as requested
            // The actual navigation or further steps would depend on the app flow
        }
    }
}
