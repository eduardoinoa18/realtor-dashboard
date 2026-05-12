'use client';

import { useEffect, useState } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { NOW_ZONES } from '@/lib/constants';

export function NowZone() {
  const [currentZone, setCurrentZone] = useState<typeof NOW_ZONES[0] | null>(null);
  const [nextZone, setNextZone] = useState<typeof NOW_ZONES[0] | null>(null);
  const [timeUntilNext, setTimeUntilNext] = useState('');
  const [isWorkHours, setIsWorkHours] = useState(true);

  useEffect(() => {
    const updateZone = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const totalMinutes = hours * 60 + minutes;

      const found = NOW_ZONES.find((zone) => {
        const [startH, startM] = zone.start.split(':').map(Number);
        const [endH, endM] = zone.end.split(':').map(Number);
        const startTotal = startH * 60 + startM;
        const endTotal = endH * 60 + endM;
        return totalMinutes >= startTotal && totalMinutes < endTotal;
      });

      if (found) {
        setCurrentZone(found);
        setIsWorkHours(true);
        
        // Find next zone
        const currentIdx = NOW_ZONES.indexOf(found);
        const next = NOW_ZONES[currentIdx + 1] || NOW_ZONES[0];
        setNextZone(next);
        
        // Calculate time until next
        const [nextH, nextM] = next.start.split(':').map(Number);
        const nextTotal = nextH * 60 + nextM;
        let diff = nextTotal - totalMinutes;
        if (diff <= 0) diff += 24 * 60;
        
        const mins = diff % 60;
        const hrs = Math.floor(diff / 60);
        setTimeUntilNext(`${hrs}h ${mins}m`);
      } else {
        setCurrentZone(null);
        setIsWorkHours(false);
        setNextZone(NOW_ZONES[0]);
      }
    };

    updateZone();
    const interval = setInterval(updateZone, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!currentZone) {
    return (
      <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="text-[#94A3B8] flex-shrink-0 mt-1" size={20} />
          <div>
            <h3 className="font-semibold text-[#F1F5F9] mb-1">🌙 Power Down</h3>
            <p className="text-[#94A3B8] text-sm">
              You&apos;re outside work hours (1pm–6pm). Rest and recharge. Tomorrow&apos;s first priority: {nextZone?.title}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-[#D4A043]/20 to-[#92400E]/20 border border-[#D4A043]/50 rounded-lg p-6 animate-slide-up">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-[#D4A043] rounded-full pulse-gold"></div>
            <span className="text-xs font-semibold text-[#D4A043] uppercase">RIGHT NOW</span>
          </div>
          <h2 className="text-2xl font-bold text-[#F1F5F9] mb-2">{currentZone.title}</h2>
          <p className="text-[#94A3B8] text-sm leading-relaxed mb-4">{currentZone.sub}</p>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-[#94A3B8]">
              <Clock size={16} />
              <span>{currentZone.start} – {currentZone.end}</span>
            </div>
            <div className="flex items-center gap-2 text-[#64748B]">
              Next in <span className="font-semibold text-[#D4A043]">{timeUntilNext}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
