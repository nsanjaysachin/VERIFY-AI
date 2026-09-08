import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Camera, 
  AlertTriangle,
  Zap,
  ArrowRight,
  ShieldAlert,
  Cpu,
  Cloud,
  Eye,
  Activity,
  Image as ImageIcon
} from 'lucide-react';
import { ChecklistItem, VerificationResult, PhoneSensorData } from '../types';
import { CameraViewfinder } from './CameraViewfinder';
import { aiHomeService } from '../services/aiService';
import { onDeviceAiService } from '../services/onDeviceAiService';
import { phoneSensorService } from '../services/sensorService';

interface ItemVerificationModalProps {
  item: ChecklistItem;
  onClose: () => void;
  onVerificationSuccess: (item: ChecklistItem, result: VerificationResult) => void;
}

export const ItemVerificationModal: React.FC<ItemVerificationModalProps> = ({
  item,
  onClose,
  onVerificationSuccess,
}) => {
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [result, setResult] = useState<VerificationResult | null>(item.lastVerified || null);
  const [capturedImage, setCapturedImage] = useState<string | null>(item.lastVerified?.imageThumbnail || null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sensorData, setSensorData] = useState<PhoneSensorData>(phoneSensorService.getSensorData());
  const [preferOnDevice, setPreferOnDevice] = useState<boolean>(true);

  // Subscribe to phone sensors
  useEffect(() => {
    const unsub = phoneSensorService.subscribe((data) => setSensorData(data));
    return () => unsub();
  }, []);

  const previousState = item.lastVerified?.detected_state || item.beforeState?.state;

  const handleCaptureForVerification = async (dataUrl: string) => {
    setCapturedImage(dataUrl);
    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const verification = await aiHomeService.verifyItemState({
        itemName: item.object,
        expectedState: item.recommended_state,
        imageBase64: dataUrl,
        room: item.room,
        previousState,
        preferOnDevice,
      });

      setResult(verification);
      onVerificationSuccess(item, verification);
    } catch (err: any) {
      console.error('Verification error:', err);
      setErrorMessage(err.message || 'Verification failed. Could not process image.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRetake = () => {
    setResult(null);
    setCapturedImage(null);
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#2C2C24]/90 backdrop-blur-md flex flex-col justify-between p-3 sm:p-5 text-[#F5F5F0] overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-[#DCDCC8]/20 z-20">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-[#DCDCC8]">
              Verify State
            </span>
            {item.importance && (
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  item.importance === 'CRITICAL'
                    ? 'bg-[#C85A48]/30 text-[#fca5a5] border border-[#C85A48]/50'
                    : item.importance === 'HIGH'
                    ? 'bg-[#D4A373]/30 text-[#fed7aa] border border-[#D4A373]/50'
                    : 'bg-[#5A5A40]/30 text-[#DCDCC8] border border-[#5A5A40]'
                }`}
              >
                {item.importance}
              </span>
            )}
          </div>
          <h2 className="text-lg font-serif font-bold text-white flex items-center gap-2">
            <span>{item.object}</span>
            <span className="text-xs font-sans font-normal text-[#DCDCC8]/70">({item.room})</span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* On-device toggle */}
          <button
            type="button"
            onClick={() => setPreferOnDevice(!preferOnDevice)}
            className={`text-[10px] px-2.5 py-1 rounded-full font-mono flex items-center gap-1 transition-colors border ${
              preferOnDevice
                ? 'bg-[#5A5A40]/40 border-[#A0B080]/60 text-[#DCDCC8]'
                : 'bg-black/30 border-white/10 text-white/50'
            }`}
            title="Toggle On-Device Inference preference"
          >
            <Cpu className="w-3 h-3 text-[#A0B080]" />
            <span>{preferOnDevice ? 'On-Device' : 'Cloud'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#DCDCC8] hover:text-white rounded-full bg-[#3E3E34] hover:bg-[#4E4E42] transition-colors"
            title="Close verification"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 my-2 flex flex-col relative rounded-[28px] overflow-hidden bg-[#24241E] border border-[#5A5A40]/30 shadow-2xl">
        {/* If actively inspecting image */}
        {isVerifying ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            {capturedImage && (
              <div className="w-48 h-32 rounded-xl overflow-hidden mb-4 border border-[#5A5A40] relative shadow-md">
                <img src={capturedImage} alt="Verifying" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-[#5A5A40]/30 animate-pulse" />
              </div>
            )}
            <div className="w-10 h-10 rounded-full border-2 border-[#DCDCC8] border-t-transparent animate-spin mb-3" />
            <h3 className="text-sm font-bold text-white font-serif">
              Analyzing Physical State...
            </h3>
            <p className="text-xs text-[#DCDCC8] mt-1 max-w-xs">
              Inspecting dials, louvers, illumination, and latches for &quot;{item.recommended_state}&quot;.
            </p>
          </div>
        ) : result ? (
          /* Result Display (State Detection + Before/After + Uncertainty) */
          <div className="flex-1 flex flex-col justify-between p-4 sm:p-5 overflow-y-auto space-y-4">
            {/* Status Header Banner */}
            {result.isLowConfidence ? (
              /* Low Confidence / Uncertainty Banner (Requirement 10) */
              <div className="p-4 rounded-2xl border bg-[#D4A373]/20 border-[#D4A373]/60 text-[#F5F5F0]">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-7 h-7 text-[#fbbf24] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold tracking-tight text-[#fef08a]">
                        ⚠️ UNABLE TO VERIFY RELIABLY
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/50 text-[#fbbf24]">
                        {Math.round(result.confidence * 100)}% conf (Below 70% threshold)
                      </span>
                    </div>
                    <p className="text-xs text-[#fef08a]/90 mt-1 leading-relaxed">
                      {result.message}
                    </p>
                    <p className="text-[11px] text-[#DCDCC8]/80 mt-2 italic">
                      Safety Directive: VERIFY will not guess on critical home fixtures. Please adjust camera angle, step closer, or clear glare.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Normal Result Banner (Verified vs Not Verified) */
              <div
                className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
                  result.verified
                    ? 'bg-[#5A5A40]/30 border-[#5A5A40] text-[#F5F5F0]'
                    : 'bg-[#C85A48]/20 border-[#C85A48]/60 text-[#F5F5F0]'
                }`}
              >
                {result.verified ? (
                  <CheckCircle2 className="w-7 h-7 text-[#A0B080] flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-7 h-7 text-[#E07060] flex-shrink-0 mt-0.5" />
                )}

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold tracking-tight">
                      {result.verified
                        ? result.stateTransition?.changed
                          ? `✅ ${item.object.toUpperCase()} TURNED ${result.detected_state}`
                          : `✅ ${item.object} — VERIFIED (${result.detected_state})`
                        : `❌ ${item.object} IS ${result.detected_state}`}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/40 text-[#DCDCC8]">
                      {Math.round(result.confidence * 100)}% conf
                    </span>
                  </div>

                  {/* AI Engine Provider Badge */}
                  <div className="flex items-center gap-2 mt-2">
                    {result.engine === 'ON_DEVICE' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#A0B080]/20 text-[#A0B080] border border-[#A0B080]/30">
                        <Cpu className="w-3 h-3" />
                        <span>On-Device</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/30">
                        <Cloud className="w-3 h-3" />
                        <span>Cloud AI</span>
                      </span>
                    )}
                  </div>

                  {/* AI Explanation Message */}
                  <p className="text-xs mt-2.5 leading-relaxed text-[#DCDCC8] bg-black/30 p-2.5 rounded-xl border border-white/5">
                    {result.message}
                  </p>
                </div>
              </div>
            )}

            {/* BEFORE → ACTION → AFTER Card (Requirement 2) */}
            {(item.beforeState || result.stateTransition || (previousState && previousState !== result.detected_state)) && (
              <div className="bg-black/30 rounded-2xl p-3 border border-white/10">
                <div className="flex items-center justify-between pb-2 border-b border-white/5 text-[11px] font-bold uppercase tracking-wider text-[#DCDCC8]">
                  <span>Physical State Transition</span>
                  <span className="text-[#A0B080] font-mono">
                    {result.verified ? 'Verified Resolved' : 'In Progress'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-2.5 items-center text-center">
                  {/* BEFORE */}
                  <div className="bg-black/40 p-2 rounded-xl border border-white/5">
                    <span className="text-[9px] uppercase font-bold text-[#DCDCC8]/70 block">
                      Before
                    </span>
                    <span className="text-xs font-mono font-bold text-[#f87171] block mt-0.5">
                      {previousState || item.beforeState?.state || 'UNCHECKED'}
                    </span>
                  </div>

                  {/* ARROW */}
                  <div className="flex flex-col items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-[#DCDCC8]/50" />
                    <span className="text-[9px] text-[#DCDCC8]/60 mt-0.5">User action</span>
                  </div>

                  {/* AFTER */}
                  <div className="bg-black/40 p-2 rounded-xl border border-white/5">
                    <span className="text-[9px] uppercase font-bold text-[#DCDCC8]/70 block">
                      After
                    </span>
                    <span
                      className={`text-xs font-mono font-bold block mt-0.5 ${
                        result.verified ? 'text-[#4ade80]' : 'text-[#f87171]'
                      }`}
                    >
                      {result.detected_state}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Captured Inspection Frame */}
            {capturedImage && (
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black max-h-40 flex items-center justify-center">
                <img
                  src={capturedImage}
                  alt="Inspected frame"
                  className="w-full h-full object-contain max-h-40"
                />
              </div>
            )}

            {/* Bottom Action Controls */}
            <div className="pt-2 flex gap-2.5">
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 py-3 px-4 rounded-full bg-[#3E3E34] hover:bg-[#4E4E42] text-xs font-semibold text-[#F5F5F0] flex items-center justify-center gap-2 transition-colors border border-white/10 active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{result.verified ? 'Re-scan' : 'Scan Again After Fixing'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className={`flex-1 py-3 px-4 rounded-full text-xs font-bold text-white flex items-center justify-center gap-2 transition-colors shadow-lg active:scale-95 ${
                  result.verified
                    ? 'bg-[#5A5A40] hover:bg-[#4C4C36]'
                    : 'bg-[#3E3E34] hover:bg-[#4E4E42]'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{result.verified ? 'Done' : 'Keep & Return'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Live Camera Viewfinder */
          <div className="flex-1 flex flex-col relative">
            <CameraViewfinder
              onCapture={handleCaptureForVerification}
              overlayLabel={`Point at ${item.object}`}
              targetExpectedState={`Expected: ${item.recommended_state}`}
              isVerifying
            />
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && (
          <div className="absolute bottom-4 left-4 right-4 bg-[#C85A48] border border-red-400 p-3 rounded-xl flex items-center justify-between text-xs text-white z-30">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-white flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={handleRetake}
              className="text-white font-bold ml-2 underline"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Phone Sensor Intelligence Footer (Requirement 7) */}
      <div className="flex items-center justify-between text-[10px] font-mono text-[#DCDCC8]/80 px-2 py-1 bg-black/20 rounded-xl border border-white/5">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-[#A0B080]" />
          <span>Camera: {sensorData.isDeviceStill ? '🟢 Steady' : '🟡 Hand Movement'}</span>
        </div>
        <div>
          <span>Light: {sensorData.ambientLightLux} Lux</span>
        </div>
        <div>
          <span>Acoustic: {sensorData.acousticLevelDb} dB</span>
        </div>
      </div>
    </div>
  );
};
