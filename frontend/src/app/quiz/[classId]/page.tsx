'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

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

        const res = await fetch(`http://127.0.0.1:8000/api/quiz/${classId}`, {
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

      const res = await fetch(`http://127.0.0.1:8000/api/quiz/${classId}/submit/${currentQ.id}`, {
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
          message: data.is_correct ? '정답입니다!' : '오답입니다.',
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-indigo-200 dark:border-indigo-900 rounded-full animate-spin border-t-indigo-600"></div>
            <span className="absolute inset-0 flex items-center justify-center text-2xl">📝</span>
          </div>
          <p className="text-indigo-700 dark:text-indigo-300 font-semibold text-lg">퀴즈를 불러오는 중...</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">AI가 맞춤형 퀴즈를 준비하고 있습니다.</p>
        </div>
      </div>
    );
  }

  if (!quizReady || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-10 max-w-md text-center">
          <div className="text-5xl mb-4">⏳</div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">퀴즈 준비 중입니다</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            AI가 퀴즈를 생성하고 있습니다. 잠시 후 다시 시도해 주세요.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition"
          >
            새로고침
          </button>
        </div>
      </div>
    );
  }

  // 퀴즈 완료 화면
  if (quizDone) {
    const correctCount = results.filter(r => r.isCorrect).length;
    const accuracy = Math.round((correctCount / questions.length) * 100);
    const grade = accuracy >= 90 ? '🏆 최우수' : accuracy >= 70 ? '🥈 우수' : accuracy >= 50 ? '🥉 보통' : '📚 복습 필요';

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center py-10 px-4">
        <div className="max-w-lg w-full">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-10 text-center border border-gray-100 dark:border-gray-700">
            <div className="text-6xl mb-4">{accuracy >= 70 ? '🎉' : '📚'}</div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">퀴즈 완료!</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">수고하셨습니다. 최종 결과를 확인해보세요.</p>

            {/* 원형 점수 표시 */}
            <div className="relative inline-flex items-center justify-center mb-6">
              <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="54" fill="none"
                  stroke={accuracy >= 70 ? '#6366f1' : accuracy >= 50 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="10"
                  strokeDasharray={`${(accuracy / 100) * 339.3} 339.3`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-4xl font-black text-gray-900 dark:text-white">{accuracy}%</span>
              </div>
            </div>

            <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mb-6">{grade}</div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl">
                <div className="text-2xl font-bold text-indigo-600">{questions.length}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">전체 문제</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl">
                <div className="text-2xl font-bold text-green-600">{correctCount}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">정답</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl">
                <div className="text-2xl font-bold text-red-500">{questions.length - correctCount}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">오답</div>
              </div>
            </div>

            <button
              onClick={() => router.push(`/report/${classId}`)}
              className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transition transform hover:scale-105 text-lg"
            >
              📊 최종 학습 리포트 확인하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 현재 문제
  const currentQ = questions[currentIdx];
  const progress = ((currentIdx) / questions.length) * 100;
  const isCommon = currentQ.quiz_type === 'common';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        
        {/* 헤더 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {currentIdx + 1} / {questions.length}
            </span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              isCommon
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
            }`}>
              {isCommon ? '📚 공통 문제' : '⭐ 개인 맞춤 문제'}
            </span>
          </div>
          {/* 진행도 바 */}
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 문제 카드 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          {/* 문제 */}
          <div className="px-8 py-6 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 dark:from-indigo-900/20 dark:to-purple-900/20 border-b border-gray-100 dark:border-gray-700">
            {currentQ.source_page && (
              <span className="text-xs text-gray-400 dark:text-gray-500 mb-2 block">
                📄 {currentQ.source_page}페이지 기반
              </span>
            )}
            <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-relaxed">
              Q{currentIdx + 1}. {currentQ.question_text.replace(/^\[공통\]\s*|\[개인\]\s*/g, '')}
            </h2>
          </div>

          {/* 선택지 */}
          <div className="px-8 py-6 space-y-3">
            {currentQ.options.map((opt, i) => {
              const isSelected = selectedOption === opt.id;
              const answered = !!feedback;

              let optClass = 'border-gray-200 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10';
              let textClass = 'text-gray-700 dark:text-gray-200';
              const numberClass = 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';

              if (isSelected && !answered) {
                optClass = 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30';
                textClass = 'text-indigo-700 dark:text-indigo-300 font-semibold';
              }
              if (answered && isSelected) {
                if (feedback.isCorrect) {
                  optClass = 'border-green-500 bg-green-50 dark:bg-green-900/30 ring-2 ring-green-400';
                  textClass = 'text-green-700 dark:text-green-300 font-semibold';
                } else {
                  optClass = 'border-red-500 bg-red-50 dark:bg-red-900/30 ring-2 ring-red-400';
                  textClass = 'text-red-700 dark:text-red-300 font-semibold';
                }
              }

              return (
                <button
                  key={opt.id}
                  onClick={() => !answered && setSelectedOption(opt.id)}
                  disabled={answered}
                  className={`w-full text-left border-2 rounded-xl p-4 flex items-center space-x-4 transition-all duration-200 ${optClass} ${answered ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${numberClass}`}>
                    {['①','②','③','④'][i]}
                  </span>
                  <span className={`text-sm ${textClass}`}>{opt.text}</span>
                  {answered && isSelected && (
                    <span className="ml-auto text-xl flex-shrink-0">
                      {feedback.isCorrect ? '✅' : '❌'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 해설 영역 */}
          {feedback && (
            <div className={`mx-8 mb-6 p-5 rounded-xl border-2 ${
              feedback.isCorrect
                ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
            }`}>
              <div className="flex items-center mb-2">
                <span className="text-xl mr-2">{feedback.isCorrect ? '✅' : '❌'}</span>
                <span className={`font-bold text-base ${feedback.isCorrect ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                  {feedback.message}
                </span>
              </div>
              <p className={`text-sm leading-relaxed ${feedback.isCorrect ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                {feedback.explanation}
              </p>
            </div>
          )}

          {/* 제출 / 다음 버튼 */}
          <div className="px-8 pb-8">
            {!feedback ? (
              <button
                onClick={handleSubmit}
                disabled={!selectedOption || submitting}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-2"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>채점 중...</span>
                  </>
                ) : (
                  <span>✔️ 정답 확인하기</span>
                )}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-xl shadow-md transition transform hover:scale-105"
              >
                {currentIdx < questions.length - 1 ? '다음 문제 →' : '📊 결과 보기'}
              </button>
            )}
          </div>
        </div>

        {/* 하단 진행 점 표시 */}
        <div className="flex justify-center space-x-2 mt-6">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                i < results.length
                  ? results[i].isCorrect
                    ? 'bg-green-500'
                    : 'bg-red-400'
                  : i === currentIdx
                    ? 'bg-indigo-600 w-6'
                    : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
