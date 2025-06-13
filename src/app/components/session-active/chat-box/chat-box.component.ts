import { Component, ElementRef, ViewChild, OnInit, OnDestroy, NgZone } from '@angular/core'; // Added NgZone
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { SessionService } from '../../../service/session-service';
import { Subscription } from 'rxjs';

interface Message {
  id: number;
  text: string | null;
  sender: 'user' | 'ai';
  type: 'text' | 'audio';
  audioUrl?: string;
  audioBlob?: Blob;
  isPlaying?: boolean;
  timestamp: Date;
}

@Component({
  selector: 'app-chat-box',
  standalone: true,
  imports: [CommonModule, FormsModule], // Add FormsModule
  templateUrl: './chat-box.component.html',
  styleUrls: ['./chat-box.component.css'] // Added for component-specific styles if needed beyond Tailwind
})
export class ChatBoxComponent implements OnInit, OnDestroy {
  @ViewChild('chatMessagesContainer') private chatMessagesContainer!: ElementRef;
  @ViewChild('audioPlayer') private audioPlayer!: ElementRef<HTMLAudioElement>;

  messages: Message[] = [];
  newMessage: string = '';
  isRecording = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  micPermissionError: string | null = null;

  recordingTimerInterval: any;
  recordingTime: number = 0; // in seconds

  private micSubscription: Subscription | undefined;
  private wasCancelledManually = false; // Flag to indicate if recording was cancelled by user

  constructor(private sessionService: SessionService, private zone: NgZone) {} // Injected NgZone

  ngOnInit(): void {
    // Example initial messages
    this.messages.push({ id: Date.now(), text: 'Hello! How can I assist you with the report today?', sender: 'ai', type: 'text', timestamp: new Date() });
    this.scrollToBottom();

    this.micSubscription = this.sessionService.micEnabled$.subscribe(enabled => {
      if (!enabled) {
        this.micPermissionError = 'Microphone access is not enabled. Please enable it in your browser settings or at the start of the session.';
        if (this.isRecording) {
          // If mic access is lost during recording, treat it as a cancellation.
          this.cancelCurrentRecording();
        }
      } else {
        this.micPermissionError = null;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.micSubscription) {
      this.micSubscription.unsubscribe();
    }
    this.stopTimer();
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.wasCancelledManually = true; // Ensure it doesn't try to send if destroyed mid-recording
      this.mediaRecorder.stop();
    }
    if (this.mediaRecorder && this.mediaRecorder.stream) {
        this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  }

  sendMessage(): void {
    if (this.newMessage.trim()) {
      this.messages.push({
        id: Date.now(),
        text: this.newMessage.trim(),
        sender: 'user',
        type: 'text',
        timestamp: new Date()
      });
      this.newMessage = '';
      this.scrollToBottomAfterUpdate();
      // Simulate AI response
      setTimeout(() => {
        this.messages.push({
          id: Date.now(),
          text: 'Thanks for your message. I am processing your request.',
          sender: 'ai',
          type: 'text',
          timestamp: new Date()
        });
        this.scrollToBottomAfterUpdate();
      }, 1000);
    }
  }

  async handleVoiceButtonClick(): Promise<void> {
    if (!this.sessionService.isMicEnabled()) {
      this.micPermissionError = 'Microphone access is required to record audio. Please enable it.';
      return;
    }
    this.micPermissionError = null;

    // This button only starts recording now. Stop/Send/Cancel are separate.
    if (!this.isRecording) {
      await this.startRecording();
    }
  }

  async startRecording(): Promise<void> {
    if (this.isRecording) return;
    if (!this.sessionService.isMicEnabled()) {
        this.micPermissionError = 'Microphone access is not enabled.';
        return;
    }
    this.wasCancelledManually = false; // Reset flag for new recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = event => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = () => {
        this.zone.run(() => { // Wrap in NgZone.run
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
          const audioUrl = URL.createObjectURL(audioBlob);

          if (!this.wasCancelledManually) {
            const newAudioMessage: Message = {
              id: Date.now(),
              text: null,
              sender: 'user',
              type: 'audio',
              audioUrl: audioUrl,
              audioBlob: audioBlob,
              timestamp: new Date()
            };
            this.messages = [...this.messages, newAudioMessage];

            this.scrollToBottomAfterUpdate();

            // Simulate AI response to audio
            // setTimeout is already patched by zone.js, so explicit zone.run might not be strictly necessary here
            // but it doesn't hurt for clarity if issues were suspected.
            setTimeout(() => {
              const aiResponseMessage: Message = {
                id: Date.now(),
                text: 'I received your audio. Let me process that.',
                sender: 'ai',
                type: 'text',
                timestamp: new Date()
              };
              this.messages = [...this.messages, aiResponseMessage];
              this.scrollToBottomAfterUpdate();
            }, 1000);
          } else {
            URL.revokeObjectURL(audioUrl);
          }
          // Reset state regardless of cancel/send
          this.resetRecordingState(this.wasCancelledManually);
          this.wasCancelledManually = false; // Reset flag
        }); // End of NgZone.run
      };

      this.mediaRecorder.start();
      // UI updates after starting recorder should be in zone if they weren't already triggered by an event
      this.zone.run(() => {
        this.isRecording = true;
        this.micPermissionError = null;
      });
      this.startTimer(); // Timer updates UI, ensure its callbacks are zoned if they directly manipulate component state not via async pipe

    } catch (err) {
      this.zone.run(() => { // Also wrap error handling that changes component state
        console.error('Error starting recording:', err);
        this.micPermissionError = 'Failed to start recording. Please ensure microphone is connected and permission is granted.';
        this.isRecording = false;
        this.stopTimer();
        this.resetRecordingState(true);
      });
    }
  }

