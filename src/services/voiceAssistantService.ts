/**
 * VERIFY Voice-First Assistant Service
 * Natural language voice interaction for departure checks, item queries, and hands-free verification.
 * Uses Web Speech Recognition with interactive command options + SpeechSynthesis.
 */

import { ChecklistItem, VoiceAssistantState } from '../types';

export type VoiceCommandHandler = (action: {
  type: 'CHECK_HOME' | 'CHECK_ITEM' | 'WHATS_LEFT' | 'MARK_DONE' | 'FINISHED' | 'UNKNOWN';
  targetItemName?: string;
  transcript: string;
  reply: string;
}) => void;

export class VoiceAssistantService {
  private recognition: any = null;
  private isListening: boolean = false;
  private isSpeaking: boolean = false;
  private stateListeners: Set<(state: VoiceAssistantState) => void> = new Set();
  private commandHandlers: Set<VoiceCommandHandler> = new Set();

  private currentState: VoiceAssistantState = {
    isListening: false,
    isSpeaking: false,
    transcript: '',
    response: 'Tap the mic or say "Check my home" to start.',
  };

  constructor() {
    this.initSpeechRecognition();
  }

  private initSpeechRecognition() {
    if (typeof window === 'undefined') return;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        this.recognition = new SpeechRec();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
          this.isListening = true;
          this.updateState({ isListening: true, transcript: 'Listening...' });
        };

        this.recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          this.handleTranscript(transcript);
        };

        this.recognition.onerror = (event: any) => {
          console.warn('Speech recognition notice:', event.error);
          this.isListening = false;
          this.updateState({
            isListening: false,
            error: event.error === 'not-allowed' ? 'Mic permission not granted. You can use quick voice buttons below.' : null,
          });
        };

        this.recognition.onend = () => {
          this.isListening = false;
          this.updateState({ isListening: false });
        };
      } catch (e) {
        console.warn('Could not initialize SpeechRecognition:', e);
      }
    }
  }

  public isSupported(): boolean {
    return Boolean(this.recognition || (typeof window !== 'undefined' && 'speechSynthesis' in window));
  }

  public getState(): VoiceAssistantState {
    return { ...this.currentState };
  }

  public subscribeState(listener: (state: VoiceAssistantState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  public onCommand(handler: VoiceCommandHandler): () => void {
    this.commandHandlers.add(handler);
    return () => this.commandHandlers.delete(handler);
  }

  public startListening(): boolean {
    if (this.recognition && !this.isListening) {
      try {
        this.recognition.start();
        return true;
      } catch (e) {
        console.warn('Error starting speech recognition:', e);
      }
    }
    this.updateState({
      isListening: true,
      transcript: 'Listening...',
    });
    return true;
  }

  public stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
    this.isListening = false;
    this.updateState({ isListening: false });
  }

  /**
   * Directly inject a voice command (used by mic transcription or quick voice prompts)
   */
  public processCommand(commandText: string, currentItems: ChecklistItem[]) {
    this.handleTranscript(commandText, currentItems);
  }

  private handleTranscript(rawTranscript: string, fallbackItems?: ChecklistItem[]) {
    const text = rawTranscript.trim().toLowerCase();
    this.updateState({ transcript: rawTranscript, isListening: false });

    // Retrieve active items
    const items = fallbackItems || [];
    const unverified = items.filter((i) => !i.lastVerified?.verified);
    const criticalUnverified = unverified.filter((i) => i.importance === 'CRITICAL');

    let reply = '';
    let actionType: 'CHECK_HOME' | 'CHECK_ITEM' | 'WHATS_LEFT' | 'MARK_DONE' | 'FINISHED' | 'UNKNOWN' = 'UNKNOWN';
    let targetItemName: string | undefined;

    if (text.includes('check my home') || text.includes('what do i need to check') || text.includes("left home") || text.includes('status')) {
      actionType = 'CHECK_HOME';
      if (unverified.length === 0) {
        reply = 'All configured items are verified. Your home is secured!';
      } else {
        const topItem = criticalUnverified[0] || unverified[0];
        reply = `You have ${unverified.length} ${unverified.length === 1 ? 'item' : 'items'} to check. Your ${topItem.object} is the highest-priority item.`;
      }
    } else if (text.includes('check the ac') || text.includes('check ac') || text.includes('air conditioner')) {
      actionType = 'CHECK_ITEM';
      targetItemName = 'Air Conditioner';
      reply = 'Opening camera verification for the Air Conditioner.';
    } else if (text.includes('check the stove') || text.includes('check stove') || text.includes('gas stove')) {
      actionType = 'CHECK_ITEM';
      targetItemName = 'Gas Stove';
      reply = 'Opening camera verification for your Gas Stove.';
    } else if (text.includes('check the door') || text.includes('check door') || text.includes('main door')) {
      actionType = 'CHECK_ITEM';
      targetItemName = 'Main Door';
      reply = 'Opening verification for your Main Entrance Door.';
    } else if (text.includes('check the window') || text.includes('check window')) {
      actionType = 'CHECK_ITEM';
      targetItemName = 'Window';
      reply = 'Opening verification for your Windows.';
    } else if (text.includes("what's left") || text.includes('what is left') || text.includes('remaining')) {
      actionType = 'WHATS_LEFT';
      if (unverified.length === 0) {
        reply = 'Nothing left to check! All items are safe and verified.';
      } else {
        const names = unverified.slice(0, 3).map((i) => i.object).join(', ');
        reply = `You still have ${unverified.length} unverified: ${names}.`;
      }
    } else if (text.includes('mark this as done') || text.includes('mark done') || text.includes('mark as done')) {
      actionType = 'MARK_DONE';
      reply = 'Marked item as manually verified.';
    } else if (text.includes("i'm finished") || text.includes('finished') || text.includes('all done')) {
      actionType = 'FINISHED';
      reply = unverified.length === 0
        ? 'Great! Your home is completely secured. Safe travels!'
        : `Warning: You still have ${unverified.length} items needing attention before leaving.`;
    } else {
      // General item search
      const match = items.find((i) => text.includes(i.object.toLowerCase()));
      if (match) {
        actionType = 'CHECK_ITEM';
        targetItemName = match.object;
        reply = `Opening camera verification for ${match.object}.`;
      } else {
        reply = `I heard: "${rawTranscript}". You can say "Check my home", "Check the stove", or "What's left?"`;
      }
    }

    this.updateState({
      response: reply,
      lastCommand: rawTranscript,
    });

    this.speak(reply);

    // Notify command handlers
    this.commandHandlers.forEach((handler) =>
      handler({
        type: actionType,
        targetItemName,
        transcript: rawTranscript,
        reply,
      })
    );
  }

  public speak(text: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        this.isSpeaking = true;
        this.updateState({ isSpeaking: true });
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.updateState({ isSpeaking: false });
      };

      utterance.onerror = () => {
        this.isSpeaking = false;
        this.updateState({ isSpeaking: false });
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }

  public stopSpeaking() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking = false;
    this.updateState({ isSpeaking: false });
  }

  private updateState(partial: Partial<VoiceAssistantState>) {
    this.currentState = { ...this.currentState, ...partial };
    this.stateListeners.forEach((cb) => cb(this.getState()));
  }
}

export const voiceAssistantService = new VoiceAssistantService();
