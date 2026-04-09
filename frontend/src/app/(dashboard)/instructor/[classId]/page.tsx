'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import dynamic from 'next/dynamic';
const PDFViewer = dynamic(() => import('@/components/PDFViewer'), { ssr: false });

import HeatmapPanel from '@/components/HeatmapPanel';
import StudentRoster from '@/components/StudentRoster';
import ToastNotifier from '@/components/ToastNotifier';


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

      const res = await fetch(`http://127.0.0.1:8000/api/classes/${classId}/heatmap`, {

        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        const heatmap = data.heatmap || [];
        const pageData = heatmap.find((h: any) => h.page === oldPage);
        const prevQCount = pageData ? pageData.questionCount : 0;
        const text = prevQCount > 0
          ? `이전 페이지(${oldPage}쪽)에서 ${prevQCount}건의 AI 질문이 발생했습니다.`
          : `이전 페이지(${oldPage}쪽)에서 발생한 질문이 없습니다.`;
        setToastMsg({ text, triggerId: Date.now() });
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

      const res = await fetch(`http://127.0.0.1:8000/api/classes/${classId}/end`, {

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
    <div className="h-screen w-full flex flex-col overflow-hidden bg-gray-100 dark:bg-gray-900 relative">
      <ToastNotifier message={toastMsg.text} triggerId={toastMsg.triggerId} />

      {/* GNB / 강사 상단 헤더 */}
      <header className="flex-none h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-6 shadow-sm z-10">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
          Edu-Lens AI
          <span className="ml-3 px-2 py-0.5 text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 rounded border border-indigo-200 dark:border-indigo-800">
            Instructor Mode
          </span>
        </h1>
        <div className="ml-auto flex items-center space-x-4">
          <button
            onClick={() => setShowEndConfirm(true)}
            className="px-4 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-md text-sm font-medium transition cursor-pointer"
          >
            수업 종료
          </button>
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold shadow-inner">
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

          <PanelResizeHandle className="w-2 bg-gray-200 dark:bg-gray-700 hover:bg-indigo-400 dark:hover:bg-indigo-600 transition-colors cursor-col-resize flex items-center justify-center">
            <div className="w-1 h-8 bg-gray-400 dark:bg-gray-500 rounded-full" />
          </PanelResizeHandle>

          <Panel defaultSize={60} minSize={40}>
            <PDFViewer
              classId={classId}
              role="instructor"
              onPageChange={handlePageChange}
              onLoadSuccess={setTotalPages}
            />
          </Panel>

          <PanelResizeHandle className="w-2 bg-gray-200 dark:bg-gray-700 hover:bg-indigo-400 dark:hover:bg-indigo-600 transition-colors cursor-col-resize flex items-center justify-center">
            <div className="w-1 h-8 bg-gray-400 dark:bg-gray-500 rounded-full" />
          </PanelResizeHandle>

          <Panel defaultSize={20} minSize={15}>
            <StudentRoster classId={classId} />
          </Panel>
        </PanelGroup>
      </div>

      {/* 수업 종료 확인 모달 */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center mb-4">
              <span className="text-3xl mr-3">🔴</span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">수업을 종료하시겠습니까?</h3>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-5">
              <p className="text-amber-800 dark:text-amber-300 text-sm font-medium">⚠️ 종료 즉시 다음이 실행됩니다:</p>
              <ul className="mt-2 text-amber-700 dark:text-amber-400 text-xs space-y-1 list-disc list-inside">
                <li>학생들의 수업 접속이 차단됩니다</li>
                <li>히트맵 기반 공통 퀴즈가 생성됩니다</li>
                <li>개인별 맞춤형 퀴즈가 생성됩니다</li>
              </ul>
            </div>

            {endError && (
              <p className="text-red-500 text-sm mb-4 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">{endError}</p>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => { setShowEndConfirm(false); setEndError(''); }}
                disabled={isEnding}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition font-medium disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleEndClass}
                disabled={isEnding}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white rounded-lg transition font-medium flex items-center justify-center space-x-2"
              >
                {isEnding ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>처리 중...</span>
                  </>
                ) : (
                  <span>종료하기</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
