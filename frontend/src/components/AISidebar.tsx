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
    <div className="flex flex-col w-full h-full bg-white dark:bg-gray-800">
      {/* 헤더 */}
      <div className="flex-none p-4 border-b border-gray-200 dark:border-gray-700 bg-indigo-50 dark:bg-indigo-900/20">
        <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-300 flex items-center">
          <span className="mr-2">✨</span> AI 튜터
        </h3>
        <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
          텍스트를 드래그하거나 질문을 입력하세요.
        </p>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 text-center">
            <span className="text-4xl mb-3">💬</span>
            <p>아직 대화가 없습니다.<br/>PDF에서 모르는 부분을 드래그해보세요!</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const isContext = msg.contextType === 'text_drag' || msg.contextType === 'area_capture';
            return (
              <div key={msg.id || idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    isUser 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-tl-none'
                  }`}
                >
                  {isContext && isUser && (
                    <div className="text-xs bg-indigo-800/50 px-2 py-1 rounded mb-2 border-l-2 border-indigo-400">
                      {msg.contextType === 'text_drag' ? '📝 텍스트 선택됨' : '🖼️ 영역 캡처됨'}
                    </div>
                  )}
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            );
          })
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-tl-none px-5 py-4 flex space-x-2 items-center">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="flex-none p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="AI에게 질문하기..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex-none w-10 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center disabled:opacity-50 transition-colors focus:outline-none"
          >
            ↑
          </button>
        </form>
      </div>
    </div>
  );
}
