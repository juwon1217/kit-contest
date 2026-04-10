'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import AppleCard from '@/components/apple/AppleCard';
import AppleButton from '@/components/apple/AppleButton';
import { getApiUrl } from '@/lib/api';


interface QuizOption {
  id: string;
  text: string;
}

interface QuizQuestion {
  id: string;
  question_text: string;
  options: QuizOption[];
  quiz_type?: 'common' | 'personal'; // 배지 표시용
  source_page?: number;
}

interface Feedback {
  isCorrect: boolean;
  message: string;
  explanation: string;
}

export default function QuizPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = use(params);
  const router = useRouter();

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [quizReady, setQuizReady] = useState(false);

  // 현재 문제 인덱스
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 전체 결과 기록
  const [results, setResults] = useState<{questionId: string; isCorrect: boolean}[]>([]);
  const [quizDone, setQuizDone] = useState(false);

  useEffect(() => {
    const fetchQuizzes = async () => {
      setLoading(true);
      try {
        const token = sessionStorage.getItem('auth_token') || 'dev_student';

        const res = await fetch(`${getApiUrl()}/api/quiz/${classId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          const allQuizzes = data.quizzes || [];

          if (allQuizzes.length === 0) {
            setQuizReady(false);
            setLoading(false);
            return;
          }

          const allQuestions: QuizQuestion[] = [];
          for (const quiz of allQuizzes) {
            const quizType = quiz.quiz_type as 'common' | 'personal';
            for (const q of (quiz.questions || [])) {
              const optionsArr: string[] = Array.isArray(q.options) ? q.options : [];
              allQuestions.push({
                id: q.id,
                question_text: q.question_text,
                options: optionsArr.map((opt: string, i: number) => ({
                  id: `opt_${i}`,
                  text: opt
                })),
                quiz_type: quizType,
                source_page: q.source_page
              });
            }
          }

          if (allQuestions.length > 0) {
            setQuestions(allQuestions);
            setQuizReady(true);
          } else {
            setQuizReady(false);
          }
        } else {
          throw new Error("API FAILED");
        }
      } catch (e) {
        console.error("퀴즈 데이터를 불러오는데 실패했습니다.", e);
        setQuizReady(false);
      } finally {
        setLoading(false);
      }
    };
    fetchQuizzes();
  }, [classId]);

  const handleSubmit = async () => {
    if (!selectedOption || submitting) return;
    const currentQ = questions[currentIdx];
    const optionText = currentQ.options.find(o => o.id === selectedOption)?.text || selectedOption;

    setSubmitting(true);
    try {
      const token = sessionStorage.getItem('auth_token') || 'dev_student';

      const res = await fetch(`${getApiUrl()}/api/quiz/${classId}/submit/${currentQ.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ answer: optionText })
      });


      if (res.ok) {
        const data = await res.json();
        setFeedback({
          isCorrect: data.is_correct,
          message: data.is_correct ? '정답입니다' : '오답입니다',
          explanation: data.summary || data.step_by_step_explanation || "해설이 제공되지 않았습니다."
        });
        setResults(prev => [...prev, { questionId: currentQ.id, isCorrect: data.is_correct }]);
      } else {
        throw new Error("서버 에러");
      }
    } catch (e) {
      console.error("채점 요청 중 오류 발생", e);
      alert("채점 서버와 통신 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };


  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setSelectedOption(null);
      setFeedback(null);
    } else {
      setQuizDone(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-apple-gray dark:bg-apple-black font-sf-text">
        <div className="flex flex-col items-center space-y-[20px]">
          <div className="w-[40px] h-[40px] border-[3px] border-black/10 dark:border-white/10 rounded-full animate-spin border-t-[#0071e3]"></div>
          <p className="text-[14px] leading-[1.29] font-medium text-black/80 dark:text-white/80">Loading Quiz...</p>
        </div>
      </div>
    );
  }

  if (!quizReady || questions.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-apple-gray dark:bg-apple-black font-sf-text px-4">
        <AppleCard theme="light" className="max-w-md w-full p-[40px] text-center dark:bg-[#272729]">
          <h2 className="text-[28px] font-sf-display font-medium text-apple-text-dark dark:text-white mb-2 leading-[1.14]">퀴즈 준비 중</h2>
          <p className="text-[14px] text-black/60 dark:text-white/60 mb-8 leading-[1.29]">
            AI가 맞춤형 퀴즈를 생성하고 있습니다.<br/>잠시 후 페이지를 새로고침 해 주세요.
          </p>
          <AppleButton
            onClick={() => window.location.reload()}
            variant="primary"
            className="w-full"
          >
            새로고침
          </AppleButton>
        </AppleCard>
      </div>
    );
  }

  // 퀴즈 완료 화면
  if (quizDone) {
    const correctCount = results.filter(r => r.isCorrect).length;
    const accuracy = Math.round((correctCount / questions.length) * 100);
    const grade = accuracy >= 90 ? 'High Distinction' : accuracy >= 70 ? 'Distinction' : accuracy >= 50 ? 'Pass' : 'Review Required';

    return (
      <div className="flex min-h-screen items-center justify-center bg-apple-gray dark:bg-apple-black font-sf-text px-4">
        <AppleCard theme="light" className="max-w-lg w-full p-[40px] text-center dark:bg-[#272729] dark:text-apple-text-light">
          <h1 className="text-[28px] font-sf-display font-semibold text-apple-text-dark dark:text-white mb-2 tracking-[0.196px] leading-[1.14]">Quiz Complete</h1>
          <p className="text-[14px] text-black/60 dark:text-white/60 mb-8 leading-[1.29]">수고하셨습니다. 최종 결과를 확인하세요.</p>

          {/* 원형 점수 표시 */}
          <div className="relative inline-flex items-center justify-center mb-6">
            <svg className="w-[120px] h-[120px] -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="8" />
              <circle
                cx="60" cy="60" r="54" fill="none"
                stroke={accuracy >= 70 ? '#34c759' : accuracy >= 50 ? '#ff9f0a' : '#ff3b30'}
                strokeWidth="8"
                strokeDasharray={`${(accuracy / 100) * 339.3} 339.3`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute text-center flex flex-col items-center">
              <span className="text-[32px] font-sf-display font-semibold text-apple-text-dark dark:text-white tracking-tight">{accuracy}%</span>
            </div>
          </div>

          <div className="text-[17px] font-medium text-[#0071e3] dark:text-[#2997ff] mb-8">{grade}</div>

          <div className="grid grid-cols-3 gap-4 mb-10">
            <div className="bg-white dark:bg-[#1d1d1f] p-[15px] rounded-[11px] border border-black/5 dark:border-white/10">
              <div className="text-[21px] font-semibold text-apple-text-dark dark:text-white leading-[1.19]">{questions.length}</div>
              <div className="text-[12px] text-black/60 dark:text-white/60 mt-1 uppercase tracking-wider font-semibold">Total</div>
            </div>
            <div className="bg-white dark:bg-[#1d1d1f] p-[15px] rounded-[11px] border border-[#34c759]/20">
              <div className="text-[21px] font-semibold text-[#34c759] leading-[1.19]">{correctCount}</div>
              <div className="text-[12px] text-[#34c759]/80 mt-1 uppercase tracking-wider font-semibold">Correct</div>
            </div>
            <div className="bg-white dark:bg-[#1d1d1f] p-[15px] rounded-[11px] border border-[#ff3b30]/20">
              <div className="text-[21px] font-semibold text-[#ff3b30] leading-[1.19]">{questions.length - correctCount}</div>
              <div className="text-[12px] text-[#ff3b30]/80 mt-1 uppercase tracking-wider font-semibold">Errors</div>
            </div>
          </div>

          <div className="pt-2">
            <AppleButton
              onClick={() => router.push(`/report/${classId}`)}
              variant="primary"
              className="w-full"
            >
              학습 분석 리포트 확인
            </AppleButton>
          </div>
        </AppleCard>
      </div>
    );
  }

  // 현재 문제
  const currentQ = questions[currentIdx];
  const progress = ((currentIdx) / questions.length) * 100;
  const isCommon = currentQ.quiz_type === 'common';

  return (
    <div className="min-h-screen bg-apple-gray dark:bg-apple-black font-sf-text py-[40px] px-4">
      <div className="max-w-2xl mx-auto">
        
        {/* 헤더 및 진행도 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[14px] font-medium text-black/48 dark:text-white/48">
              {currentIdx + 1} of {questions.length}
            </span>
            <span className={`text-[10px] font-semibold px-[8px] py-[4px] rounded-[4px] border uppercase tracking-wider ${
              isCommon
                ? 'bg-[#0071e3]/10 border-[#0071e3]/20 text-[#0071e3] dark:bg-[#2997ff]/20 dark:border-[#2997ff]/30 dark:text-[#2997ff]'
                : 'bg-[#ff9f0a]/10 border-[#ff9f0a]/20 text-[#ff9f0a] dark:bg-[#ff9f0a]/20 dark:border-[#ff9f0a]/30 dark:text-[#ff9f0a]'
            }`}>
              {isCommon ? 'Common' : 'Individual'}
            </span>
          </div>
          {/* 진행도 바 */}
          <div className="w-full h-[4px] bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0071e3] dark:bg-[#2997ff] rounded-full transition-all duration-300 ease-in-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 문제 카드 */}
        <AppleCard theme="light" className="overflow-hidden bg-white dark:bg-[#272729] dark:text-apple-text-light pb-[30px]">
          {/* 영역별 Padding을 내부에서 조정 */}
          <div className="p-[30px] border-b border-black/5 dark:border-white/10 bg-[#f5f5f7] dark:bg-[#1d1d1f]">
            {currentQ.source_page && (
              <span className="text-[12px] text-[#0071e3] dark:text-[#2997ff] mb-2 block font-medium">
                Page {currentQ.source_page} Reference
              </span>
            )}
            <h2 className="text-[21px] font-sf-display font-semibold text-apple-text-dark dark:text-white leading-[1.19] tracking-[0.231px]">
               {currentQ.question_text.replace(/^\[공통\]\s*|\[개인\]\s*/g, '')}
            </h2>
          </div>

          <div className="p-[30px] space-y-[12px]">
            {currentQ.options.map((opt, i) => {
              const isSelected = selectedOption === opt.id;
              const answered = !!feedback;

              let optClass = 'border-black/5 dark:border-white/10 hover:border-[#0071e3]/30 dark:hover:border-[#2997ff]/30 bg-white dark:bg-[#272729]';
              let textClass = 'text-apple-text-dark dark:text-white';
              let letterClass = 'bg-[#f5f5f7] dark:bg-[#1d1d1f] text-black/60 dark:text-white/60 border border-black/5 dark:border-white/10';

              if (isSelected && !answered) {
                optClass = 'border-[#0071e3] bg-[#0071e3]/5 dark:bg-[#2997ff]/10';
                textClass = 'text-[#0071e3] font-semibold dark:text-[#2997ff]';
                letterClass = 'bg-[#0071e3] text-white border-[#0071e3]';
              }
              if (answered && isSelected) {
                if (feedback.isCorrect) {
                  optClass = 'border-[#34c759] bg-[#34c759]/5 dark:bg-[#34c759]/10';
                  textClass = 'text-[#34c759] font-semibold flex-1';
                  letterClass = 'bg-[#34c759] text-white border-[#34c759]';
                } else {
                  optClass = 'border-[#ff3b30] bg-[#ff3b30]/5 dark:bg-[#ff3b30]/10';
                  textClass = 'text-[#ff3b30] font-semibold flex-1';
                  letterClass = 'bg-[#ff3b30] text-white border-[#ff3b30]';
                }
              }

              return (
                <button
                  key={opt.id}
                  onClick={() => !answered && setSelectedOption(opt.id)}
                  disabled={answered}
                  className={`w-full text-left border rounded-[11px] p-[15px] flex items-center space-x-[15px] transition-all duration-200 outline-none ${optClass} ${answered ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <span className={`w-[24px] h-[24px] rounded-full flex items-center justify-center text-[12px] font-sf-display font-semibold flex-shrink-0 transition-colors ${letterClass}`}>
                    {['A','B','C','D'][i] || i+1}
                  </span>
                  <span className={`text-[14px] leading-[1.29] tracking-[-0.224px] ${textClass}`}>{opt.text}</span>
                  {answered && isSelected && (
                    <span className="ml-auto text-[14px] font-medium flex-shrink-0">
                      {feedback.isCorrect ? <span className="text-[#34c759]">Correct</span> : <span className="text-[#ff3b30]">Incorrect</span>}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 해설 영역 */}
          {feedback && (
            <div className={`mx-[30px] mb-[30px] p-[20px] rounded-[11px] border ${
              feedback.isCorrect
                ? 'bg-[#34c759]/5 border-[#34c759]/20'
                : 'bg-[#ff3b30]/5 border-[#ff3b30]/20'
            }`}>
              <div className="flex items-center mb-[10px]">
                <span className={`text-[14px] font-semibold ${feedback.isCorrect ? 'text-[#34c759]' : 'text-[#ff3b30]'}`}>
                  {feedback.isCorrect ? 'Correct Answer' : 'Incorrect Answer'}
                </span>
              </div>
              <p className={`text-[14px] leading-[1.29] ${feedback.isCorrect ? 'text-black/80 dark:text-white/80' : 'text-black/80 dark:text-white/80'}`}>
                {feedback.explanation}
              </p>
            </div>
          )}

          {/* 제출 / 다음 버튼 */}
          <div className="px-[30px]">
            {!feedback ? (
              <AppleButton
                onClick={handleSubmit}
                variant="primary"
                disabled={!selectedOption || submitting}
                className="w-full flex items-center justify-center space-x-[8px]"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>처리 중...</span>
                  </>
                ) : (
                  <span>제출하기</span>
                )}
              </AppleButton>
            ) : (
              <AppleButton
                onClick={handleNext}
                variant="dark"
                className="w-full !bg-black dark:!bg-white dark:!text-black text-white hover:scale-[0.98] active:scale-[0.96] transition-transform duration-200"
              >
                {currentIdx < questions.length - 1 ? '다음 문제' : '결과 보기'}
              </AppleButton>
            )}
          </div>
        </AppleCard>

        {/* 하단 진행 점 표시 */}
        <div className="flex justify-center space-x-[6px] mt-[30px]">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`w-[6px] h-[6px] rounded-full transition-all ${
                i < results.length
                  ? results[i].isCorrect
                    ? 'bg-[#34c759]'
                    : 'bg-[#ff3b30]'
                  : i === currentIdx
                    ? 'bg-[#0071e3] w-[18px]'
                    : 'bg-black/10 dark:bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
