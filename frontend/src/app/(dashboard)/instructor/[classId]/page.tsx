'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import PDFViewer from '@/components/PDFViewer';
import HeatmapPanel from '@/components/HeatmapPanel';
import StudentRoster from '@/components/StudentRoster';
import ToastNotifier from '@/components/ToastNotifier';

export default function InstructorDashboard({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = use(params);
  const router = useRouter();
  
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0); // 동적 페이지 수 연동
  const [toastMsg, setToastMsg] = useState<{ text: string; triggerId: number }>({ text: '', triggerId: 0 });
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const handlePageChange = async (newPage: number) => {
    const oldPage = currentPage;
    setCurrentPage(newPage);

    try {
      const res = await fetch(`http://localhost:8000/api/classes/${classId}/heatmap`);
      if (res.ok) {
        const data = await res.json();
        const heatmap = data.heatmap || [];
        // DB에서 가져온 실제 이전 페이지의 상호작용 횟수
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
    // MVP: 히트맵 메뉴에서 페이지 클릭 시 제어 (현재는 로그만 남김)
    console.log("히트맵 클릭 - 이동할 페이지: ", page);
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

      {/* 3분할 레이아웃: Heatmap (20) | PDF (60) | Roster (20) */}
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">수업을 종료하시겠습니까?</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">종료 후 학습 리포트 페이지로 이동됩니다.</p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition font-medium"
              >
                취소
              </button>
              <button
                onClick={() => router.push(`/report/${classId}`)}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition font-medium"
              >
                종료하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
