'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

// ─────────────────── 타입 정의 ───────────────────

interface IncorrectQuiz {
  question: string;
  user_answer: string;
  correct_answer: string;
  explanation: string;
}

interface StudentReport {
  student_name: string;
  incorrect_quizzes: IncorrectQuiz[];
  flashcards: string[];
}

interface HotPage {
  page: number;
  count: number;
}

interface CommonQuiz {
  id: string;
  questions: string[];
}

interface InstructorReport {
  ai_summary: string;
  hot_pages: HotPage[];
  common_quizzes: CommonQuiz[];
  student_roster: string[];
}

// ─────────────────── 마크다운 → HTML 변환 (보조용) ───────────────────
function renderMarkdown(text: string): string {
  if (!text) return "";
  return text
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-indigo-400 mt-6 mb-3 border-b border-indigo-500/30 pb-1">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-indigo-200 mt-4 mb-2">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-indigo-300">$1</strong>')
    .replace(/^- (.+)$/gm, '<li class="ml-5 text-gray-300 mb-1 list-disc">$1</li>')
    .replace(/\n\n/g, '<div class="mb-4"></div>')
    .replace(/\n/g, '<br/>');
}

// ─────────────────── 메인 컴포넌트 ───────────────────
export default function ReportPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = use(params);
  const router = useRouter();

  const [role, setRole] = useState<'student' | 'instructor'>('student');
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<StudentReport | null>(null);
  const [instructorData, setInstructorData] = useState<InstructorReport | null>(null);

  // 학생용 플래시카드 상태
  const [cardIdx, setCardIdx] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = sessionStorage.getItem('auth_token') || '';
        const userRole = sessionStorage.getItem('user_role') || 'student';

        // [추가] 데이터 로드 시작 시 이전 상태 초기화 (데이터 섞임 방지)
        setInstructorData(null);
        setStudentData(null);

        setRole(userRole as any);

        const res = await fetch(`http://127.0.0.1:8000/api/report/${classId}/view`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setRole(data.role); // 백엔드에서 반환된 실제 역할 설정
          if (data.role === 'instructor') setInstructorData(data.report);
          else setStudentData(data.report);
        }

      } catch (e) {
        console.error("Failed to fetch report:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [classId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-indigo-300 font-bold animate-pulse">고품격 AI 리포트 생성 중...</p>
      </div>
    );
  }

  // 데이터 없음 UI
  if (!studentData && !instructorData) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 text-white text-center">
        <div className="max-w-md bg-white/5 backdrop-blur-xl p-10 rounded-3xl border border-white/10 shadow-2xl">
          <div className="text-6xl mb-6">🏜️</div>
          <h2 className="text-2xl font-black mb-4">리포트가 비어있습니다</h2>
          <p className="text-gray-400 mb-8 leading-relaxed">아직 수업 활동 데이터가 부족하여 리포트를 생성할 수 없습니다. 수업에 참여하거나 종료된 후 다시 확인해주세요.</p>
          <button onClick={() => router.back()} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold transition">돌아가기</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* ────────────────── 배경 장식 ────────────────── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600 rounded-full blur-[120px]"></div>
      </div>

      {/* ────────────────── 헤더 ────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-[#0f172a]/70 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <span className="text-xl">📊</span>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                EDU-LENS REPORT
              </h1>
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{classId}</p>
            </div>
          </div>
          <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-indigo-300">
            {role === 'instructor' ? '강사 모드' : '학생 모드'}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 relative z-10">
        
        {/* ══════════════════ [강사 뷰] ══════════════════ */}
        {role === 'instructor' && instructorData && (
          <div className="space-y-12">
            
            {/* 1. AI 분석 요약 (줄글) */}
            <section className="bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10 shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                <span className="text-8xl">🤖</span>
              </div>
              <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-sm">✨</span>
                AI 수업 종합 분석 리포트
              </h2>
              <div 
                className="text-slate-300 leading-relaxed text-lg"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(instructorData.ai_summary) }}
              />
              <div className="mt-8 p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-300 text-sm font-medium flex items-center gap-3">
                <span>💡</span>
                오늘의 인사이트: 다음 수업 시작 전, 학생들이 어려워한 부분을 5분 피드백으로 점검해보세요!
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 2. 핫페이지 TOP 5 */}
              <section className="bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10 shadow-xl">
                <h2 className="text-xl font-bold mb-8 flex items-center gap-3 text-rose-400">
                  <span>🔥</span> Students' Hot Pages
                </h2>
                <div className="space-y-6">
                  {instructorData.hot_pages.map((hp, idx) => {
                    const maxCount = Math.max(...instructorData.hot_pages.map(i => i.count));
                    const width = (hp.count / maxCount) * 100;
                    return (
                      <div key={`${hp.page}-${idx}`} className="group">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-bold text-slate-400">Page {hp.page}</span>
                          <span className="text-xs font-black text-rose-400">{hp.count} Questions</span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-rose-500 to-orange-400 rounded-full transition-all duration-1000"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* 3. 학생 명단 */}
              <section className="bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10 shadow-xl flex flex-col">
                <h2 className="text-xl font-bold mb-8 flex items-center gap-3 text-emerald-400">
                  <span>👥</span> 수업 참여 학생
                </h2>
                <div className="flex flex-wrap gap-3">
                  {instructorData.student_roster.length > 0 ? (
                    instructorData.student_roster.map((name, i) => (
                      <span key={i} className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 font-bold text-sm">
                        {name}
                      </span>
                    ))
                  ) : (
                    <p className="text-slate-500 italic">참여한 학생이 없습니다.</p>
                  )}
                </div>
              </section>
            </div>

            {/* 4. 공통 퀴즈 목록 */}
            <section className="bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10 shadow-xl">
              <h2 className="text-xl font-bold mb-8 flex items-center gap-3 text-indigo-400">
                <span>📝</span> 제공된 공통 퀴즈
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {instructorData.common_quizzes.map((q, i) => (
                  <div key={q.id} className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-500/30 transition group">
                    <p className="text-xs font-bold text-indigo-400 mb-2 uppercase">Quiz Set #{i+1}</p>
                    <ul className="space-y-3">
                      {q.questions.map((text, qi) => (
                        <li key={qi} className="text-sm text-slate-300 flex gap-2">
                          <span className="text-indigo-500 font-black">Q.</span>
                          {text}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ══════════════════ [학생 뷰] ══════════════════ */}
        {role === 'student' && studentData && (
          <div className="max-w-3xl mx-auto space-y-12">
            
            {/* 1. 플래시카드 복습 (AI Notes) */}
            <section className="flex flex-col items-center">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-black mb-2 flex items-center justify-center gap-3">
                  <span>💡</span> AI 학습 요약 카드
                </h2>
                <p className="text-indigo-400 font-bold text-sm">오늘 질문한 내용을 한눈에 정리해보세요!</p>
              </div>

              {/* 카드 본체 */}
              <div 
                className="relative w-full aspect-[4/3] max-w-md group cursor-pointer"
                onClick={() => setCardIdx((prev) => (prev + 1) % studentData.flashcards.length)}
              >
                {/* 배경 장식 (여러 장 겹쳐진 느낌) */}
                <div className="absolute inset-0 translate-x-4 translate-y-4 bg-indigo-600/20 rounded-[40px] border border-white/5 shadow-2xl"></div>
                <div className="absolute inset-0 translate-x-2 translate-y-2 bg-indigo-600/40 rounded-[40px] border border-white/5 shadow-xl"></div>
                
                {/* 현재 카드 */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[40px] p-10 flex flex-col items-center justify-center text-center shadow-2xl transition hover:scale-[1.02] active:scale-[0.98]">
                  <div className="text-white/60 font-black mb-4 uppercase tracking-[0.2em] text-xs">
                    Card {cardIdx + 1} / {studentData.flashcards.length}
                  </div>
                  <p className={`text-2xl font-black text-white leading-tight ${studentData.flashcards[cardIdx].length > 40 ? 'text-lg' : 'text-2xl'}`}>
                    {studentData.flashcards[cardIdx]}
                  </p>
                  <div className="absolute bottom-10 text-white/40 text-[10px] font-bold">
                    카드를 눌러서 다음 내용 보기
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex gap-2">
                {studentData.flashcards.map((_, i) => (
                  <div key={i} className={`h-1.5 w-6 rounded-full transition-all duration-300 ${i === cardIdx ? 'bg-indigo-500 w-12' : 'bg-white/10'}`}></div>
                ))}
              </div>
            </section>

            {/* 2. 오답 퀴즈 리뷰 */}
            <section>
              <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-rose-500 flex items-center justify-center text-sm">❗</span>
                나의 오답 노트
              </h2>
              {studentData.incorrect_quizzes.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center text-emerald-400 font-bold">
                  🎉 완벽합니다! 오늘 푼 모든 퀴즈를 맞히셨어요!
                </div>
              ) : (
                <div className="space-y-6">
                  {studentData.incorrect_quizzes.map((quiz, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-xl hover:bg-white/[0.07] transition">
                      <p className="text-slate-400 text-xs font-bold mb-3 uppercase tracking-wider">Incorrect Question #{i+1}</p>
                      <h3 className="text-xl font-bold text-white mb-6 leading-relaxed">{quiz.question}</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
                          <p className="text-[10px] font-black text-rose-500 uppercase mb-1">Your Choice</p>
                          <p className="text-slate-200 font-bold">{quiz.user_answer}</p>
                        </div>
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                          <p className="text-[10px] font-black text-emerald-500 uppercase mb-1">Correct Answer</p>
                          <p className="text-slate-200 font-bold">{quiz.correct_answer}</p>
                        </div>
                      </div>

                      <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                        <p className="text-xs font-bold text-indigo-400 mb-2">💡 AI 해설</p>
                        <p className="text-sm text-slate-400 leading-relaxed">{quiz.explanation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

          </div>
        )}

      </main>

      <footer className="text-center py-12 text-slate-600 text-[10px] font-bold tracking-widest uppercase">
        EDU-LENS • AI DRIVEN LEARNING REPORT
      </footer>
    </div>
  );
}
