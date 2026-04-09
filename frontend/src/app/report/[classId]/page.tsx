'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import AppleCard from '@/components/apple/AppleCard';
import AppleButton from '@/components/apple/AppleButton';

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
    .replace(/^## (.+)$/gm, '<h2 class="text-[21px] font-sf-display font-semibold text-apple-text-dark dark:text-white mt-6 mb-3 border-b border-black/5 dark:border-white/10 pb-2">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="text-[17px] font-semibold text-apple-text-dark dark:text-white mt-4 mb-2">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#0071e3] dark:text-[#2997ff]">$1</strong>')
    .replace(/^- (.+)$/gm, '<li class="ml-5 text-black/80 dark:text-white/80 mb-1 list-disc">$1</li>')
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
      <div className="min-h-screen bg-apple-gray dark:bg-apple-black flex flex-col items-center justify-center font-sf-text">
        <div className="w-[40px] h-[40px] border-[3px] border-black/10 dark:border-white/10 rounded-full animate-spin border-t-[#0071e3] mb-4"></div>
        <p className="text-[14px] font-medium text-black/60 dark:text-white/60 loading-pulse">Generating Report...</p>
      </div>
    );
  }

  // 데이터 없음 UI
  if (!studentData && !instructorData) {
    return (
      <div className="min-h-screen bg-apple-gray dark:bg-apple-black flex items-center justify-center p-6 text-center font-sf-text">
        <AppleCard theme="light" className="max-w-md w-full p-[40px] dark:bg-[#272729]">
          <h2 className="text-[21px] font-sf-display font-semibold mb-4 text-apple-text-dark dark:text-white tracking-[0.231px]">리포트가 비어있습니다</h2>
          <p className="text-[14px] text-black/60 dark:text-white/60 mb-8 leading-[1.29]">아직 수업 활동 데이터가 부족하여 리포트를 생성할 수 없습니다. 수업에 참여하거나 종료된 후 다시 확인해주세요.</p>
          <AppleButton onClick={() => router.back()} variant="primary" className="w-full">돌아가기</AppleButton>
        </AppleCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-apple-gray dark:bg-apple-black text-apple-text-dark dark:text-white font-sf-text selection:bg-[#0071e3]/30">
      
      {/* ────────────────── 헤더 ────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-[20px] backdrop-saturate-[180%] border-b border-black/5 dark:border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-[48px] flex items-center justify-between">
          <div className="flex items-center gap-[15px]">
            <h1 className="text-[14px] font-medium tracking-tight text-black dark:text-white flex items-center">
              <span className="font-sf-display font-semibold mr-1 text-[16px]"></span> Edu-Lens Report
            </h1>
            <p className="text-[10px] font-semibold text-black/40 dark:text-white/40 uppercase tracking-widest">{classId}</p>
          </div>
          <div className="px-[8px] py-[2px] rounded-[4px] bg-black/5 dark:bg-white/10 text-[10px] font-semibold uppercase tracking-wider text-black/60 dark:text-white/60">
            {role === 'instructor' ? 'Instructor View' : 'Student View'}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-[40px] relative z-10">
        
        {/* ══════════════════ [강사 뷰] ══════════════════ */}
        {role === 'instructor' && instructorData && (
          <div className="max-w-5xl mx-auto space-y-[24px]">
            {/* Title / Hero section */}
            <div className="mb-[30px] flex items-end justify-between">
              <div>
                <h1 className="text-[32px] font-sf-display font-bold text-apple-text-dark dark:text-white tracking-tight mb-[4px]">Class Report</h1>
                <p className="text-[15px] text-black/50 dark:text-white/50 font-medium">수업이 모두 종료되었습니다. 아래에서 상세 데이터를 확인하세요.</p>
              </div>
              <button 
                onClick={() => window.print()}
                className="hidden md:flex items-center gap-[6px] px-[16px] py-[8px] bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 rounded-[8px] text-[13px] font-medium text-black/70 dark:text-white/70 transition"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                PDF 내보내기
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-[24px]">
              
              {/* 1. AI 분석 요약 (줄글) - 넓게 차지 */}
              <AppleCard theme="light" className="p-[32px] dark:bg-[#1d1d1f] lg:col-span-2 shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)] border border-black/5 dark:border-white/5">
                <div className="flex items-center gap-[10px] mb-[20px]">
                  <div className="w-[32px] h-[32px] rounded-[10px] bg-gradient-to-br from-[#ab63f7] to-[#4169e1] flex items-center justify-center text-white">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  </div>
                  <h2 className="text-[21px] font-sf-display font-semibold text-apple-text-dark dark:text-white tracking-[0.231px]">AI 종합 분석</h2>
                </div>
                
                <div 
                  className="text-black/80 dark:text-white/80 leading-[1.6] text-[15px] prose dark:prose-invert prose-p:my-[10px]"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(instructorData.ai_summary) }}
                />
                
                <div className="mt-[32px] p-[16px] bg-[#0071e3]/5 dark:bg-[#2997ff]/10 rounded-[12px] border border-[#0071e3]/10 dark:border-[#2997ff]/20 flex items-start gap-[12px]">
                  <span className="text-[#0071e3] dark:text-[#2997ff] mt-[2px]">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                  </span>
                  <div>
                    <h4 className="text-[#0071e3] dark:text-[#2997ff] text-[13px] font-bold uppercase tracking-wider mb-[4px]">Action Item</h4>
                    <p className="text-[#0058b0] dark:text-[#45a1ff] text-[14px] font-medium leading-[1.3]">다음 수업 시작 전, 학생들이 어려워한 부분을 5분 피드백으로 점검해보세요.</p>
                  </div>
                </div>
              </AppleCard>

              <div className="flex flex-col gap-[24px]">
                {/* 3. 학생 명단 */}
                <AppleCard theme="light" className="p-[28px] dark:bg-[#1d1d1f] shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)] border border-black/5 dark:border-white/5">
                  <h2 className="text-[17px] font-semibold mb-[20px] text-apple-text-dark dark:text-white flex items-center justify-between">
                    참여 학생
                    <span className="bg-[#34c759]/10 text-[#34c759] text-[11px] font-bold px-[8px] py-[4px] rounded-full">
                      {instructorData.student_roster.length}명
                    </span>
                  </h2>
                  <div className="flex gap-[8px] flex-wrap">
                    {instructorData.student_roster.length > 0 ? (
                      instructorData.student_roster.map((name, i) => (
                        <span key={i} className="px-[12px] py-[6px] bg-[#f5f5f7] dark:bg-[#2c2c2e] text-black/80 dark:text-white/80 rounded-[8px] font-medium text-[13px] border border-black/5 dark:border-white/5 transition-transform hover:scale-[1.05]">
                          {name}
                        </span>
                      ))
                    ) : (
                      <p className="text-[13px] text-black/40 dark:text-white/40">참여한 학생이 없습니다.</p>
                    )}
                  </div>
                </AppleCard>

                {/* 2. 핫페이지 TOP 5 */}
                <AppleCard theme="light" className="p-[28px] dark:bg-[#1d1d1f] shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)] border border-black/5 dark:border-white/5 flex-1">
                  <h2 className="text-[17px] font-semibold mb-[24px] text-apple-text-dark dark:text-white">
                    주요 질문 페이지
                  </h2>
                  <div className="space-y-[18px]">
                    {instructorData.hot_pages.map((hp, idx) => {
                      const maxCount = Math.max(...instructorData.hot_pages.map(i => i.count));
                      const width = (hp.count / maxCount) * 100;
                      return (
                        <div key={`${hp.page}-${idx}`} className="group relative">
                          <div className="flex justify-between items-center mb-[6px]">
                            <span className="text-[13px] font-medium text-black/70 dark:text-white/70">Page {hp.page}</span>
                            <span className="text-[11px] font-bold text-[#ff3b30] uppercase tracking-wide">{hp.count} Qs</span>
                          </div>
                          <div className="h-[6px] w-full bg-[#f5f5f7] dark:bg-[#2c2c2e] rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[#ff3b30] rounded-full transition-all duration-1000 ease-out"
                              style={{ width: `${width}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AppleCard>
              </div>
            </div>

            {/* 4. 공통 퀴즈 목록 */}
            <AppleCard theme="light" className="p-[32px] dark:bg-[#1d1d1f] shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)] border border-black/5 dark:border-white/5 mt-[24px]">
              <h2 className="text-[19px] font-sf-display font-semibold text-apple-text-dark dark:text-white mb-[24px] tracking-[0.2px]">
                출제된 커스텀 퀴즈 모음
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[20px]">
                {instructorData.common_quizzes.length > 0 ? (
                  instructorData.common_quizzes.map((q, i) => (
                    <div key={q.id} className="p-[20px] rounded-[16px] bg-[#f5f5f7] dark:bg-[#272729] border border-black/5 dark:border-white/5 transition hover:scale-[1.01]">
                      <div className="flex items-center gap-[8px] mb-[16px]">
                        <span className="w-[8px] h-[8px] rounded-full bg-[#0071e3]"></span>
                        <p className="text-[12px] font-bold text-[#0071e3] dark:text-[#2997ff] uppercase tracking-wider">Quiz Set #{i+1}</p>
                      </div>
                      <ul className="space-y-[12px]">
                        {q.questions.map((text, qi) => (
                          <li key={qi} className="text-[14px] text-black/80 dark:text-white/80 flex gap-[10px] leading-[1.4]">
                            <span className="text-black/30 dark:text-white/30 font-semibold mt-[2px]">{qi + 1}.</span>
                            <span className="flex-1">{text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                ) : (
                   <p className="text-[14px] text-black/40 dark:text-white/40 col-span-full">제공된 퀴즈가 없습니다.</p>
                )}
              </div>
            </AppleCard>
          </div>
        )}

        {/* ══════════════════ [학생 뷰] ══════════════════ */}
        {role === 'student' && studentData && (
          <div className="max-w-3xl mx-auto space-y-[40px]">
            
            {/* 1. 플래시카드 복습 (AI Notes) */}
            <section className="flex flex-col items-center">
              <div className="text-center mb-[20px]">
                <h2 className="text-[21px] font-sf-display font-semibold mb-[4px] tracking-[0.231px]">
                  AI 학습 요약 카드
                </h2>
                <p className="text-[#0071e3] dark:text-[#2997ff] font-medium text-[14px]">질문한 내용을 한눈에 복습하세요.</p>
              </div>

              {/* 카드 본체 */}
              <div 
                className="relative w-full aspect-[4/3] max-w-md group cursor-pointer"
                onClick={() => setCardIdx((prev) => (prev + 1) % studentData.flashcards.length)}
              >
                {/* 배경 장식 */}
                <div className="absolute inset-0 translate-x-[10px] translate-y-[10px] bg-white dark:bg-[#1d1d1f] rounded-[24px] border border-black/5 dark:border-white/10 shadow-[var(--apple-shadow-card)]"></div>
                
                {/* 현재 카드 */}
                <div className="absolute inset-0 bg-white dark:bg-[#272729] rounded-[24px] p-[30px] flex flex-col items-center justify-center text-center shadow-[var(--apple-shadow-card)] border border-black/10 dark:border-white/20 hover:scale-[1.01] active:scale-[0.99] transition-transform duration-300">
                  <div className="text-[#0071e3] dark:text-[#2997ff] font-semibold mb-[20px] uppercase tracking-widest text-[10px]">
                    Card {cardIdx + 1} of {studentData.flashcards.length}
                  </div>
                  <p className={`text-[21px] font-sf-display font-semibold text-apple-text-dark dark:text-white leading-[1.19] ${studentData.flashcards[cardIdx].length > 40 ? 'text-[17px]' : 'text-[21px]'}`}>
                    {studentData.flashcards[cardIdx]}
                  </p>
                  <div className="absolute bottom-[20px] text-black/40 dark:text-white/40 text-[10px] font-semibold uppercase tracking-wider">
                    Tab to flip
                  </div>
                </div>
              </div>
              
              <div className="mt-[20px] flex gap-[6px]">
                {studentData.flashcards.map((_, i) => (
                  <div key={i} className={`h-[4px] w-[24px] rounded-full transition-all duration-300 ${i === cardIdx ? 'bg-[#0071e3] w-[40px]' : 'bg-black/10 dark:bg-white/20'}`}></div>
                ))}
              </div>
            </section>

            {/* 2. 오답 퀴즈 리뷰 */}
            <section>
              <h2 className="text-[21px] font-sf-display font-semibold mb-[20px] tracking-[0.231px]">
                나의 오답 노트
              </h2>
              {studentData.incorrect_quizzes.length === 0 ? (
                <AppleCard theme="light" className="p-[40px] text-center dark:bg-[#272729]">
                  <p className="text-[#34c759] font-medium text-[17px]">모든 퀴즈를 맞히셨습니다.</p>
                </AppleCard>
              ) : (
                <div className="space-y-[15px]">
                  {studentData.incorrect_quizzes.map((quiz, i) => (
                    <AppleCard key={i} theme="light" className="p-[30px] dark:bg-[#272729]">
                      <p className="text-black/40 dark:text-white/40 text-[10px] font-semibold mb-[10px] uppercase tracking-wider">Incorrect Question #{i+1}</p>
                      <h3 className="text-[17px] font-semibold text-apple-text-dark dark:text-white mb-[20px] leading-[1.29]">{quiz.question}</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-[15px] mb-[20px]">
                        <div className="p-[15px] bg-[#ff3b30]/5 border border-[#ff3b30]/10 rounded-[11px]">
                          <p className="text-[10px] font-semibold text-[#ff3b30] uppercase tracking-wider mb-[4px]">Your Choice</p>
                          <p className="text-apple-text-dark dark:text-white font-medium text-[14px] leading-[1.29]">{quiz.user_answer}</p>
                        </div>
                        <div className="p-[15px] bg-[#34c759]/5 border border-[#34c759]/10 rounded-[11px]">
                          <p className="text-[10px] font-semibold text-[#34c759] uppercase tracking-wider mb-[4px]">Correct Answer</p>
                          <p className="text-apple-text-dark dark:text-white font-medium text-[14px] leading-[1.29]">{quiz.correct_answer}</p>
                        </div>
                      </div>

                      <div className="p-[15px] bg-[#f5f5f7] dark:bg-[#1d1d1f] rounded-[11px] border border-black/5 dark:border-white/10">
                        <p className="text-[12px] font-semibold text-[#0071e3] dark:text-[#2997ff] mb-[4px] uppercase tracking-wider">Explanation</p>
                        <p className="text-[14px] text-black/80 dark:text-white/80 leading-[1.29]">{quiz.explanation}</p>
                      </div>
                    </AppleCard>
                  ))}
                </div>
              )}
            </section>

          </div>
        )}

      </main>

      <footer className="text-center py-[40px] text-black/40 dark:text-white/40 text-[10px] font-semibold tracking-widest uppercase">
        EDU-LENS AI PLATFORM
      </footer>
    </div>
  );
}
