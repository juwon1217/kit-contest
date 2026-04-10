'use client';

import { useState, use, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import dynamic from 'next/dynamic';
const PDFViewer = dynamic(() => import('@/components/PDFViewer'), { ssr: false });

import AISidebar from '@/components/AISidebar';
import { getApiUrl } from '@/lib/api';


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
      const res = await fetch(`${getApiUrl()}/api/classes/${classId}/status`);
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
        reqBody = { session_id: sessionId || "dummy_session", message: payload.message, page: payload.page, class_id: classId };
      }


      const res = await fetch(`${getApiUrl()}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(reqBody)
      });

      if (!res.ok) throw new Error("API FAILED");

      const data = await res.json();
      if (data.session_id) setSessionId(data.session_id);

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
    <div className="h-screen w-full flex flex-col bg-apple-gray dark:bg-apple-black overflow-hidden font-sf-text">
      {/* GNB - Apple Glass Effect */}
      <header className="flex-none h-[48px] bg-black/80 backdrop-blur-[20px] backdrop-saturate-[180%] border-b border-white/10 flex items-center px-6 z-50 sticky top-0">
        <h1 className="text-[14px] leading-[1.29] font-medium text-white flex items-center tracking-tight">
          <span className="font-sf-display font-semibold mr-1 text-[16px]"></span> Edu-Lens AI
          <span className="ml-3 px-[6px] py-[2px] text-[10px] leading-[1.0] font-medium bg-white/10 text-white/70 rounded-[4px] border border-white/5">
            Student
          </span>
        </h1>
        <div className="ml-auto flex items-center space-x-[15px]">
          {/* 수업 상태 배지 */}
          <span className={`text-[12px] font-medium px-[8px] py-[2px] rounded-[4px] border transition-all ${
            classStatus === 'ended'
              ? 'bg-[#ff3b30]/10 border-[#ff3b30]/20 text-[#ff3b30]'
              : 'bg-[#34c759]/10 border-[#34c759]/20 text-[#34c759]'
          }`}>
            {classStatus === 'ended' ? 'Class Ended' : 'Live'}
          </span>

          {/* 수업 종료 후에만 퀴즈 버튼 활성화 */}
          {classStatus === 'ended' ? (
            <button
              onClick={handleGoToQuiz}
              className="px-[12px] py-[4px] bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-[11px] text-[12px] font-medium transition-colors"
            >
              Start Quiz
            </button>
          ) : (
            <button
              onClick={() => {
                setShowNotEndedToast(true);
                setTimeout(() => setShowNotEndedToast(false), 3000);
              }}
              className="px-[12px] py-[4px] bg-white/10 text-white/50 rounded-[11px] text-[12px] font-medium cursor-not-allowed"
              title="선생님이 수업을 종료해야 퀴즈를 시작할 수 있습니다"
            >
              Quiz Locked
            </button>
          )}

          <div className="w-[24px] h-[24px] bg-white/20 rounded-full flex items-center justify-center text-white font-medium text-[10px]">
            S
          </div>
        </div>
      </header>

      {/* "아직 종료 안됨" 토스트 */}
      {showNotEndedToast && (
        <div className="fixed top-[64px] left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-black/80 backdrop-blur-[20px] text-white px-6 py-3 rounded-[980px] shadow-[var(--apple-shadow-card)] text-[14px] font-medium flex items-center space-x-2 border border-white/10">
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

          <PanelResizeHandle className="w-[1px] bg-black/5 dark:bg-white/10 hover:bg-[#0071e3] transition-colors cursor-col-resize flex items-center justify-center">
            <div className="w-[4px] h-[32px] bg-black/10 dark:bg-white/20 rounded-full" />
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
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center backdrop-blur-[10px]">
          <div className="bg-white dark:bg-[#272729] rounded-[16px] shadow-[var(--apple-shadow-card)] p-[40px] max-w-md w-full mx-4 text-center">
            <h2 className="text-[28px] font-sf-display font-medium text-apple-text-dark dark:text-white mb-2 leading-[1.14] tracking-[0.196px]">수업이 종료되었습니다</h2>
            <p className="text-[14px] text-black/60 dark:text-white/60 mb-8 leading-[1.29] tracking-[-0.224px]">선생님이 수업을 마쳤습니다. 개인 맞춤형 퀴즈가 준비되었습니다.</p>
            <div className="flex flex-col space-y-[12px]">
              <button
                onClick={handleGoToQuiz}
                className="w-full px-[15px] py-[12px] bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium rounded-[8px] text-[17px] transition-colors outline-none focus:ring-2 focus:ring-[#0071e3]"
              >
                퀴즈 시작하기
              </button>
              <button
                onClick={() => setShowEndedModal(false)}
                className="w-full px-[15px] py-[12px] bg-transparent text-[#0066cc] dark:text-[#2997ff] font-medium rounded-[8px] text-[17px] hover:bg-black/5 dark:hover:bg-white/5 transition-colors outline-none"
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
