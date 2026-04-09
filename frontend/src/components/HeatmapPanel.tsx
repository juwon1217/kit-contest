'use client';

import { useState, useEffect, useMemo } from 'react';
import * as d3 from 'd3-hierarchy';

interface HeatmapPanelProps {
  classId: string;
  totalPages: number;
  onPageClick: (page: number) => void;
  currentPage: number;
}

interface PageHeatData {
  page: number;
  questionCount: number;
  intensity: number;
}

export default function HeatmapPanel({ classId, totalPages, onPageClick, currentPage }: HeatmapPanelProps) {
  const [heatData, setHeatData] = useState<PageHeatData[]>([]);

  useEffect(() => {
    const fetchHeatmap = async () => {
      try {
        const token = sessionStorage.getItem('auth_token') || 'dev_instructor';

        const res = await fetch(`http://127.0.0.1:8000/api/classes/${classId}/heatmap`, {

          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.heatmap) {
            setHeatData(data.heatmap);
          }
        }
      } catch (e) {
        console.error("Failed to fetch heatmap data", e);
      }
    };

    fetchHeatmap();
    const intervalId = setInterval(fetchHeatmap, 5000); 
    return () => clearInterval(intervalId);
  }, [classId, totalPages]);

  // Treemap Layout 연산 (수학적으로 면적 비례값 도출)
  const layoutNodes = useMemo(() => {
    if (totalPages <= 0) return [];

    // D3 Hierarchy 인풋 구조 만들기
    const children = Array.from({ length: totalPages }, (_, i) => {
      const pageNum = i + 1;
      const info = heatData.find(d => d.page === pageNum);
      const queries = info ? info.questionCount : 0;
      return {
        name: `P.${pageNum}`,
        page: pageNum,
        queries: queries,
        // 기본 가중치 1. 질문이 발생할 때마다 가중치를 크게 붙여서 면적을 기하급수적으로 키움
        weight: 1 + queries * 3 
      };
    });

    const data: any = { name: "root", children };

    // D3 트리맵 구조 빌드 (가중치 취합)
    const root = d3.hierarchy<any>(data).sum((d: any) => d.weight);

    // 크기 100x100(비율 % 매핑), 내부 간격 미세 조정
    d3.treemap<any>()
      .size([100, 100])
      .paddingInner(0.4)
      .paddingOuter(0.4)
      (root);

    return root.leaves();
  }, [totalPages, heatData]);

  // 상호작용 빈도에 따른 그라데이션 컬러 반환 로직 (트레이딩뷰 차트 색상 참고)
  const getBackgroundColor = (queries: number) => {
    if (queries === 0) return `hsl(215, 20%, 25%)`; // 상호작용 없음: 차분한 차콜 블루 (트레이딩 기본 배색 느낌)
    // 횟수가 많아질수록 밝은 원색 블루로 변화
    const lightness = Math.max(30, 60 - queries * 5); 
    const saturation = Math.min(100, 40 + queries * 15);
    return `hsl(220, ${saturation}%, ${lightness}%)`;
  };

  return (
    <div className="h-full bg-gray-900 dark:bg-gray-950 flex flex-col overflow-hidden border-r border-gray-800">
      <div className="p-4 border-b border-gray-800 bg-gray-900 flex-none relative">
        <h2 className="text-lg font-bold text-gray-100 flex items-center">
          <span className="mr-2 text-blue-400">📊</span> Live Heatmap
        </h2>
        <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">TradingView Style | Auto Sync</p>
      </div>
      
      {/* 100% 면적을 갖는 컨테이너 - D3의 노드 좌표가 이 안에 절대위치(absolute)로 렌더링됨 */}
      <div className="flex-1 relative w-full h-full p-1">
        {layoutNodes.map((node: any) => {
          const { page, queries } = node.data;
          const isCurrent = currentPage === page;
          const bgColor = getBackgroundColor(queries);
          
          return (
            <button
              key={page}
              onClick={() => onPageClick(page)}
              className="absolute group transition-all duration-700 ease-in-out hover:z-10 focus:outline-none overflow-hidden rounded-sm"
              style={{
                left: `${node.x0}%`,
                top: `${node.y0}%`,
                width: `${node.x1 - node.x0}%`,
                height: `${node.y1 - node.y0}%`,
                backgroundColor: bgColor,
                boxShadow: isCurrent ? '0 0 0 2px #fff inset' : 'none',
              }}
            >
              {/* 면적이 충분히 클 때 커다란 질문 횟수 백그라운드 효과 (선택적) */}
              {queries > 2 && (
                <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                  <span className="text-white font-black text-4xl">{queries}</span>
                </div>
              )}
              
              <div className="absolute top-1 left-1.5 flex flex-col items-start cursor-pointer">
                <span className={`font-mono text-xs font-bold leading-none ${isCurrent ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                  P{page}
                </span>
                {queries > 0 && (
                  <span className="text-[10px] text-blue-100 font-semibold mt-0.5 leading-none">
                    {queries} Qs
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
