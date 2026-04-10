'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { getApiUrl } from '@/lib/api';

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
        const res = await fetch(`${getApiUrl()}/api/classes/${classId}/pdf`);

        if (res.ok) {
          const blob = await res.blob();
          setPdfUrl(URL.createObjectURL(blob));
          return;
        }
      } catch (e) {
        console.error("PDF Fetch Error:", e);
      }
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

    if (cropBox.width < 10 || cropBox.height < 10) return;

    const sourceCanvas = pageWrapperRef.current.querySelector("canvas");
    if (!sourceCanvas) {
      alert("페이지 Canvas를 찾을 수 없습니다.");
      return;
    }

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
    const base64Data = dataUrl.split(",")[1];

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
        className="absolute border border-[#0071e3] bg-[#0071e3]/20"
        style={{ left, top, width, height, pointerEvents: 'none' }}
      />
    );
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#f5f5f7] dark:bg-[#1d1d1f] overflow-hidden font-sf-text">
      {/* 툴바 */}
      <div className="flex items-center justify-between px-[20px] py-[10px] bg-white/80 dark:bg-black/80 backdrop-blur-[20px] backdrop-saturate-[180%] border-b border-black/5 dark:border-white/10 flex-none z-10">
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-black/80 dark:text-white/80 text-[14px]">
            {role === 'instructor' ? '강사 화면' : '학생 화면'} - 클래스: {classId}
          </span>
        </div>
        <div className="flex items-center space-x-[10px]">
          <button onClick={handlePrevPage} disabled={currentPage <= 1 || isCapturing} className="px-[12px] py-[4px] bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black/80 dark:text-white/80 rounded-[8px] disabled:opacity-50 text-[12px] font-medium transition">이전</button>
          <span className="text-[12px] text-black/60 dark:text-white/60 font-sf-display tracking-widest">{currentPage} / {totalPages || '?'}</span>
          <button onClick={handleNextPage} disabled={currentPage >= totalPages || isCapturing} className="px-[12px] py-[4px] bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black/80 dark:text-white/80 rounded-[8px] disabled:opacity-50 text-[12px] font-medium transition">다음</button>
          {/* 줌 */}
          <div className="flex items-center space-x-[4px] ml-[10px] border-l pl-[10px] border-black/10 dark:border-white/10">
            <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} disabled={isCapturing} className="w-[24px] h-[24px] flex items-center justify-center bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 rounded-[8px] text-[12px] font-medium disabled:opacity-50 transition">−</button>
            <span className="text-[10px] text-black/50 dark:text-white/50 w-[40px] text-center font-sf-display">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(3, s + 0.2))} disabled={isCapturing} className="w-[24px] h-[24px] flex items-center justify-center bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 rounded-[8px] text-[12px] font-medium disabled:opacity-50 transition">+</button>
          </div>
        </div>
        <div className="flex space-x-2">
          {role === 'student' && (
            <button 
              onClick={() => setIsCapturing(!isCapturing)}
              className={`px-[12px] py-[6px] text-[12px] font-medium border rounded-[8px] transition ${isCapturing ? 'bg-[#0071e3] text-white border-[#0071e3]' : 'bg-transparent text-[#0071e3] border-[#0071e3]/30 hover:bg-[#0071e3]/5 dark:text-[#2997ff] dark:border-[#2997ff]/30 dark:hover:bg-[#2997ff]/10'}`}
            >
              {isCapturing ? '캡처 취소' : '영역 캡처 모드'}
            </button>
          )}
        </div>
      </div>

      {isCapturing && (
        <div className="bg-[#0071e3]/10 dark:bg-[#2997ff]/20 py-[4px] text-center text-[10px] font-semibold text-[#0071e3] dark:text-[#2997ff] flex-none z-10 border-b border-[#0071e3]/20 dark:border-[#2997ff]/30">
          클릭 후 드래그하여 PDF 상의 질문할 영역을 선택하세요.
        </div>
      )}

      {/* PDF 뷰어 메인 */}
      <div 
        className="flex-1 overflow-auto flex justify-center p-[20px] bg-[#f5f5f7] dark:bg-[#1d1d1f]" 
        onMouseUp={handleTextMouseUp}
      >
        {pdfUrl ? (
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex flex-col items-center justify-center h-full">
                <div className="w-[30px] h-[30px] border-[2px] border-black/10 dark:border-white/10 rounded-full animate-spin border-t-[#0071e3]"></div>
                <p className="mt-[15px] text-[#0071e3] dark:text-[#2997ff] text-[12px] font-medium tracking-tight">PDF 렌더링 중...</p>
              </div>
            }
            error={
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-[#ff3b30] text-[14px] font-medium mb-[4px]">PDF를 불러올 수 없습니다</p>
                <p className="text-[12px] text-black/50 dark:text-white/50 mb-[15px]">아래에서 파일을 직접 선택해주세요.</p>
                <label className="px-[16px] py-[8px] bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-[8px] cursor-pointer transition font-medium text-[14px]">
                  PDF 파일 선택
                  <input type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" />
                </label>
              </div>
            }
          >
            <div 
              ref={pageWrapperRef} 
              className="relative inline-block shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] bg-white"
            >
              <Page
                pageNumber={currentPage}
                scale={scale}
                renderTextLayer={role === 'student' && !isCapturing}
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
            <div className="bg-white dark:bg-[#272729] rounded-[24px] shadow-[var(--apple-shadow-card)] p-[40px] text-center border border-black/5 dark:border-white/10 w-full transition-transform hover:scale-[1.01]">
              <h3 className="text-[21px] font-sf-display font-semibold text-apple-text-dark dark:text-white mb-[8px] leading-[1.19]">PDF 파일을 선택하세요</h3>
              <p className="text-[14px] text-black/50 dark:text-white/50 mb-[30px] leading-[1.29]">강의 자료를 업로드하면 화면에 동기화됩니다.</p>
              <label className="inline-block px-[20px] py-[12px] bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium rounded-[11px] cursor-pointer transition text-[14px] outline-none focus:ring-2 focus:ring-[#0071e3]/50">
                파일 찾아보기
                <input type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
