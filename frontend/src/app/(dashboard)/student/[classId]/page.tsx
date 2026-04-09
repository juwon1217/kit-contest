'use client';

import { useState, use, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import dynamic from 'next/dynamic';
const PDFViewer = dynamic(() => import('@/components/PDFViewer'), { ssr: false });

import AISidebar from '@/components/AISidebar';


export default function StudentDashboard({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = use(params);
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);


  // 수업 종료 감지 상태
  const [classStatus, setClassStatus] = useState<'active' | 'ended' | 'unknown'>('unknown');
  const [showEndedModal, setShowEndedModal] = useState(false);
  const [showNotEndedToast, setShowNotEndedToast] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const hasShownEndedModal = useRef(false);

  // 5초 폴링으로 수업 상태 확인
  const checkClassStatus = useCallback(async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/classes/${classId}/status`);
      if (res.ok) {
        const data = await res.json();
        const status = data.status as 'active' | 'ended';
        setClassStatus(status);
        if (status === 'ended' && !hasShownEndedModal.current) {
          hasShownEndedModal.current = true;
          setShowEndedModal(true);
          // 폴링 중단
          if (pollingRef.current) clearInterval(pollingRef.current);
        }
      }
    } catch (e) {
      // 네트워크 오류 시 무시
    }
  }, [classId]);

  useEffect(() => {
    checkClassStatus(); // 첫 진입 시 즉시 확인
    pollingRef.current = setInterval(checkClassStatus, 5000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [checkClassStatus]);

  const simulateAICall = async (action: 'explain' | 'explain-image' | 'chat', payload: any) => {
    setIsLoading(true);
    try {
      const token = sessionStorage.getItem('auth_token') || 'dev_student';

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
        reqBody = { session_id: sessionId || "dummy_session", message: payload.message, page: payload.page };
      }


      const res = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(reqBody)
      });

      if (!res.ok) throw new Error("API FAILED");

      const data = await res.json();
      if (data.session_id && action !== 'chat') setSessionId(data.session_id);

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.explanation || data.reply || "응답이 없습니다."
      }]);
    } catch (e) {
      console.error(e);
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
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      contextType: 'text_drag'
    }]);
    simulateAICall('explain', { text, page });
  };

  const handleAreaCapture = (image64: string, page: number) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: '[영역 캡처 이미지 질문]',
      contextType: 'area_capture'
    }]);
    simulateAICall('explain-image', { image64, page });
  };

  const handleChatSubmit = (text: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      contextType: 'follow_up'
    }]);
    simulateAICall('chat', { message: text, sessionId, page: currentPage });
  };


  const handleGoToQuiz = () => {
    router.push(`/quiz/${classId}`);
  };

  return (
    <div className="h-screen w-full flex flex-col bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {/* GNB */}
      <header className="flex-none h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-6 shadow-sm z-10">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Edu-Lens AI <span className="text-sm font-normal text-gray-500 ml-2">Student Mode</span>
        </h1>
        <div className="ml-auto flex items-center space-x-4">
          {/* 수업 상태 배지 */}
          <span className={`text-sm font-medium px-3 py-1 rounded-full transition-all ${
            classStatus === 'ended'
              ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
              : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
          }`}>
            {classStatus === 'ended' ? '🔴 수업 종료됨' : '🟢 수업 진행 중'}
          </span>

          {/* 수업 종료 후에만 퀴즈 버튼 활성화 */}
          {classStatus === 'ended' ? (
            <button
              onClick={handleGoToQuiz}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition animate-pulse"
            >
              📝 퀴즈 시작
            </button>
          ) : (
            <button
              onClick={() => {
                setShowNotEndedToast(true);
                setTimeout(() => setShowNotEndedToast(false), 3000);
              }}
              className="px-4 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded-md text-sm font-medium cursor-not-allowed"
              title="선생님이 수업을 종료해야 퀴즈를 시작할 수 있습니다"
            >
              🔒 퀴즈 대기 중
            </button>
          )}

          <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
            S
          </div>
        </div>
      </header>

      {/* "아직 종료 안됨" 토스트 */}
      {showNotEndedToast && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-gray-800 text-white px-6 py-3 rounded-full shadow-lg text-sm font-medium flex items-center space-x-2">
            <span>⏳</span>
            <span>아직 선생님이 수업을 종료하지 않았습니다.</span>
          </div>
        </div>
      )}

      {/* 2분할 레이아웃 */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal">
          <Panel defaultSize={80} minSize={50}>
            <PDFViewer
              classId={classId}
              role="student"
              onTextSelect={handleTextSelect}
              onAreaCapture={handleAreaCapture}
              onPageChange={setCurrentPage}
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

      {/* 수업 종료 모달 */}
      {showEndedModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">수업이 종료되었습니다!</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-2">선생님이 수업을 마쳤습니다.</p>
            <p className="text-indigo-600 dark:text-indigo-400 font-medium mb-6">
              개인 맞춤형 퀴즈가 준비되고 있습니다. 지금 바로 퀴즈를 시작하세요!
            </p>
            <div className="flex flex-col space-y-3">
              <button
                onClick={handleGoToQuiz}
                className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition transform hover:scale-105"
              >
                📝 퀴즈 시작하기
              </button>
              <button
                onClick={() => setShowEndedModal(false)}
                className="text-gray-500 dark:text-gray-400 text-sm hover:text-gray-700 dark:hover:text-gray-200 transition"
              >
                나중에 하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
