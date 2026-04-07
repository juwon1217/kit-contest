'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// pdf.js worker 설정
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  classId: string;
  role: 'instructor' | 'student';
  onTextSelect?: (text: string, page: number) => void;
  onAreaCapture?: (image64: string, page: number) => void;
  onPageChange?: (page: number) => void;
  onLoadSuccess?: (numPages: number) => void;
}

export default function PDFViewer({ classId, role, onTextSelect, onAreaCapture, onPageChange, onLoadSuccess }: PDFViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [scale, setScale] = useState(1.2);

  // 캡처 모드 상태
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureStart, setCaptureStart] = useState<{ x: number, y: number } | null>(null);
  const [captureCur, setCaptureCur] = useState<{ x: number, y: number } | null>(null);
  const pageWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchPdf = async () => {
      try {
        // 백엔드에서 PDF 로드 시도 (학생/강사 모두 자동 연동)
        const res = await fetch(`http://localhost:8000/api/classes/${classId}/pdf`);
        if (res.ok) {
          const blob = await res.blob();
          setPdfUrl(URL.createObjectURL(blob));
          return; // 성공 시 여기서 종료
        }
      } catch (e) {
        console.error("PDF Fetch Error:", e);
      }
      // 실패 시 기존처럼 sessionStorage 폴백 사용 (강사용)
      const stored = sessionStorage.getItem(`pdf_${classId}`);
      if (stored) {
        setPdfUrl(stored);
      }
    };
    
    fetchPdf();
  }, [classId]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setTotalPages(numPages);
    if (onLoadSuccess) onLoadSuccess(numPages);
  }, [onLoadSuccess]);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      const next = currentPage + 1;
      setCurrentPage(next);
      if (onPageChange) onPageChange(next);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      const prev = currentPage - 1;
      setCurrentPage(prev);
      if (onPageChange) onPageChange(prev);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      sessionStorage.setItem(`pdf_${classId}`, url);
    }
  };

  const handleTextMouseUp = () => {
    if (role !== 'student' || !onTextSelect || isCapturing) return;
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (text && text.length > 3) {
      onTextSelect(text, currentPage);
      selection?.removeAllRanges();
    }
  };

  // 캡처 기능
  const handleCaptureMouseDown = (e: React.MouseEvent) => {
    if (!isCapturing || !pageWrapperRef.current) return;
    e.preventDefault();
    const rect = pageWrapperRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCaptureStart({ x, y });
    setCaptureCur({ x, y });
  };

  const handleCaptureMouseMove = (e: React.MouseEvent) => {
    if (!isCapturing || !captureStart || !pageWrapperRef.current) return;
    const rect = pageWrapperRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCaptureCur({ x, y });
  };

  const handleCaptureMouseUp = (e: React.MouseEvent) => {
    if (!isCapturing || !captureStart || !captureCur || !pageWrapperRef.current) return;
    
    // 최종 영역 계산
    const rect = pageWrapperRef.current.getBoundingClientRect();
    const finalX = e.clientX - rect.left;
    const finalY = e.clientY - rect.top;
    
    const cropBox = {
      x: Math.min(captureStart.x, finalX),
      y: Math.min(captureStart.y, finalY),
      width: Math.abs(finalX - captureStart.x),
      height: Math.abs(finalY - captureStart.y)
    };

    setCaptureStart(null);
    setCaptureCur(null);
    setIsCapturing(false);

    if (cropBox.width < 10 || cropBox.height < 10) return; // 너무 작은 영역 패스

    // Canvas 추출
    const sourceCanvas = pageWrapperRef.current.querySelector("canvas");
    if (!sourceCanvas) {
      alert("페이지 Canvas를 찾을 수 없습니다.");
      return;
    }

    // 화면 상의 CSS 크기와 실제 캔버스 픽셀 비율(DevicePixelRatio 호환)을 고려
    const cssWidth = rect.width;
    const cssHeight = rect.height;
    const canvasWidth = sourceCanvas.width;
    const canvasHeight = sourceCanvas.height;
    
    const scaleX = canvasWidth / cssWidth;
    const scaleY = canvasHeight / cssHeight;

    const offCanvas = document.createElement("canvas");
    offCanvas.width = cropBox.width * scaleX;
    offCanvas.height = cropBox.height * scaleY;
    const ctx = offCanvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(
      sourceCanvas,
      cropBox.x * scaleX,
      cropBox.y * scaleY,
      cropBox.width * scaleX,
      cropBox.height * scaleY,
      0, 0,
      offCanvas.width,
      offCanvas.height
    );

    const dataUrl = offCanvas.toDataURL("image/jpeg", 0.9);
    const base64Data = dataUrl.split(",")[1]; // 헤더 제거

    if (onAreaCapture) {
      onAreaCapture(base64Data, currentPage);
    }
  };

  const renderCaptureBox = () => {
    if (!captureStart || !captureCur) return null;
    const left = Math.min(captureStart.x, captureCur.x);
    const top = Math.min(captureStart.y, captureCur.y);
    const width = Math.abs(captureCur.x - captureStart.x);
    const height = Math.abs(captureCur.y - captureStart.y);
    return (
      <div 
        className="absolute border-2 border-indigo-500 bg-indigo-500/20"
        style={{ left, top, width, height, pointerEvents: 'none' }}
      />
    );
  };

  return (
    <div className="flex flex-col w-full h-full bg-gray-200 dark:bg-gray-900 overflow-hidden">
      {/* 툴바 */}
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 flex-none z-10 shadow-sm">
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-gray-700 dark:text-gray-200 text-sm">
            {role === 'instructor' ? '강사 화면' : '학생 화면'} - 클래스: {classId}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={handlePrevPage} disabled={currentPage <= 1 || isCapturing} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded disabled:opacity-50 text-sm">이전</button>
          <span className="text-sm text-gray-600 dark:text-gray-300 font-mono">{currentPage} / {totalPages || '?'}</span>
          <button onClick={handleNextPage} disabled={currentPage >= totalPages || isCapturing} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded disabled:opacity-50 text-sm">다음</button>
          {/* 줌 */}
          <div className="flex items-center space-x-1 ml-2 border-l pl-2 border-gray-300 dark:border-gray-600">
            <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} disabled={isCapturing} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs disabled:opacity-50">−</button>
            <span className="text-xs text-gray-500 w-10 text-center">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(3, s + 0.2))} disabled={isCapturing} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs disabled:opacity-50">+</button>
          </div>
        </div>
        <div className="flex space-x-2">
          {role === 'student' && (
            <button 
              onClick={() => setIsCapturing(!isCapturing)}
              className={`px-3 py-1 text-sm border rounded transition ${isCapturing ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800'}`}
            >
              {isCapturing ? '캡처 취소' : '영역 캡처 모드'}
            </button>
          )}
        </div>
      </div>

      {isCapturing && (
        <div className="bg-indigo-100 dark:bg-indigo-900 py-1 text-center text-xs font-semibold text-indigo-700 dark:text-indigo-200 flex-none z-10 shadow-inner">
          클릭 후 드래그하여 PDF 상의 질문할 영역을 선택하세요.
        </div>
      )}

      {/* PDF 뷰어 메인 */}
      <div 
        className="flex-1 overflow-auto flex justify-center p-4 bg-gray-200 dark:bg-gray-900" 
        onMouseUp={handleTextMouseUp}
      >
        {pdfUrl ? (
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex flex-col items-center justify-center h-full animate-pulse">
                <span className="text-4xl">📄</span>
                <p className="mt-4 text-indigo-500 font-medium">PDF 로딩 중...</p>
              </div>
            }
            error={
              <div className="flex flex-col items-center justify-center h-full">
                <span className="text-4xl">⚠️</span>
                <p className="mt-4 text-red-500 font-medium">PDF를 불러올 수 없습니다.</p>
                <p className="text-sm text-gray-400 mt-1">아래에서 파일을 직접 선택해주세요.</p>
                <label className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-700 transition text-sm">
                  PDF 파일 선택
                  <input type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" />
                </label>
              </div>
            }
          >
            <div 
              ref={pageWrapperRef} 
              className="relative inline-block shadow-xl"
            >
              <Page
                pageNumber={currentPage}
                scale={scale}
                renderTextLayer={role === 'student' && !isCapturing} // 캡처 모드일 때는 텍스트 레이어를 끄면 드래그 방해 안 됨
                renderAnnotationLayer={false}
              />
              
              {/* 캡처 오버레이 */}
              {isCapturing && (
                <div 
                  className="absolute inset-0 z-50 cursor-crosshair select-none"
                  onMouseDown={handleCaptureMouseDown}
                  onMouseMove={handleCaptureMouseMove}
                  onMouseUp={handleCaptureMouseUp}
                  onMouseLeave={() => { setCaptureStart(null); setCaptureCur(null); }}
                >
                  {renderCaptureBox()}
                </div>
              )}
            </div>
          </Document>
        ) : (
          /* PDF가 없을 때 업로드 UI */
          <div className="w-full max-w-lg flex flex-col items-center justify-center h-full">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-10 text-center border-2 border-dashed border-gray-300 dark:border-gray-600 w-full">
              <span className="text-6xl block mb-4">📎</span>
              <h3 className="text-xl font-bold text-gray-700 dark:text-gray-200 mb-2">PDF 파일을 선택하세요</h3>
              <p className="text-sm text-gray-400 mb-6">강의 자료를 업로드하면 여기에 표시됩니다.</p>
              <label className="inline-block px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl cursor-pointer hover:bg-indigo-700 transition shadow-md">
                파일 선택
                <input type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
