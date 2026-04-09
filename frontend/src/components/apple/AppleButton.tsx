import React, { ButtonHTMLAttributes } from 'react';

interface AppleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'dark' | 'pill' | 'filter' | 'media';
}

export default function AppleButton({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}: AppleButtonProps) {
  // 기본 Apple 공통 버튼 스타일 (폰트 및 포커스 링)
  const baseStyle = "transition-all duration-200 outline-none focus:ring-2 focus:ring-apple-focus-ring font-sf-text";
  
  // DESIGN.md 기반 색상 및 특성 매핑
  const variants = {
    primary: "bg-apple-blue text-white px-[15px] py-[8px] rounded-[8px] text-[17px] hover:brightness-110",
    dark: "bg-apple-text-dark text-white px-[15px] py-[8px] rounded-[8px] text-[17px] hover:brightness-110",
    pill: "bg-transparent text-apple-link-blue border border-apple-link-blue rounded-[980px] px-4 py-1 text-[14px] hover:underline",
    filter: "bg-[#fafafc] text-black/80 px-[14px] py-[4px] rounded-[11px] border-[3px] border-black/5 text-[14px]",
    media: "bg-[#d2d2d7]/64 text-black/48 rounded-full w-11 h-11 flex items-center justify-center hover:scale-95 text-[17px]"
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
}
