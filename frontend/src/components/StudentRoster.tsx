'use client';

import { useState, useEffect } from 'react';

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

        const res = await fetch(`http://127.0.0.1:8000/api/classes/${classId}/roster`, {

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
    <div className="h-full bg-white dark:bg-gray-800 flex flex-col overflow-hidden border-l border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-none">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center">
          <span className="mr-2">🧑‍🤝‍🧑</span> 학생 명부
        </h2>
        <p className="text-xs text-gray-500 mt-1">접속 현황 및 질문 누적</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-0">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {students.map((student) => (
            <li key={student.studentId} className="px-4 py-3 flex flex-col hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm">
                      {student.profileImage}
                    </div>
                    <span className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-gray-800 bg-${student.isOnline ? 'green' : 'gray'}-500`} />
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{student.name}</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
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
