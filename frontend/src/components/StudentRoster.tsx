'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/api';

interface StudentRosterProps {
  classId: string;
}

interface RosterEntry {
  studentId: string;
  name: string;
  profileImage: string;
  totalQuestions: number;
  isOnline: boolean;
}

export default function StudentRoster({ classId }: StudentRosterProps) {
  const [students, setStudents] = useState<RosterEntry[]>([]);

  // 시뮬레이션: 10초 주기로 학생들 질문 수 갱신 또는 상태 변동
  useEffect(() => {
    const fetchRoster = async () => {
      try {
        const token = sessionStorage.getItem('auth_token') || 'dev_instructor';

        const res = await fetch(`${getApiUrl()}/api/classes/${classId}/roster`, {

          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
           const data = await res.json();
           if (data.roster) {
             setStudents(data.roster);
             return;
          }
        }
      } catch (e) {
        console.error("Failed to fetch roster", e);
      }
    };

    fetchRoster();
    const intervalId = setInterval(fetchRoster, 5000); // 5초 주기로 단축
    return () => clearInterval(intervalId);
  }, [classId]);

  return (
    <div className="h-full bg-[#f5f5f7] dark:bg-[#1d1d1f] flex flex-col overflow-hidden font-sf-text">
      <div className="px-[16px] py-[12px] border-b border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/50 backdrop-blur-[20px] flex-none z-10">
        <h2 className="text-[15px] font-semibold text-apple-text-dark dark:text-white flex items-center tracking-tight">
          학생 명부
        </h2>
        <p className="text-[12px] text-black/50 dark:text-white/50 mt-[2px] font-medium leading-[1.2]">
          접속 현황 및 누적 데이터
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-[12px] bg-[#f5f5f7] dark:bg-[#1d1d1f]">
        <ul className="space-y-[8px]">
          {students.map((student) => (
            <li key={student.studentId} className="bg-white dark:bg-[#272729] rounded-[12px] px-[14px] py-[12px] flex flex-col shadow-[0_1px_3px_rgba(0,0,0,0.02)] border border-black/5 dark:border-white/5 transition-transform hover:scale-[1.02]">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-[12px]">
                  <div className="relative">
                    <div className="h-[32px] w-[32px] rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-apple-text-dark dark:text-white font-semibold text-[13px]">
                      {student.profileImage || student.name.charAt(0)}
                    </div>
                    <span className={`absolute bottom-[-2px] right-[-2px] block h-[10px] w-[10px] rounded-full ring-[2px] ring-white dark:ring-[#272729] ${student.isOnline ? 'bg-[#34c759]' : 'bg-black/20 dark:bg-white/20'}`} />
                  </div>
                  <p className="text-[14px] font-medium text-apple-text-dark dark:text-white tracking-tight">{student.name}</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="inline-flex items-center px-[8px] py-[3px] rounded-[6px] text-[11px] font-semibold bg-[#0071e3]/10 text-[#0071e3] dark:bg-[#2997ff]/20 dark:text-[#2997ff]">
                    Q: {student.totalQuestions}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
