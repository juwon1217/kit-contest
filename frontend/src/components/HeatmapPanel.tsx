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

  // Treemap Layout 연산
  const layoutNodes = useMemo(() => {
    if (totalPages <= 0) return [];

    const children = Array.from({ length: totalPages }, (_, i) => {
      const pageNum = i + 1;
      const info = heatData.find(d => d.page === pageNum);
      const queries = info ? info.questionCount : 0;
      return {
        name: `P.${pageNum}`,
        page: pageNum,
        queries: queries,
        weight: 1 + queries * 3 
      };
    });

    const data: any = { name: "root", children };

    const root = d3.hierarchy<any>(data).sum((d: any) => d.weight);

    d3.treemap<any>()
      .size([100, 100])
      .paddingInner(0.4)
      .paddingOuter(0.4)
      (root);

    return root.leaves();
  }, [totalPages, heatData]);

  const getBackgroundColor = (queries: number) => {
    if (queries === 0) return `rgba(120, 120, 128, 0.12)`; // Apple Gray 6 Fill
    const opacity = Math.min(1, 0.2 + queries * 0.2);
    return `rgba(0, 113, 227, ${opacity})`; // Apple Blue with opacity scale
  };

  return (
    <div className="h-full bg-white dark:bg-[#1d1d1f] flex flex-col overflow-hidden font-sf-text">
      <div className="px-[16px] py-[12px] border-b border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/50 backdrop-blur-[20px] flex-none z-10">
        <h2 className="text-[15px] font-semibold text-apple-text-dark dark:text-white flex items-center tracking-tight">
          Live Heatmap
        </h2>
        <p className="text-[11px] text-black/50 dark:text-white/50 mt-[2px] uppercase font-sf-display tracking-widest font-semibold">
          Auto Sync
        </p>
      </div>
      
      <div className="flex-1 relative w-full h-full p-[4px] bg-[#f5f5f7] dark:bg-black">
        {layoutNodes.map((node: any) => {
          const { page, queries } = node.data;
          const isCurrent = currentPage === page;
          const bgColor = getBackgroundColor(queries);
          
          return (
            <button
              key={page}
              onClick={() => onPageClick(page)}
              className="absolute group transition-all duration-700 ease-in-out hover:z-10 focus:outline-none overflow-hidden rounded-[4px]"
              style={{
                left: `${node.x0}%`,
                top: `${node.y0}%`,
                width: `${node.x1 - node.x0}%`,
                height: `${node.y1 - node.y0}%`,
                backgroundColor: bgColor,
                boxShadow: isCurrent ? '0 0 0 2px #0071e3 inset' : (queries > 0 ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'),
                border: queries === 0 ? '1px solid rgba(0,0,0,0.05)' : 'none'
              }}
            >
              {queries > 2 && (
                <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                  <span className="text-[#0071e3] font-sf-display font-black text-4xl">{queries}</span>
                </div>
              )}
              
              <div className="absolute top-[4px] left-[6px] flex flex-col items-start cursor-pointer">
                <span className={`font-sf-display tracking-tight text-[11px] font-bold leading-none ${isCurrent ? 'text-[#0071e3]' : (queries > 0 ? 'text-[#0058b0]' : 'text-black/40 dark:text-white/40')}`}>
                  P{page}
                </span>
                {queries > 0 && (
                  <span className={`text-[9px] font-semibold mt-[2px] leading-none ${isCurrent ? 'text-[#0071e3]/80' : 'text-[#0058b0]/80'}`}>
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