  // This method is now effectively "Send"
  stopAndSendRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.wasCancelledManually = false;
      this.mediaRecorder.stop(); // onstop will handle the rest within NgZone
      // UI state changes that should be immediate and reflect the action of stopping
      this.zone.run(() => {
        this.isRecording = false;
      });
      this.stopTimer();
    }
  }

  cancelCurrentRecording(): void {
    this.wasCancelledManually = true;
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop(); // onstop will handle the rest within NgZone
    } else {
      this.zone.run(() => { // Ensure UI reset is in zone if not going through onstop
         this.resetRecordingState(true);
      });
    }
    // UI state changes that should be immediate
    this.zone.run(() => {
        this.isRecording = false;
    });
    this.stopTimer();
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      this.zone.run(() => { // Ensure UI reset is in zone
          this.resetRecordingState(true);
      });
    }
  }

  private resetRecordingState(stopTracks: boolean): void {
    this.isRecording = false; // Ensure this is set
    this.audioChunks = [];
    // this.recordedAudioUrl = null; // No longer used for preview
    // this.recordedAudioBlob = null; // No longer used for preview
    this.stopTimer(); // Ensure timer is stopped
    this.recordingTime = 0;

    if (this.mediaRecorder && this.mediaRecorder.stream && stopTracks) {
        this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    if (stopTracks) {
        this.mediaRecorder = null; // Dispose of MediaRecorder if tracks are stopped
    }
  }

  private startTimer(): void {
    this.recordingTime = 0;
    this.stopTimer(); // Clear any existing timer
    this.recordingTimerInterval = setInterval(() => {
      this.zone.run(() => { // Ensure timer updates are in Angular's zone
        this.recordingTime++;
      });
    }, 1000);
  }

  private stopTimer(): void {
    if (this.recordingTimerInterval) {
      clearInterval(this.recordingTimerInterval);
      this.recordingTimerInterval = null;
    }
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  playAudio(message: Message): void {
    if (message.type === 'audio' && message.audioUrl) {
      // Stop any currently playing audio first
      this.messages.forEach(m => {
        if (m.isPlaying && m.id !== message.id) {
          m.isPlaying = false;
        }
      });
      if (this.audioPlayer && this.audioPlayer.nativeElement.src === message.audioUrl && !this.audioPlayer.nativeElement.paused) {
        this.audioPlayer.nativeElement.pause();
        message.isPlaying = false;
      } else if (this.audioPlayer) {
        this.audioPlayer.nativeElement.src = message.audioUrl;
        this.audioPlayer.nativeElement.play()
          .then(() => message.isPlaying = true)
          .catch(e => {
            console.error("Error playing audio:", e);
            message.isPlaying = false; // Ensure isPlaying is false on error
          });

        this.audioPlayer.nativeElement.onended = () => {
          message.isPlaying = false;
          // Force change detection if necessary, though direct property binding should handle it
        };
        this.audioPlayer.nativeElement.onpause = () => { // Also handle pause from controls
            if (this.audioPlayer.nativeElement.src === message.audioUrl) {
                 message.isPlaying = false;
            }
        };
      }
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.chatMessagesContainer) {
        this.chatMessagesContainer.nativeElement.scrollTop = this.chatMessagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  private scrollToBottomAfterUpdate(): void {
    // Wait for the DOM to update then scroll
    setTimeout(() => this.scrollToBottom(), 0);
  }
}
