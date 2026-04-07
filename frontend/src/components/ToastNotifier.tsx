'use client';

import { useEffect, useState } from 'react';

interface ToastNotifierProps {
  message: string;
  duration?: number;
  triggerId?: number; // 토스트를 다시 띄우기 위한 식별자
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
    <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-down">
      <div className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-full shadow-lg flex items-center space-x-3 opacity-95">
        <span>💡</span>
        <span>{message}</span>
      </div>
    </div>
  );
}
