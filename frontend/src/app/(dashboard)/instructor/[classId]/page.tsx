'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import dynamic from 'next/dynamic';
const PDFViewer = dynamic(() => import('@/components/PDFViewer'), { ssr: false });

import HeatmapPanel from '@/components/HeatmapPanel';
import StudentRoster from '@/components/StudentRoster';
import ToastNotifier from '@/components/ToastNotifier';
import { getApiUrl } from '@/lib/api';


export default function InstructorDashboard({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = use(params);
  const router = useRouter();

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [toastMsg, setToastMsg] = useState<{ text: string; triggerId: number }>({ text: '', triggerId: 0 });
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [endError, setEndError] = useState('');

  const handlePageChange = async (newPage: number) => {
    const oldPage = currentPage;
    setCurrentPage(newPage);
    try {
      const token = sessionStorage.getItem('auth_token') || '';

      const res = await fetch(`${getApiUrl()}/api/classes/${classId}/heatmap`, {

        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        const heatmap = data.heatmap || [];
        const pageData = heatmap.find((h: any) => h.page === oldPage);
        const prevQCount = pageData ? pageData.questionCount : 0;
        
        if (prevQCount > 0) {
          const text = `이전 페이지(${oldPage}쪽)에서 ${prevQCount}건의 AI 질문이 발생했습니다.`;
          setToastMsg({ text, triggerId: Date.now() });
        }
      }
    } catch (e) {
      console.error("Failed to fetch page statistics", e);
    }
  };

  const handleHeatmapPageClick = (page: number) => {
    console.log("히트맵 클릭 - 이동할 페이지: ", page);
  };

  const handleEndClass = async () => {
    setIsEnding(true);
    setEndError('');
    try {
      const token = sessionStorage.getItem('auth_token') || '';

      const res = await fetch(`${getApiUrl()}/api/classes/${classId}/end`, {

        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || '수업 종료 요청 실패');
      }
      // 성공 시 리포트 페이지로 이동
      router.push(`/report/${classId}`);
    } catch (e: any) {
      console.error(e);
      setEndError(e.message || '오류가 발생했습니다. 다시 시도해 주세요.');
      setIsEnding(false);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-apple-gray dark:bg-apple-black relative font-sf-text">
      <ToastNotifier message={toastMsg.text} triggerId={toastMsg.triggerId} />

      {/* GNB / 강사 상단 헤더 - Apple Glass Effect */}
      <header className="flex-none h-[48px] bg-black/80 backdrop-blur-[20px] backdrop-saturate-[180%] border-b border-white/10 flex items-center px-6 z-50 sticky top-0">
        <h1 className="text-[14px] leading-[1.29] font-medium text-white flex items-center tracking-tight">
          <span className="font-sf-display font-semibold mr-1 text-[16px]"></span> Edu-Lens AI
          <span className="ml-3 px-[6px] py-[2px] text-[10px] leading-[1.0] font-medium bg-white/10 text-white/70 rounded-[4px] border border-white/5">
            Instructor
          </span>
        </h1>
        <div className="ml-auto flex items-center space-x-[15px]">
          <button
            onClick={() => setShowEndConfirm(true)}
            className="text-[12px] text-[#ff3b30] hover:text-[#ff453a] hover:underline outline-none transition font-medium tracking-[-0.12px]"
          >
            수업 종료
          </button>
          <div className="w-[24px] h-[24px] bg-white/20 rounded-full flex items-center justify-center text-white font-medium text-[10px]">
            I
          </div>
        </div>
      </header>

      {/* 3분할 레이아웃 */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal">
          <Panel defaultSize={20} minSize={15}>
            <HeatmapPanel
              classId={classId}
              totalPages={totalPages}
              onPageClick={handleHeatmapPageClick}
              currentPage={currentPage}
            />
          </Panel>

          <PanelResizeHandle className="w-[1px] bg-black/5 dark:bg-white/10 hover:bg-[#0071e3] transition-colors cursor-col-resize flex items-center justify-center">
            <div className="w-[4px] h-[32px] bg-black/10 dark:bg-white/20 rounded-full" />
          </PanelResizeHandle>

          <Panel defaultSize={60} minSize={40}>
            <PDFViewer
              classId={classId}
              role="instructor"
              onPageChange={handlePageChange}
              onLoadSuccess={setTotalPages}
            />
          </Panel>

          <PanelResizeHandle className="w-[1px] bg-black/5 dark:bg-white/10 hover:bg-[#0071e3] transition-colors cursor-col-resize flex items-center justify-center">
            <div className="w-[4px] h-[32px] bg-black/10 dark:bg-white/20 rounded-full" />
          </PanelResizeHandle>

          <Panel defaultSize={20} minSize={15}>
            <StudentRoster classId={classId} />
          </Panel>
        </PanelGroup>
      </div>

      {/* 수업 종료 확인 모달 */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center backdrop-blur-[10px]">
          <div className="bg-white dark:bg-[#272729] rounded-[16px] shadow-[var(--apple-shadow-card)] p-[30px] max-w-sm w-full mx-4 text-center border border-black/5 dark:border-white/10">
            <h3 className="text-[21px] font-sf-display font-semibold text-apple-text-dark dark:text-white mb-2 leading-[1.19]">수업을 종료하시겠습니까?</h3>
            <p className="text-[14px] text-black/60 dark:text-white/60 mb-6 leading-[1.29]">
              진행 중인 학생 접속이 차단되며,<br/>히트맵 기반 평가가 자동으로 시작됩니다.
            </p>

            {endError && (
              <p className="text-[#ff3b30] text-[14px] mb-4 bg-[#ff3b30]/10 p-2 rounded-[8px] font-medium">{endError}</p>
            )}

            <div className="flex flex-col space-y-[12px]">
              <button
                onClick={handleEndClass}
                disabled={isEnding}
                className="w-full px-[15px] py-[12px] bg-[#ff3b30] hover:bg-[#ff453a] disabled:bg-[#ff3b30]/50 text-white font-medium rounded-[8px] text-[17px] transition-colors outline-none focus:ring-2 focus:ring-[#ff3b30]/50 flex items-center justify-center"
              >
                {isEnding ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>처리 중...</span>
                  </>
                ) : (
                  <span>종료하기</span>
                )}
              </button>
              <button
                onClick={() => { setShowEndConfirm(false); setEndError(''); }}
                disabled={isEnding}
                className="w-full px-[15px] py-[12px] bg-transparent text-[#0071e3] dark:text-[#2997ff] border border-[#0071e3]/30 dark:border-[#2997ff]/30 font-medium rounded-[8px] text-[17px] hover:bg-black/5 dark:hover:bg-white/5 transition-colors outline-none disabled:opacity-50"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
