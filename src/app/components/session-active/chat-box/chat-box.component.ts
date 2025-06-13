import { Component, ElementRef, ViewChild, OnInit, OnDestroy } from '@angular/core';
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
  showRecordingPopup = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  recordedAudioUrl: string | null = null;
  micPermissionError: string | null = null;

  private micSubscription: Subscription | undefined;

  constructor(private sessionService: SessionService) {}

  ngOnInit(): void {
    // Example initial messages
    this.messages.push({ id: Date.now(), text: 'Hello! How can I assist you with the report today?', sender: 'ai', type: 'text', timestamp: new Date() });
    this.scrollToBottom();

    this.micSubscription = this.sessionService.micEnabled$.subscribe(enabled => {
      if (!enabled) {
        this.micPermissionError = 'Microphone access is not enabled. Please enable it in the session start screen or browser settings.';
      } else {
        this.micPermissionError = null;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.micSubscription) {
      this.micSubscription.unsubscribe();
    }
    // this.stopRecording(); // Ensure recorder is stopped if component is destroyed
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

  async toggleVoiceRecordingPopup(): Promise<void> {
    if (!this.sessionService.isMicEnabled()) {
      this.micPermissionError = 'Microphone access is required to record audio. Please enable it.';
      // Optionally, guide user back or prompt again if possible from here
      alert(this.micPermissionError);
      return;
    }
    this.micPermissionError = null;

    if (this.showRecordingPopup) { // If popup is open, it means we are stopping/cancelling
      this.cancelRecording(); // Or handle send through another button
    } else {
      this.showRecordingPopup = true;
      // Start recording automatically when popup opens, or have a separate start button in popup
      // For now, let's assume recording starts when popup opens if not already started
      // await this.startRecording(); // This will be triggered by a button inside the popup
    }
  }

  async startRecordingInPopup(): Promise<void> {
    if (this.isRecording) return;
    if (!this.sessionService.isMicEnabled()) {
        this.micPermissionError = 'Microphone access is not enabled.';
        alert(this.micPermissionError);
        this.showRecordingPopup = false;
        return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      this.mediaRecorder.ondataavailable = event => {
        this.audioChunks.push(event.data);
      };
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        this.recordedAudioUrl = URL.createObjectURL(audioBlob);
        // Do not add to messages here, wait for 'send' click from popup
      };
      this.mediaRecorder.start();
      this.isRecording = true;
      this.micPermissionError = null;
    } catch (err) {
      console.error('Error starting recording:', err);
      this.micPermissionError = 'Failed to start recording. Please ensure microphone is connected and permission is granted.';
      this.isRecording = false;
      this.showRecordingPopup = false; // Close popup on error
    }
  }

  stopRecordingAndPrepareToSend(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      // recordedAudioUrl is set in onstop
    }
  }

  sendRecordedAudio(): void {
    if (this.recordedAudioUrl && this.audioChunks.length > 0) {
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
      this.messages.push({
        id: Date.now(),
        text: null,
        sender: 'user',
        type: 'audio',
        audioUrl: this.recordedAudioUrl,
        audioBlob: audioBlob,
        timestamp: new Date()
      });
      this.scrollToBottomAfterUpdate();
      this.resetRecordingState();
      // Simulate AI response to audio
      setTimeout(() => {
        this.messages.push({
          id: Date.now(),
          text: 'I received your audio. Let me process that.',
          sender: 'ai',
          type: 'text',
          timestamp: new Date()
        });
        this.scrollToBottomAfterUpdate();
      }, 1000);
    }
  }

  cancelRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop(); // Stop recording without processing
    }
    this.resetRecordingState();
  }

  private resetRecordingState(): void {
    this.isRecording = false;
    this.showRecordingPopup = false;
    this.audioChunks = [];
    this.recordedAudioUrl = null;
    if (this.mediaRecorder && this.mediaRecorder.stream) {
        this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    this.mediaRecorder = null;
  }

  playAudio(message: Message): void {
    if (message.type === 'audio' && message.audioUrl) {
      if (message.isPlaying && this.audioPlayer) {
        this.audioPlayer.nativeElement.pause();
        message.isPlaying = false;
      } else if (this.audioPlayer) {
        this.audioPlayer.nativeElement.src = message.audioUrl;
        this.audioPlayer.nativeElement.play();
        message.isPlaying = true;
        this.messages.forEach(m => { // Stop other audios if playing
          if (m !== message) m.isPlaying = false;
        });
        this.audioPlayer.nativeElement.onended = () => {
          message.isPlaying = false;
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
