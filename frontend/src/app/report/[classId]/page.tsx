'use client';

import { useState, useEffect, use } from 'react';

// 임시 모델
interface StudentReport {
  student_id: string;
  performance: { total_quizzes: number; correct_count: number; accuracy: number };
  participation: { total_questions: number };
  keywords: string[];
}

interface InstructorReport {
  overview: { total_students: number; total_questions: number; average_accuracy: number };
  hot_pages: number[];
}

export default function ReportPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = use(params);
  
  // 시뮬레이션용 Role 스위칭 (실제로는 로그인 세션 반영)
  const [role, setRole] = useState<'student' | 'instructor'>('student');
  const [loading, setLoading] = useState(true);

  // 더미 데이터 상태
  const [studentData, setStudentData] = useState<StudentReport | null>(null);
  const [instructorData, setInstructorData] = useState<InstructorReport | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('auth_token') || '';
        const userRole = localStorage.getItem('user_role') || 'student';
        const isInstructor = userRole === 'instructor';
        setRole(isInstructor ? 'instructor' : 'student');

        const endpoint = isInstructor 
          ? `/api/report/${classId}/instructor`
          : `/api/report/${classId}/student/${token}`;

        const res = await fetch(`http://localhost:8000${endpoint}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          if (isInstructor) setInstructorData(data.report);
          else setStudentData(data.report);
        } else {
          throw new Error("API FAILED");
        }
      } catch (e) {
        console.warn("리포트 API 연동 실패, MVP 더미 데이터 삽입");
        // 학생 더미
        setStudentData({
          student_id: "stu_01",
          performance: { total_quizzes: 2, correct_count: 2, accuracy: 100 },
          participation: { total_questions: 5 },
          keywords: ["의존성 주입", "데이터 모델", "Next.js", "서버 컴포넌트"]
        });

        // 강사 더미
        setInstructorData({
          overview: { total_students: 45, total_questions: 128, average_accuracy: 78.5 },
          hot_pages: [12, 18, 5]
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchReport();
  }, [classId]);

  if (loading) {
     return (
       <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
         <div className="animate-pulse flex flex-col items-center">
           <span className="text-4xl text-indigo-500">📊</span>
           <p className="mt-4 text-indigo-600 dark:text-indigo-400 font-medium">학습 리포트를 생성하는 중...</p>
         </div>
       </div>
     );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* 상단 통합 컨트롤 패널 */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow flex flex-col sm:flex-row items-center justify-between border-b-4 border-indigo-500">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">최종 학습 리포트</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Class ID: <span className="font-mono text-indigo-600 dark:text-indigo-400">{classId.toUpperCase()}</span>
            </p>
          </div>
          
          <div className="mt-4 sm:mt-0 flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button 
              onClick={() => setRole('student')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition ${role === 'student' ? 'bg-white dark:bg-gray-600 shadow text-indigo-600 dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400'}`}
            >
              학생 뷰
            </button>
            <button 
              onClick={() => setRole('instructor')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition ${role === 'instructor' ? 'bg-white dark:bg-gray-600 shadow text-indigo-600 dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400'}`}
            >
              강사 뷰
            </button>
          </div>
        </div>

        {/* 뷰 별 패널 */}
        {role === 'student' && studentData && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* 성취도 패널 */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center">
                  <span className="text-2xl mr-2">🎯</span> 퀴즈 성취도
                </h3>
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="relative h-32 w-32 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mb-4">
                     <span className="text-3xl font-black text-indigo-600 dark:text-indigo-300">
                       {studentData.performance.accuracy}%
                     </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 font-medium">
                    {studentData.performance.total_quizzes}문제 중 {studentData.performance.correct_count}문제 정답
                  </p>
                </div>
              </div>

              {/* 참여도 패널 */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow flex flex-col justify-between">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center">
                  <span className="text-2xl mr-2">🔥</span> 활동 참여 점수
                </h3>
                <div className="flex-1 flex flex-col justify-center">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">누적 질문 횟수</p>
                  <div className="flex items-end mb-2">
                    <span className="text-5xl font-extrabold text-orange-500">{studentData.participation.total_questions}</span>
                    <span className="text-xl ml-2 font-bold text-gray-400">회</span>
                  </div>
                  {/* Tailwind 커스텀 프로그레스 바 */}
                  <div className="w-full bg-gray-200 dark:bg-gray-700 h-3 rounded-full mt-4 overflow-hidden">
                    <div className="bg-orange-500 h-full rounded-full" style={{ width: `${Math.min(studentData.participation.total_questions * 10, 100)}%` }}></div>
                  </div>
                </div>
              </div>

            </div>

            {/* 질문 키워드 클라우드 */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center">
                <span className="text-2xl mr-2">🏷️</span> 자주 질문한 키워드
              </h3>
              <div className="flex flex-wrap gap-3">
                {studentData.keywords.map((kw, i) => (
                  <span key={i} className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-bold border border-indigo-100 dark:border-indigo-800">
                    #{kw}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {role === 'instructor' && instructorData && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              
              {/* 총괄 스탯 박스 1 */}
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-2xl shadow text-white flex flex-col justify-center items-center">
                <p className="text-indigo-100 font-semibold mb-1">총 수강 인원</p>
                <span className="text-4xl font-extrabold">{instructorData.overview.total_students}명</span>
              </div>
              
              {/* 총괄 스탯 박스 2 */}
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-2xl shadow text-white flex flex-col justify-center items-center">
                <p className="text-emerald-100 font-semibold mb-1">전체 질문 발생</p>
                <span className="text-4xl font-extrabold">{instructorData.overview.total_questions}건</span>
              </div>
              
              {/* 총괄 스탯 박스 3 */}
              <div className="bg-gradient-to-br from-orange-400 to-rose-500 p-6 rounded-2xl shadow text-white flex flex-col justify-center items-center">
                <p className="text-orange-100 font-semibold mb-1">반 평균 퀴즈 정답률</p>
                <span className="text-4xl font-extrabold">{instructorData.overview.average_accuracy}%</span>
              </div>

            </div>

            {/* 취약 페이지 (Hot Pages) 랭킹 */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center">
                <span className="text-2xl mr-2">🚨</span> 취약 구간 (Hot Pages) TOP 3
              </h3>
              <div className="space-y-4">
                {instructorData.hot_pages.map((page, index) => {
                  // 임의의 질문 수 기반 막대 길이 부여
                  const mockCount = 30 - (index * 8); 
                  const percentage = mockCount; 

                  return (
                    <div key={index} className="flex items-center">
                      <div className="w-12 text-center text-xl font-bold text-gray-400 mr-4">
                        {index + 1}위
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Page {page}</span>
                          <span className="text-sm font-bold text-rose-500">{mockCount}건 질문</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-rose-500 h-2 rounded-full" 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
