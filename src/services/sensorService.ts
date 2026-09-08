/**
 * VERIFY Phone Sensor Intelligence Service
 * Interacts with genuine device sensors (motion, orientation, microphone acoustics, ambient light).
 * Feeds physical device telemetry into verification confidence (e.g. camera stability score, acoustic hum).
 */

import { PhoneSensorData } from '../types';

export class PhoneSensorService {
  private currentData: PhoneSensorData = {
    ambientLightLux: 240,
    deviceMotionMagnitude: 0.05,
    isDeviceStill: true,
    acousticLevelDb: -42,
    orientationAlpha: 0,
    orientationBeta: 45,
    orientationGamma: 0,
    timestamp: Date.now(),
  };

  private motionHistory: number[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private isListeningAudio: boolean = false;
  private listeners: Set<(data: PhoneSensorData) => void> = new Set();

  constructor() {
    this.initSensors();
  }

  private initSensors() {
    if (typeof window === 'undefined') return;

    // Device motion listener
    if ('DeviceMotionEvent' in window) {
      window.addEventListener('devicemotion', (e: DeviceMotionEvent) => {
        const acc = e.accelerationIncludingGravity || e.acceleration;
        if (acc) {
          const x = acc.x || 0;
          const y = acc.y || 0;
          const z = acc.z || 0;
          const mag = Math.sqrt(x * x + y * y + z * z);
          
          this.motionHistory.push(mag);
          if (this.motionHistory.length > 10) this.motionHistory.shift();

          // Check standard deviation / stillness
          const avg = this.motionHistory.reduce((a, b) => a + b, 0) / this.motionHistory.length;
          const variance = this.motionHistory.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / this.motionHistory.length;
          const isStill = variance < 0.25;

          this.currentData.deviceMotionMagnitude = Math.round(variance * 100) / 100;
          this.currentData.isDeviceStill = isStill;
          this.currentData.timestamp = Date.now();
          this.notify();
        }
      });
    }

    // Device orientation listener
    if ('DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', (e: DeviceOrientationEvent) => {
        this.currentData.orientationAlpha = Math.round(e.alpha || 0);
        this.currentData.orientationBeta = Math.round(e.beta || 0);
        this.currentData.orientationGamma = Math.round(e.gamma || 0);
        this.currentData.timestamp = Date.now();
        this.notify();
      });
    }
  }

  /**
   * Start listening to microphone for acoustic verification (e.g. humming of active AC or running water)
   */
  public async startAcousticMonitoring(): Promise<boolean> {
    if (this.isListeningAudio) return true;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return false;

      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);
      this.isListeningAudio = true;

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!this.isListeningAudio || !this.analyser) return;
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        // Approximate dB: -70 (quiet) to -10 (loud)
        this.currentData.acousticLevelDb = Math.round(-70 + (avg / 255) * 60);
        this.notify();
        requestAnimationFrame(checkVolume);
      };
      checkVolume();
      return true;
    } catch (e) {
      console.warn('Acoustic monitoring not available or microphone permission declined.');
      return false;
    }
  }

  public stopAcousticMonitoring() {
    this.isListeningAudio = false;
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }

  public updateAmbientLightFromFrame(luxEstimate: number) {
    this.currentData.ambientLightLux = Math.round(luxEstimate);
    this.notify();
  }

  public getSensorData(): PhoneSensorData {
    return { ...this.currentData };
  }

  public subscribe(cb: (data: PhoneSensorData) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    const copy = this.getSensorData();
    this.listeners.forEach((cb) => cb(copy));
  }
}

export const phoneSensorService = new PhoneSensorService();
