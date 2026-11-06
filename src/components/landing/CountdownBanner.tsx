import React, { useState, useEffect } from 'react';
import { Clock, Zap } from 'lucide-react';
import { CountdownConfig } from '../../types';

interface Props {
  config: CountdownConfig;
  variant?: 'banner' | 'card';
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export const CountdownBanner: React.FC<Props> = ({ config, variant = 'banner' }) => {
  const [timeLeft, setTimeLeft] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  useEffect(() => {
    if (!config.enabled || !config.targetDate) return;

    const calculateTime = () => {
      const target = new Date(config.targetDate).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [config.enabled, config.targetDate]);

  if (!config.enabled) return null;

  if (variant === 'banner') {
    if (!config.showBanner) return null;

    return (
      <div
        id="top-urgency-banner"
        className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 text-white py-2 px-3 sm:px-4 text-xs sm:text-sm font-medium sticky top-0 z-40 shadow-sm"
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-200 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <span className="font-semibold tracking-wide flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              {config.urgencyBannerText}
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-xs bg-black/25 px-2.5 py-1 rounded-md border border-white/10">
            {timeLeft.isExpired ? (
              <span className="text-amber-200 font-sans font-medium">{config.expiredMessage}</span>
            ) : (
              <>
                <span className="text-amber-200 font-sans text-[11px] uppercase tracking-wider font-semibold mr-1">
                  Kết thúc sau:
                </span>
                <span className="bg-black/40 px-1.5 py-0.5 rounded text-white font-bold">
                  {String(timeLeft.days).padStart(2, '0')}d
                </span>
                <span>:</span>
                <span className="bg-black/40 px-1.5 py-0.5 rounded text-white font-bold">
                  {String(timeLeft.hours).padStart(2, '0')}h
                </span>
                <span>:</span>
                <span className="bg-black/40 px-1.5 py-0.5 rounded text-white font-bold">
                  {String(timeLeft.minutes).padStart(2, '0')}m
                </span>
                <span>:</span>
                <span className="bg-black/40 px-1.5 py-0.5 rounded text-amber-300 font-bold">
                  {String(timeLeft.seconds).padStart(2, '0')}s
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Card Variant (placed in hero or above form)
  return (
    <div
      id="countdown-timer-card"
      className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 sm:p-4 text-amber-950 shadow-sm"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-700 animate-pulse" />
          <span className="text-xs sm:text-sm font-bold tracking-tight uppercase text-amber-900">
            {config.title}
          </span>
        </div>
        <span className="inline-flex items-center text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 bg-amber-200/70 text-amber-900 rounded-full">
          Giới Hạn Suất
        </span>
      </div>

      {timeLeft.isExpired ? (
        <div className="p-2.5 bg-white/70 rounded-lg text-center text-xs font-semibold text-amber-900">
          {config.expiredMessage}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2 text-center font-mono">
          <div className="bg-white border border-amber-200 rounded-lg p-1.5 sm:p-2 shadow-xs">
            <span className="block text-base sm:text-xl font-extrabold text-neutral-900">
              {String(timeLeft.days).padStart(2, '0')}
            </span>
            <span className="text-[10px] font-sans font-semibold text-neutral-700 uppercase">
              Ngày
            </span>
          </div>
          <div className="bg-white border border-amber-200 rounded-lg p-1.5 sm:p-2 shadow-xs">
            <span className="block text-base sm:text-xl font-extrabold text-neutral-900">
              {String(timeLeft.hours).padStart(2, '0')}
            </span>
            <span className="text-[10px] font-sans font-semibold text-neutral-700 uppercase">
              Giờ
            </span>
          </div>
          <div className="bg-white border border-amber-200 rounded-lg p-1.5 sm:p-2 shadow-xs">
            <span className="block text-base sm:text-xl font-extrabold text-neutral-900">
              {String(timeLeft.minutes).padStart(2, '0')}
            </span>
            <span className="text-[10px] font-sans font-semibold text-neutral-700 uppercase">
              Phút
            </span>
          </div>
          <div className="bg-white border border-amber-200 rounded-lg p-1.5 sm:p-2 shadow-xs">
            <span className="block text-base sm:text-xl font-extrabold text-amber-800">
              {String(timeLeft.seconds).padStart(2, '0')}
            </span>
            <span className="text-[10px] font-sans font-semibold text-neutral-700 uppercase">
              Giây
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
