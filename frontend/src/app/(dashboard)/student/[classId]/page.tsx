'use client';

import { useState, use } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import PDFViewer from '@/components/PDFViewer';
import AISidebar from '@/components/AISidebar';

export default function StudentDashboard({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = use(params);
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const simulateAICall = async (action: 'explain'|'explain-image'|'chat', payload: any) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token') || 'dev_student';
      let endpoint = '';
      let reqBody: any = {};

      if (action === 'explain') {
        endpoint = '/api/ai/explain';
        reqBody = { class_id: classId, page: payload.page, text: payload.text, pdf_context: "" };
      } else if (action === 'explain-image') {
        endpoint = '/api/ai/explain-image';
        reqBody = { class_id: classId, page: payload.page, image_base64: payload.image64, pdf_context: "" };
      } else {
        endpoint = '/api/ai/chat';
        // Note: session_id validation usually occurs, but if missing dummy it
        reqBody = { session_id: sessionId || "dummy_session", message: payload.message };
      }

      const res = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(reqBody)
      });

      if (!res.ok) {
        throw new Error("API FAILED");
      }
      
      const data = await res.json();
      
      if (data.session_id && action !== 'chat') {
        setSessionId(data.session_id);
      }

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.explanation || data.reply || "응답이 없습니다."
      }]);
    } catch (e) {
      console.error(e);
      // 백엔드 에러/거절 시 MVP 용 임시 더미 응답
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "API 통신에 실패했습니다. (터미널에서 FastAPI 서버를 가동하거나 Gemini API Key를 확인하세요)"
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextSelect = (text: string, page: number) => {
    // 텍스트가 드래그 되면 AI 사이드바에 사용자 메시지로 등록하고 AI 호출
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      contextType: 'text_drag'
    }]);
    simulateAICall('explain', { text, page });
  };

  const handleAreaCapture = (image64: string, page: number) => {
    // 영역 캡처
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: '[영역 캡처 이미지 질문]',
      contextType: 'area_capture'
    }]);
    simulateAICall('explain-image', { image64, page });
  };

  const handleChatSubmit = (text: string) => {
    // 일반 채팅 입력
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      contextType: 'follow_up'
    }]);
    simulateAICall('chat', { message: text, sessionId });
  };

  return (
    <div className="h-screen w-full flex flex-col bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {/* GNB / 상단 헤더 */}
      <header className="flex-none h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-6 shadow-sm z-10">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Edu-Lens AI <span className="text-sm font-normal text-gray-500 ml-2">Student Mode</span>
        </h1>
        <div className="ml-auto flex items-center space-x-4">
          <span className="text-sm font-medium px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full">
            접속 중
          </span>
          <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
            S
          </div>
        </div>
      </header>

      {/* 2분할 레이아웃 (4:1) */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal">
          <Panel defaultSize={80} minSize={50}>
            <PDFViewer 
              classId={classId} 
              role="student" 
              onTextSelect={handleTextSelect}
              onAreaCapture={handleAreaCapture}
            />
          </Panel>
          
          <PanelResizeHandle className="w-2 bg-gray-200 dark:bg-gray-700 hover:bg-indigo-400 dark:hover:bg-indigo-600 transition-colors cursor-col-resize flex items-center justify-center">
            <div className="w-1 h-8 bg-gray-400 dark:bg-gray-500 rounded-full" />
          </PanelResizeHandle>
          
          <Panel defaultSize={20} minSize={15}>
            <AISidebar
              classId={classId}
              messages={messages}
              onSendMessage={handleChatSubmit}
              isLoading={isLoading}
            />
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
