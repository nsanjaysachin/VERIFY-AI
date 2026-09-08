import React, { useState, useEffect } from 'react';
import { 
  X, 
  Cpu, 
  Zap, 
  DoorClosed, 
  Monitor, 
  CheckCircle2, 
  AlertCircle, 
  Radio, 
  RefreshCw,
  Power
} from 'lucide-react';
import { OfficeKitDevice, ChecklistItem } from '../types';
import { officeKitService } from '../services/officeKitService';

interface OfficeKitModalProps {
  onClose: () => void;
  onApplySignalToChecklist: (deviceName: string, affectedItem: string, newState: string, verified: boolean) => void;
  checklistItems: ChecklistItem[];
}

export const OfficeKitModal: React.FC<OfficeKitModalProps> = ({
  onClose,
  onApplySignalToChecklist,
  checklistItems,
}) => {
  const [devices, setDevices] = useState<OfficeKitDevice[]>(officeKitService.getDevices());
  const [recentMessage, setRecentMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsub = officeKitService.subscribe((device, affectedItem) => {
      setDevices(officeKitService.getDevices());
      if (affectedItem) {
        setRecentMessage(`Signal received from ${device.name}: Updated ${affectedItem}`);
        setTimeout(() => setRecentMessage(null), 4000);
      }
    });
    return () => unsub();
  }, []);

  const handleToggleAcPower = () => {
    const plug = devices.find((d) => d.type === 'SMART_PLUG');
    if (!plug) return;

    const currentWatts = plug.telemetry?.powerWatts || 0;
    const newWatts = currentWatts === 0 ? 1380 : 0;
    officeKitService.triggerDeviceSignal(plug.id, { powerWatts: newWatts });

    const isVerified = newWatts === 0;
    onApplySignalToChecklist(plug.name, 'Air Conditioner', newWatts === 0 ? 'OFF' : 'ON', isVerified);
  };

  const handleToggleDoorSensor = () => {
    const sensor = devices.find((d) => d.type === 'DOOR_CONTACT');
    if (!sensor) return;

    const currentClosed = Boolean(sensor.telemetry?.contactClosed);
    const newClosed = !currentClosed;
    officeKitService.triggerDeviceSignal(sensor.id, { contactClosed: newClosed });

    onApplySignalToChecklist(
      sensor.name,
      'Main Entrance Door',
      newClosed ? 'LOCKED' : 'OPEN',
      newClosed
    );
  };

  const handleToggleDeskDock = () => {
    const dock = devices.find((d) => d.type === 'DESK_DOCK');
    if (!dock) return;

    const isDocked = Boolean(dock.telemetry?.docked);
    officeKitService.triggerDeviceSignal(dock.id, { docked: !isDocked });
    setRecentMessage(
      !isDocked
        ? 'Phone docked at iQOO Office Desk Stand. Commute ended.'
        : 'Phone removed from Office Desk Stand.'
    );
    setTimeout(() => setRecentMessage(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#2C2C24]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#24241E] border border-[#5A5A40]/40 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-[#F5F5F0]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5A5A40]/30 border border-[#5A5A40] flex items-center justify-center text-[#A0B080]">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-serif font-bold text-white">iQOO Office Kit Bridge</h2>
                <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#A0B080]/20 text-[#A0B080] border border-[#A0B080]/30">
                  <Radio className="w-2.5 h-2.5 animate-pulse" />
                  <span>BLE Connected</span>
                </span>
              </div>
              <p className="text-xs text-[#DCDCC8]/70">
                Physical hardware telemetry feed &amp; departure state sync
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#DCDCC8] hover:text-white rounded-full bg-[#3E3E34] hover:bg-[#4E4E42] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner notification when signal changes */}
        {recentMessage && (
          <div className="bg-[#5A5A40]/30 border-b border-[#A0B080]/30 px-4 py-2 text-xs font-mono text-[#A0B080] flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{recentMessage}</span>
          </div>
        )}

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          <div className="bg-black/30 p-3 rounded-2xl border border-white/5 text-xs text-[#DCDCC8] leading-relaxed">
            <strong>Concept: Phone + AI + Physical World</strong>. When physical sensors change state (e.g. smart plug detects appliance draw drop or door magnetic contact aligns), VERIFY receives telemetry to update your departure readiness.
          </div>

          {/* Device 1: Smart Plug */}
          <div className="bg-[#2E2E26] p-4 rounded-2xl border border-white/10 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#5A5A40]/40 flex items-center justify-center text-[#A0B080]">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">iQOO Smart Power Monitor</h3>
                  <span className="text-[11px] text-[#DCDCC8]/70 block">Target: Bedroom AC &amp; Appliances</span>
                </div>
              </div>

              <span
                className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full ${
                  (devices[0]?.telemetry?.powerWatts || 0) === 0
                    ? 'bg-[#A0B080]/20 text-[#A0B080] border border-[#A0B080]/30'
                    : 'bg-[#C85A48]/20 text-[#fca5a5] border border-[#C85A48]/30'
                }`}
              >
                {devices[0]?.telemetry?.powerWatts || 0} Watts
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
              <span className="text-[#DCDCC8]">
                Status: {(devices[0]?.telemetry?.powerWatts || 0) === 0 ? '✅ Standby (AC is OFF)' : '⚠️ Active Load (AC is ON)'}
              </span>
              <button
                type="button"
                onClick={handleToggleAcPower}
                className="px-3 py-1.5 rounded-full bg-[#3E3E34] hover:bg-[#4E4E42] text-xs font-bold text-white flex items-center gap-1.5 transition-colors border border-white/10 active:scale-95"
              >
                <Power className="w-3 h-3 text-[#A0B080]" />
                <span>Toggle Load ({devices[0]?.telemetry?.powerWatts === 0 ? 'Turn ON' : 'Turn OFF'})</span>
              </button>
            </div>
          </div>

          {/* Device 2: Door Contact Sensor */}
          <div className="bg-[#2E2E26] p-4 rounded-2xl border border-white/10 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#5A5A40]/40 flex items-center justify-center text-[#A0B080]">
                  <DoorClosed className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">iQOO Magnetic Entry Sensor</h3>
                  <span className="text-[11px] text-[#DCDCC8]/70 block">Target: Main Entrance Door</span>
                </div>
              </div>

              <span
                className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full ${
                  devices[1]?.telemetry?.contactClosed
                    ? 'bg-[#A0B080]/20 text-[#A0B080] border border-[#A0B080]/30'
                    : 'bg-[#C85A48]/20 text-[#fca5a5] border border-[#C85A48]/30'
                }`}
              >
                {devices[1]?.telemetry?.contactClosed ? 'CLOSED' : 'OPEN'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
              <span className="text-[#DCDCC8]">
                Frame Alignment: {devices[1]?.telemetry?.contactClosed ? '✅ Sealed & Latched' : '⚠️ Latch Disengaged'}
              </span>
              <button
                type="button"
                onClick={handleToggleDoorSensor}
                className="px-3 py-1.5 rounded-full bg-[#3E3E34] hover:bg-[#4E4E42] text-xs font-bold text-white flex items-center gap-1.5 transition-colors border border-white/10 active:scale-95"
              >
                <DoorClosed className="w-3 h-3 text-[#A0B080]" />
                <span>{devices[1]?.telemetry?.contactClosed ? 'Open Door' : 'Close Door'}</span>
              </button>
            </div>
          </div>

          {/* Device 3: Office Desk Stand */}
          <div className="bg-[#2E2E26] p-4 rounded-2xl border border-white/10 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#5A5A40]/40 flex items-center justify-center text-[#A0B080]">
                  <Monitor className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">iQOO Office Desk Stand &amp; Hub</h3>
                  <span className="text-[11px] text-[#DCDCC8]/70 block">Office Workstation Proximity</span>
                </div>
              </div>

              <span
                className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full ${
                  devices[2]?.telemetry?.docked
                    ? 'bg-[#A0B080]/20 text-[#A0B080] border border-[#A0B080]/30'
                    : 'bg-white/10 text-[#DCDCC8]'
                }`}
              >
                {devices[2]?.telemetry?.docked ? 'DOCKED AT WORK' : 'UNDOCKED'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
              <span className="text-[#DCDCC8]">
                {devices[2]?.telemetry?.docked ? '📍 Arrived at Office' : 'Commuting / At Home'}
              </span>
              <button
                type="button"
                onClick={handleToggleDeskDock}
                className="px-3 py-1.5 rounded-full bg-[#3E3E34] hover:bg-[#4E4E42] text-xs font-bold text-white flex items-center gap-1.5 transition-colors border border-white/10 active:scale-95"
              >
                <Monitor className="w-3 h-3 text-[#A0B080]" />
                <span>{devices[2]?.telemetry?.docked ? 'Undock' : 'Dock at Office'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-full bg-[#5A5A40] hover:bg-[#4C4C36] text-xs font-bold text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
