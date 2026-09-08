import React, { useEffect, useState } from 'react';
import { Sparkles, BrainCircuit, ShieldAlert, Zap, AlertTriangle, RefreshCw } from 'lucide-react';
import { HomeScanCapture, DetectedHomeItem } from '../types';
import { aiHomeService } from '../services/aiService';

interface AnalysisLoadingScreenProps {
  captures: HomeScanCapture[];
  onComplete: (detectedItems: DetectedHomeItem[]) => void;
  onError: (errorMessage: string) => void;
  onCancel: () => void;
}

const STEPS = [
  { label: "Preparing walkthrough captures...", icon: BrainCircuit },
  { label: "Multimodal AI scanning appliances & fixtures...", icon: Sparkles },
  { label: "Identifying gas stoves, ACs, windows & doors...", icon: ShieldAlert },
  { label: "Synthesizing safety & energy checklist...", icon: Zap },
];

export const AnalysisLoadingScreen: React.FC<AnalysisLoadingScreenProps> = ({
  captures,
  onComplete,
  onError,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const startAnalysis = async () => {
    setErrorMessage(null);
    setCurrentStep(0);

    const stepInterval = setInterval(() => {
      setCurrentStep(prev => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 1200);

    try {
      const base64List = captures.map(c => c.dataUrl);
      const items = await aiHomeService.analyzeHomePhotos(base64List);
      clearInterval(stepInterval);
      onComplete(items);
    } catch (err: any) {
      clearInterval(stepInterval);
      console.error("AI Analysis error:", err);
      setErrorMessage(err.message || "Failed to analyze photos. Please check your network or try again.");
    }
  };

  useEffect(() => {
    startAnalysis();
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[#F5F5F0] text-[#2C2C24]">
      {/* Scanner Radar Graphic */}
      <div className="relative w-28 h-28 mb-8 flex items-center justify-center">
        {/* Pulsing Concentric Rings */}
        <div className="absolute inset-0 rounded-full border border-[#5A5A40]/20 animate-ping" />
        <div className="absolute inset-2 rounded-full border border-[#5A5A40]/30 animate-pulse" />
        <div className="absolute inset-6 rounded-full border border-[#5A5A40]/50" />
        
        {/* Central AI Node */}
        <div className="w-14 h-14 rounded-2xl bg-[#5A5A40] border border-[#4C4C36] flex items-center justify-center shadow-md z-10">
          <BrainCircuit className="w-7 h-7 text-[#F5F5F0] animate-pulse" />
        </div>
      </div>

      {/* Screen Title */}
      <div className="max-w-xs mb-6">
        <h2 className="text-2xl font-serif font-bold text-[#2C2C24] tracking-tight">
          AI Home Understanding
        </h2>
        <p className="text-xs text-[#7A7A6A] mt-1.5">
          Analyzing {captures.length} {captures.length === 1 ? 'photo' : 'photos'} of your home with multimodal vision.
        </p>
      </div>

      {/* Error View */}
      {errorMessage ? (
        <div className="max-w-sm w-full bg-[#FFF9F9] border border-[#C85A48]/40 rounded-[24px] p-4 text-left mb-6 shadow-sm">
          <div className="flex items-center gap-2 text-[#C85A48] font-bold text-xs mb-1">
            <AlertTriangle className="w-4 h-4" />
            Analysis Encountered An Issue
          </div>
          <p className="text-xs text-[#7A7A6A] mb-4">{errorMessage}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={startAnalysis}
              className="flex-1 py-2.5 px-4 bg-[#C85A48] hover:bg-red-700 text-white font-semibold text-xs rounded-full flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Analysis
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="py-2.5 px-4 bg-white hover:bg-[#F9F9F4] text-[#2C2C24] border border-[#DCDCC8] font-semibold text-xs rounded-full transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      ) : (
        /* Progress Steps List */
        <div className="max-w-xs w-full space-y-2.5 mb-8 text-left">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isDone = currentStep > idx;
            const isCurrent = currentStep === idx;

            return (
              <div
                key={idx}
                className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                  isCurrent
                    ? 'bg-white border-[#5A5A40]/40 text-[#2C2C24] shadow-sm font-semibold'
                    : isDone
                    ? 'bg-white/60 border-[#EBEBE0] text-[#7A7A6A]'
                    : 'bg-transparent border-transparent text-[#7A7A6A]/50'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isCurrent
                      ? 'bg-[#5A5A40] text-white shadow-xs'
                      : isDone
                      ? 'bg-[#5A5A40]/15 text-[#5A5A40]'
                      : 'bg-[#EBEBE0] text-[#7A7A6A]/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-medium leading-tight">
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Captured Thumbnails Mini preview */}
      <div className="flex gap-1.5 opacity-80">
        {captures.slice(0, 5).map((cap, i) => (
          <div key={i} className="w-7 h-7 rounded-lg overflow-hidden border border-[#DCDCC8] bg-black shadow-xs">
            <img src={cap.dataUrl} alt="Thumbnail" className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    </div>
  );
};
