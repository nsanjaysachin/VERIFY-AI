import React, { useState, useEffect } from 'react';
import { Mic, Radio, Volume2, Sparkles, X } from 'lucide-react';
import { ChecklistItem, VoiceAssistantState } from '../types';
import { voiceAssistantService } from '../services/voiceAssistantService';

interface VoiceAssistantBarProps {
  checklistItems: ChecklistItem[];
  onOpenVerificationForItem: (itemName: string) => void;
  onMarkCurrentDone?: () => void;
}

const QUICK_COMMANDS = [
  'Check my home',
  'Check stove',
  'Check AC',
  'Check door',
  'What\'s left?',
];

export const VoiceAssistantBar: React.FC<VoiceAssistantBarProps> = ({
  checklistItems,
  onOpenVerificationForItem,
  onMarkCurrentDone,
}) => {
  const [voiceState, setVoiceState] = useState<VoiceAssistantState>(voiceAssistantService.getState());
  const [showPrompts, setShowPrompts] = useState<boolean>(false);

  useEffect(() => {
    const unsubState = voiceAssistantService.subscribeState((st) => setVoiceState(st));
    const unsubCmd = voiceAssistantService.onCommand((action) => {
      if (action.type === 'CHECK_ITEM' && action.targetItemName) {
        onOpenVerificationForItem(action.targetItemName);
      } else if (action.type === 'MARK_DONE' && onMarkCurrentDone) {
        onMarkCurrentDone();
      }
    });

    return () => {
      unsubState();
      unsubCmd();
    };
  }, [onOpenVerificationForItem, onMarkCurrentDone]);

  const toggleListening = () => {
    if (voiceState.isListening) {
      voiceAssistantService.stopListening();
    } else {
      setShowPrompts(true);
      voiceAssistantService.startListening();
    }
  };

  const handleQuickCommand = (cmd: string) => {
    setShowPrompts(true);
    voiceAssistantService.processCommand(cmd, checklistItems);
  };

  const handleStopSpeaking = () => {
    voiceAssistantService.stopSpeaking();
  };

  return (
    <div className="bg-[#2C2C24] rounded-2xl p-2.5 text-[#F5F5F0] border border-white/10 shadow-sm">
      <div className="flex items-center justify-between gap-2.5">
        {/* Mic Toggle Button */}
        <button
          type="button"
          onClick={toggleListening}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-xs font-semibold ${
            voiceState.isListening
              ? 'bg-[#C85A48] text-white animate-pulse'
              : 'bg-white/10 hover:bg-white/20 text-white'
          }`}
        >
          {voiceState.isListening ? (
            <>
              <Radio className="w-3.5 h-3.5 animate-spin" />
              <span>Listening</span>
            </>
          ) : (
            <>
              <Mic className="w-3.5 h-3.5" />
              <span>Voice</span>
            </>
          )}
        </button>

        {/* Live status or response */}
        <div 
          onClick={() => setShowPrompts(!showPrompts)}
          className="flex-1 min-w-0 text-xs text-[#DCDCC8] truncate cursor-pointer"
        >
          {voiceState.response ? (
            <span className="truncate block">{voiceState.response}</span>
          ) : (
            <span className="text-white/40 truncate block">Tap mic or prompts to speak</span>
          )}
        </div>

        {voiceState.isSpeaking && (
          <button
            type="button"
            onClick={handleStopSpeaking}
            className="p-1.5 rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={() => setShowPrompts(!showPrompts)}
          className="text-[11px] text-white/50 hover:text-white px-1.5"
        >
          {showPrompts ? 'Hide' : 'Prompts'}
        </button>
      </div>

      {/* Prompts strip */}
      {showPrompts && (
        <div className="mt-2 pt-2 border-t border-white/10 flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          {QUICK_COMMANDS.map((cmd) => (
            <button
              key={cmd}
              type="button"
              onClick={() => handleQuickCommand(cmd)}
              className="text-[10px] px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[#EBEBE0] whitespace-nowrap transition-colors"
            >
              {cmd}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
