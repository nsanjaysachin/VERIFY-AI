import React, { useState, useEffect } from 'react';
import { Wifi, Signal, BatteryCharging } from 'lucide-react';

export const AndroidStatusBar: React.FC = () => {
  const [currentTime, setCurrentTime] = useState<string>('9:41');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      id="android-status-bar"
      className="w-full h-8 px-5 flex items-center justify-between text-xs font-medium text-[#2C2C24] select-none z-30 bg-transparent"
    >
      <span className="font-semibold tracking-tight text-[13px]">{currentTime}</span>
      <div className="flex items-center space-x-2 text-[11px] opacity-90 text-[#7A7A6A]">
        <Signal className="w-3.5 h-3.5" />
        <Wifi className="w-3.5 h-3.5" />
        <div className="flex items-center space-x-0.5 text-[#2C2C24]">
          <span className="text-[10px] font-bold">98%</span>
          <BatteryCharging className="w-4 h-4 text-[#5A5A40]" />
        </div>
      </div>
    </div>
  );
};
