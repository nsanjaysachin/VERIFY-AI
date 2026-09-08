import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, SwitchCamera, Upload, RefreshCw, AlertCircle, Video, Square } from 'lucide-react';

interface CameraViewfinderProps {
  onCapture: (dataUrl: string, label?: string) => void;
  overlayLabel?: string;
  targetExpectedState?: string;
  isVerifying?: boolean;
}

export const CameraViewfinder: React.FC<CameraViewfinderProps> = ({
  onCapture,
  overlayLabel,
  targetExpectedState,
  isVerifying = false,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [flashEffect, setFlashEffect] = useState<boolean>(false);

  // Video walkthrough recording state
  const [captureMode, setCaptureMode] = useState<'VIDEO' | 'PHOTO'>('VIDEO');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const recordingTimerRef = useRef<any>(null);
  const frameSamplerRef = useRef<any>(null);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not supported in this browser environment.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      let message = 'Unable to access camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Camera permission was denied. You can still upload photos or use test samples.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No camera hardware found on this device.';
      }
      setCameraError(message);
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      clearInterval(recordingTimerRef.current);
      clearInterval(frameSamplerRef.current);
    };
  }, [facingMode]);

  const toggleCamera = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  const grabCurrentFrame = useCallback((labelPrefix = 'Walkthrough Room') => {
    if (!videoRef.current) return null;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      return dataUrl;
    }
    return null;
  }, []);

  const handleCapture = () => {
    setIsCapturing(true);
    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 200);

    const frame = grabCurrentFrame();
    if (frame) {
      onCapture(frame, overlayLabel || 'Camera Capture');
    }
    setIsCapturing(false);
  };

  // Video recording walkthrough logic
  const handleToggleVideoRecording = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
      clearInterval(frameSamplerRef.current);
      // Grab a final frame at stop
      const finalFrame = grabCurrentFrame('Video Walkthrough End');
      if (finalFrame) {
        onCapture(finalFrame, `Walkthrough Completed (${recordingSeconds}s)`);
      }
    } else {
      // Start recording
      setIsRecording(true);
      setRecordingSeconds(0);

      // Grab initial frame immediately
      const initialFrame = grabCurrentFrame('Walkthrough Entry');
      if (initialFrame) {
        onCapture(initialFrame, 'Walkthrough Start');
      }

      // Increment second timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);

      // Sample a frame every 2 seconds as user walks around the house
      frameSamplerRef.current = setInterval(() => {
        const sampleFrame = grabCurrentFrame();
        if (sampleFrame) {
          onCapture(sampleFrame, `Walkthrough Frame`);
        }
      }, 2000);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onCapture(event.target.result as string, file.name);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
      {/* Viewfinder Video Area */}
      <div className="relative flex-1 w-full bg-black flex items-center justify-center overflow-hidden">
        {cameraError ? (
          <div className="p-6 text-center text-[#DCDCC8] max-w-sm">
            <AlertCircle className="w-12 h-12 mx-auto text-[#8A7A40] mb-3" />
            <p className="font-semibold text-sm mb-1 text-white font-serif">Live Camera Unavailable</p>
            <p className="text-xs text-[#DCDCC8]/70 mb-4">{cameraError}</p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={startCamera}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2C2C24] hover:bg-[#3E3E34] text-xs font-semibold text-white rounded-full transition-colors border border-white/10"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Camera
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#5A5A40] hover:bg-[#4C4C36] text-xs font-semibold text-white rounded-full transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload Photo from Device
              </button>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="w-full h-full object-cover"
          />
        )}

        {/* Shutter flash animation effect */}
        {flashEffect && (
          <div className="absolute inset-0 bg-[#F5F5F0]/90 z-20 pointer-events-none transition-opacity duration-200" />
        )}

        {/* Scanner HUD Overlay */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10">
          {/* Top Bar inside Viewfinder */}
          <div className="flex items-center justify-between text-xs text-white/90 drop-shadow">
            {isRecording ? (
              <span className="bg-[#C85A48] px-3 py-1 rounded-full font-mono tracking-wider text-[11px] flex items-center gap-1.5 text-white font-bold animate-pulse shadow-md">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                REC {formatSeconds(recordingSeconds)}
              </span>
            ) : (
              <span className="bg-[#2C2C24]/70 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 font-mono tracking-wider text-[11px] flex items-center gap-1.5 text-[#EBEBE0]">
                <span className="w-2 h-2 rounded-full bg-[#8A9A70] animate-pulse" />
                CAMERA_X LIVE
              </span>
            )}

            {/* Mode Switch: Video Walkthrough vs Photo */}
            <div className="pointer-events-auto flex items-center bg-black/60 backdrop-blur-md p-0.5 rounded-full border border-white/10">
              <button
                type="button"
                onClick={() => !isRecording && setCaptureMode('VIDEO')}
                disabled={isRecording}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 ${
                  captureMode === 'VIDEO' ? 'bg-[#C85A48] text-white shadow-xs' : 'text-[#DCDCC8]/70 hover:text-white'
                }`}
              >
                <Video className="w-3 h-3" />
                <span>Video</span>
              </button>
              <button
                type="button"
                onClick={() => !isRecording && setCaptureMode('PHOTO')}
                disabled={isRecording}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 ${
                  captureMode === 'PHOTO' ? 'bg-[#5A5A40] text-white shadow-xs' : 'text-[#DCDCC8]/70 hover:text-white'
                }`}
              >
                <Camera className="w-3 h-3" />
                <span>Photo</span>
              </button>
            </div>
          </div>

          {/* Center Targeting Reticle */}
          <div className="flex-1 flex items-center justify-center">
            <div className={`relative ${isVerifying ? 'w-64 h-64' : 'w-72 h-56'} border-2 border-dashed ${isRecording ? 'border-[#C85A48]' : isVerifying ? 'border-[#8A7A40]' : 'border-white/50'} rounded-2xl flex items-center justify-center transition-all`}>
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white" />

              {isRecording ? (
                <div className="bg-[#C85A48]/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 text-center max-w-[85%] shadow-lg">
                  <p className="text-white text-xs font-bold flex items-center justify-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    Recording House Walkthrough
                  </p>
                  <p className="text-white/90 text-[10px] mt-0.5">
                    Walk through rooms (kitchen, door, AC, windows)
                  </p>
                </div>
              ) : overlayLabel ? (
                <div className="bg-[#2C2C24]/80 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/15 text-center max-w-[85%]">
                  <p className="text-white text-xs font-semibold">{overlayLabel}</p>
                  <p className="text-[#DCDCC8] text-[10px]">
                    {captureMode === 'VIDEO' ? 'Tap red button to record walkthrough video' : 'Align item and tap shutter'}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Camera Control Bar */}
      <div className="w-full bg-[#1F1F19] px-6 py-4 flex items-center justify-between z-20 border-t border-white/10">
        {/* Gallery / File Upload */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isRecording}
          className="p-3 text-[#DCDCC8] hover:text-white bg-[#2C2C24] hover:bg-[#3E3E34] rounded-full transition-colors active:scale-95 border border-white/5 disabled:opacity-40"
          title="Upload photo from storage"
        >
          <Upload className="w-5 h-5" />
        </button>

        {/* Shutter / Record Button */}
        {captureMode === 'VIDEO' ? (
          <button
            type="button"
            onClick={handleToggleVideoRecording}
            disabled={Boolean(cameraError) || isCapturing}
            className={`relative w-18 h-18 rounded-full border-4 flex items-center justify-center bg-transparent active:scale-90 transition-all ${
              isRecording ? 'border-[#C85A48]' : 'border-white/80'
            }`}
            title={isRecording ? 'Stop Recording Walkthrough' : 'Start Video Walkthrough'}
          >
            {isRecording ? (
              <div className="w-7 h-7 rounded-md bg-[#C85A48] flex items-center justify-center animate-pulse">
                <Square className="w-4 h-4 fill-white text-white" />
              </div>
            ) : (
              <div className="w-13 h-13 rounded-full bg-[#C85A48] hover:bg-red-600 transition-colors flex items-center justify-center shadow-lg">
                <div className="w-4 h-4 rounded-full bg-white/30" />
              </div>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCapture}
            disabled={Boolean(cameraError) || isCapturing}
            className="relative w-18 h-18 rounded-full border-4 border-[#EBEBE0] flex items-center justify-center bg-transparent active:scale-90 transition-transform disabled:opacity-50"
            title="Capture frame"
          >
            <div className="w-14 h-14 rounded-full bg-[#F5F5F0] transition-all hover:bg-white" />
          </button>
        )}

        {/* Camera Switch (Flip) */}
        <button
          type="button"
          onClick={toggleCamera}
          disabled={isRecording}
          className="p-3 text-[#DCDCC8] hover:text-white bg-[#2C2C24] hover:bg-[#3E3E34] rounded-full transition-colors active:scale-95 border border-white/5 disabled:opacity-40"
          title="Flip camera"
        >
          <SwitchCamera className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
