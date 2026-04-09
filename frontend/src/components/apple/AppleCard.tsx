import React, { HTMLAttributes } from 'react';

interface AppleCardProps extends HTMLAttributes<HTMLDivElement> {
  theme?: 'light' | 'dark';
}

export default function AppleCard({ 
  children, 
  theme = 'light',
  className = '', 
  ...props 
}: AppleCardProps) {
  const baseStyle = "rounded-[8px] overflow-hidden";
  
  // Apple 디자인 가이드에 따른 카드 테마 (부드러운 그림자 및 표면 색상)
  const themes = {
    light: "bg-apple-gray text-apple-text-dark shadow-[var(--apple-shadow-card)]",
    dark: "bg-[#272729] text-apple-text-light"
  };

  return (
    <div 
      className={`${baseStyle} ${themes[theme]} ${className}`} 
      {...props}
    >
      {children}
    </div>
  );
}
