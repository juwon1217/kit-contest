'use client';

import { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  contextType?: 'text_drag' | 'area_capture' | 'follow_up';
}

interface AISidebarProps {
  classId: string;
  studentId?: string;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
}

export default function AISidebar({ classId, messages, onSendMessage, isLoading }: AISidebarProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#f5f5f7] dark:bg-[#1d1d1f] font-sf-text">
      {/* 헤더 */}
      <div className="flex-none p-[16px] border-b border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/50 backdrop-blur-[20px]">
        <h3 className="text-[17px] font-semibold text-apple-text-dark dark:text-white flex items-center tracking-tight">
          AI Tutor
        </h3>
        <p className="text-[12px] text-black/50 dark:text-white/50 mt-[2px] font-medium leading-[1.2]">
          텍스트 드래그 또는 질문을 입력하세요.
        </p>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-[16px] space-y-[16px] bg-[#f5f5f7] dark:bg-[#1d1d1f]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-black/40 dark:text-white/40 text-center">
            <p className="text-[14px] font-medium">대화가 없습니다.</p>
            <p className="text-[12px] mt-1">질문을 입력해 보세요.</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const isContext = msg.contextType === 'text_drag' || msg.contextType === 'area_capture';
            return (
              <div key={msg.id || idx} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[75%] rounded-[18px] px-[16px] py-[10px] ${
                    isUser 
                      ? 'bg-[#0071e3] text-white rounded-br-[6px]' 
                      : 'bg-[#e5e5ea] dark:bg-[#2c2c2e] text-black dark:text-white rounded-bl-[6px]'
                  }`}
                >
                  {isContext && isUser && (
                    <div className="text-[10px] uppercase tracking-wider font-semibold bg-black/10 px-[6px] py-[2px] rounded-[4px] mb-[6px] opacity-80 inline-block">
                      {msg.contextType === 'text_drag' ? 'Text Selected' : 'Area Captured'}
                    </div>
                  )}
                  <div className="text-[15px] leading-[1.4] tracking-[-0.1px] whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            );
          })
        )}
        
        {isLoading && (
          <div className="flex justify-start w-full">
            <div className="bg-[#e5e5ea] dark:bg-[#2c2c2e] rounded-[18px] rounded-bl-[4px] px-[16px] py-[14px] flex space-x-[4px] items-center">
              <div className="w-[6px] h-[6px] bg-black/30 dark:bg-white/30 rounded-full animate-bounce"></div>
              <div className="w-[6px] h-[6px] bg-black/30 dark:bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-[6px] h-[6px] bg-black/30 dark:bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="flex-none p-[16px] border-t border-black/5 dark:border-white/10 bg-white dark:bg-[#272729]">
        <form onSubmit={handleSubmit} className="flex space-x-[10px]">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="AI에게 질문하기..."
            className="flex-1 px-[16px] py-[8px] border border-black/10 dark:border-white/10 rounded-full focus:outline-none focus:border-[#0071e3] transition bg-[#f5f5f7] dark:bg-[#1d1d1f] text-[15px] dark:text-white placeholder-black/40 dark:placeholder-white/40"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex-none w-[36px] h-[36px] bg-[#0071e3] text-white rounded-full flex items-center justify-center disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"></path>
              <path d="M12 5l7 7-7 7"></path>
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
