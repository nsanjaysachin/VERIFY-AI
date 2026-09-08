import React, { useState } from 'react';
import { Camera, Trash2, ArrowRight, Plus, Sparkles, Layers, Image as ImageIcon } from 'lucide-react';
import { CameraViewfinder } from './CameraViewfinder';
import { HomeScanCapture } from '../types';

interface HomeScanScreenProps {
  onAnalyze: (captures: HomeScanCapture[]) => void;
  onCancel: () => void;
  initialCaptures?: HomeScanCapture[];
}

export const HomeScanScreen: React.FC<HomeScanScreenProps> = ({
  onAnalyze,
  onCancel,
  initialCaptures = [],
}) => {
  const [captures, setCaptures] = useState<HomeScanCapture[]>(initialCaptures);
  const [selectedCapture, setSelectedCapture] = useState<HomeScanCapture | null>(null);

  const handleCaptureFrame = (dataUrl: string, label?: string) => {
    const newCapture: HomeScanCapture = {
      id: `cap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      dataUrl,
      timestamp: Date.now(),
      roomLabel: label || `Capture #${captures.length + 1}`,
    };
    setCaptures(prev => [...prev, newCapture]);
  };

  const handleDeleteCapture = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCaptures(prev => prev.filter(c => c.id !== id));
    if (selectedCapture?.id === id) {
      setSelectedCapture(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F5F5F0] text-[#2C2C24] overflow-hidden">
      {/* Top Navigation Header */}
      <div className="px-5 py-3.5 flex items-center justify-between bg-white border-b border-[#EBEBE0] z-20">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-[#7A7A6A] hover:text-[#2C2C24] px-2 py-1 rounded-md transition-colors"
          >
            Cancel
          </button>
          <div className="h-4 w-px bg-[#EBEBE0]" />
          <span className="text-xs font-serif font-bold text-[#2C2C24] tracking-wide">
            Scan Home
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#7A7A6A] font-medium px-2.5 py-1 rounded-full bg-[#F5F5F0] border border-[#EBEBE0]">
            Live Camera
          </span>
        </div>
      </div>

      {/* Main Viewfinder Area */}
      <div className="flex-1 relative overflow-hidden p-3 flex flex-col">
        <div className="flex-1 w-full max-w-lg mx-auto relative rounded-[28px] overflow-hidden shadow-sm border border-[#EBEBE0]">
          <CameraViewfinder
            onCapture={handleCaptureFrame}
            overlayLabel={`Scan room or record walkthrough (${captures.length})`}
          />
        </div>

        {/* Captured Reel / Thumbnails Strip */}
        <div className="mt-3 w-full max-w-lg mx-auto bg-white rounded-[24px] p-3 border border-[#EBEBE0] shadow-sm">
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#2C2C24]">
              <Layers className="w-3.5 h-3.5 text-[#5A5A40]" />
              <span>Walkthrough Frames / Photos ({captures.length})</span>
            </div>
            {captures.length > 0 && (
              <button
                type="button"
                onClick={() => setCaptures([])}
                className="text-[11px] font-medium text-[#C85A48] hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          {captures.length === 0 ? (
            <div className="py-3 px-2 text-center text-[#7A7A6A] text-xs flex items-center justify-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#A0A090]" />
              <span>Record video walkthrough or take room photos with camera.</span>
            </div>
          ) : (
            <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
              {captures.map((cap, idx) => (
                <div
                  key={cap.id}
                  onClick={() => setSelectedCapture(cap)}
                  className="relative group flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-[#DCDCC8] hover:border-[#5A5A40] cursor-pointer transition-all shadow-xs"
                >
                  <img
                    src={cap.dataUrl}
                    alt={cap.roomLabel || `Capture ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/5 transition-colors" />
                  <span className="absolute bottom-0.5 left-1 text-[9px] font-mono font-bold text-white drop-shadow">
                    #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteCapture(cap.id, e)}
                    className="absolute top-0.5 right-0.5 p-1 bg-black/60 hover:bg-[#C85A48] text-white rounded-md transition-colors"
                    title="Remove photo"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom CTA Bar */}
      <div className="p-4 bg-white border-t border-[#EBEBE0] flex items-center justify-between gap-4 z-20">
        <div className="text-xs text-[#7A7A6A]">
          <span className="font-bold text-[#2C2C24]">{captures.length}</span> {captures.length === 1 ? 'photo' : 'photos'} ready
        </div>

        <button
          type="button"
          disabled={captures.length === 0}
          onClick={() => onAnalyze(captures)}
          className="flex-1 max-w-xs py-3 px-5 rounded-full bg-[#5A5A40] hover:bg-[#4C4C36] disabled:opacity-40 disabled:hover:bg-[#5A5A40] text-white font-bold text-xs tracking-wide flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
        >
          <span>Analyze My Home</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Preview Modal for single thumbnail click */}
      {selectedCapture && (
        <div
          className="fixed inset-0 bg-[#2C2C24]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedCapture(null)}
        >
          <div
            className="bg-white border border-[#DCDCC8] rounded-[28px] max-w-sm w-full p-4 overflow-hidden shadow-2xl text-[#2C2C24]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#2C2C24]">{selectedCapture.roomLabel || 'Photo Detail'}</span>
              <button
                type="button"
                onClick={() => setSelectedCapture(null)}
                className="text-xs text-[#7A7A6A] hover:text-[#2C2C24]"
              >
                Close
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center mb-3">
              <img
                src={selectedCapture.dataUrl}
                alt="Selected capture"
                className="w-full h-full object-contain"
              />
            </div>
            <button
              type="button"
              onClick={() => handleDeleteCapture(selectedCapture.id)}
              className="w-full py-2.5 bg-[#C85A48]/10 hover:bg-[#C85A48]/20 text-[#C85A48] text-xs font-semibold rounded-full transition-colors flex items-center justify-center gap-1.5 border border-[#C85A48]/20"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete this photo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
