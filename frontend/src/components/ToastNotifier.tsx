'use client';

import { useEffect, useState } from 'react';

interface ToastNotifierProps {
  message: string;
  duration?: number;
  triggerId?: number;
}

export default function ToastNotifier({ message, duration = 3000, triggerId }: ToastNotifierProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (triggerId && message) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [message, duration, triggerId]);

  if (!isVisible) return null;

  return (
    <div className="absolute bottom-[40px] left-1/2 transform -translate-x-1/2 z-[9999] animate-fade-in-down">
      <div className="px-[20px] py-[10px] bg-black/80 dark:bg-white/80 backdrop-blur-[20px] text-white dark:text-black font-medium text-[14px] rounded-[100px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] flex items-center space-x-[8px] pointer-events-none">
        <span className="text-[14px]">ℹ️</span>
        <span>{message}</span>
      </div>
    </div>
  );
}
