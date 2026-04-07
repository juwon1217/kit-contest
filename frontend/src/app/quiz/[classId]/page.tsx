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

  // 선택된 답안 기록: { [questionId]: selectedOptionId }
  const [answers, setAnswers] = useState<Record<string, string>>({});
  // 평가 결과 기록: { [questionId]: Feedback }
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  // 채점 중인지 여부
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuizzes = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('auth_token') || 'dev_student';
        const res = await fetch(`http://localhost:8000/api/quiz/${classId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          setQuestions(data.quizzes?.[0]?.questions || []);
        } else {
           throw new Error("API FAILED");
        }
      } catch (e) {
        console.warn("API 미연동 또는 데이터 없음. 퀴즈 더미 로드...");
        setQuestions([
          {
            id: "q1",
            question_text: "[공통] 수업 첫 번째 파트에서 가장 중요하게 다루어진 개념은 무엇입니까?",
            options: [
              { id: "opt1", text: "데이터 모델링 기초" },
              { id: "opt2", text: "API 보안 구조 설계" },
              { id: "opt3", text: "React 최적화 기법" },
              { id: "opt4", text: "상태 기반 UI 컴포넌트" }
            ]
          },
          {
            id: "q2",
            question_text: "[개인 맞춤] 질문하셨던 '의존성 주입(DI)'에 대해 올바르게 설명한 것은?",
            options: [
              { id: "opt1", text: "결합도를 높여 디버깅을 어렵게 한다." },
              { id: "opt2", text: "클래스 내부에서 객체를 직접 생성하는 방식이다." },
              { id: "opt3", text: "외부에서 객체를 주입받아 유연성을 향상시킨다." },
              { id: "opt4", text: "무조건 전역 변수로 관리하는 디자인 패턴이다." }
            ]
          }
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchQuizzes();
  }, [classId]);

  const handleOptionSelect = (questionId: string, optionId: string) => {
    if (feedback[questionId]) return; // 이미 채점된 문항은 선택 불가
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = async (questionId: string) => {
    const selectedAnswer = answers[questionId];
    if (!selectedAnswer) return;

    setSubmittingId(questionId);
    
    try {
      const token = localStorage.getItem('auth_token') || 'dev_student';
      // options에서 선택된 text를 추출
      const qSelected = questions.find(q => q.id === questionId);
      const optText = qSelected?.options.find(o => o.id === selectedAnswer)?.text || selectedAnswer;
      
      const res = await fetch(`http://localhost:8000/api/quiz/${classId}/submit/${questionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ answer: optText })
      });

      if (res.ok) {
        const data = await res.json();
        setFeedback(prev => ({
          ...prev,
          [questionId]: { 
            isCorrect: data.is_correct, 
            message: data.message, 
            explanation: data.summary || data.step_by_step_explanation || "해설이 제공되지 않았습니다."
          }
        }));
      } else {
         throw new Error("서버 에러");
      }
    } catch (e) {
      console.warn("채점 API 연동 실패 더미 전환");
      let isCorrect = false;
      let msg = "";
      let expl = "";

      if (questionId === "q1" && selectedAnswer === "opt1") {
        isCorrect = true;
        msg = "정답입니다!";
        expl = "[핵심 개념 요약] 이번 단원에서는 관계형 DB의 근간이 되는 데이터 모델링 기초에 대해 깊이 있게 다루었습니다.";
      } else if (questionId === "q2" && selectedAnswer === "opt3") {
        isCorrect = true;
        msg = "정답입니다!";
        expl = "[핵심 개념 요약] 의존성 주입은 객체 간의 결합도를 낮추어 테스트와 유지보수를 매우 쉽게 만듭니다.";
      } else {
        isCorrect = false;
        msg = "오답입니다.";
        expl = "[단계별 해설] 문제를 다시 확인해주세요. 정답은 관련된 책임과 결합도를 어떻게 분리할 것인가에 대한 내용이었습니다.";
      }

      setFeedback(prev => ({
        ...prev,
        [questionId]: { isCorrect, message: msg, explanation: expl }
      }));
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-pulse flex flex-col items-center">
          <span className="text-4xl">📝</span>
          <p className="mt-4 text-indigo-600 dark:text-indigo-400 font-medium">퀴즈 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const allDone = questions.every(q => feedback[q.id]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 p-4 bg-white dark:bg-gray-800 shadow rounded-lg border-l-4 border-indigo-500">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">학습 점검 퀴즈</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            수업 코드: <span className="font-mono">{classId.toUpperCase()}</span>
          </p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            강의 내용을 바탕으로 생성된 퀴즈입니다. 각 문항을 풀고 정답을 확인하세요.
          </p>
        </div>

        <div className="space-y-8">
          {questions.map((q, idx) => {
            const fb = feedback[q.id];
            const isAnswered = !!fb;

            return (
              <div key={q.id} className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    Q{idx + 1}. {q.question_text}
                  </h3>
                </div>
                <div className="px-4 py-5 sm:p-6">
                  <div className="space-y-3">
                    {q.options.map(opt => {
                      const isSelected = answers[q.id] === opt.id;
                      let optionClass = "border-gray-300 dark:border-gray-600";
                      let bgClass = isSelected ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500" : "bg-white dark:bg-gray-800";
                      
                      // 채점 끝난 후 선택 불가 UI
                      if (isAnswered) {
                        if (isSelected) {
                          bgClass = fb.isCorrect 
                            ? "bg-green-50 dark:bg-green-900/40 border-green-500 ring-2 ring-green-500" 
                            : "bg-red-50 dark:bg-red-900/40 border-red-500 ring-2 ring-red-500";
                        }
                      }

                      return (
                        <div 
                          key={opt.id}
                          onClick={() => handleOptionSelect(q.id, opt.id)}
                          className={`relative border rounded-lg p-4 flex cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition ${bgClass} ${optionClass}`}
                        >
                          <div className="flex items-center h-5">
                            <input
                              type="radio"
                              name={`question-${q.id}`}
                              checked={isSelected}
                              onChange={() => handleOptionSelect(q.id, opt.id)}
                              disabled={isAnswered}
                              className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 disabled:opacity-50"
                            />
                          </div>
                          <div className="ml-3 flex flex-col">
                            <span className={`block text-sm font-medium ${isAnswered && isSelected && fb.isCorrect ? 'text-green-800 dark:text-green-200' : isAnswered && isSelected && !fb.isCorrect ? 'text-red-800 dark:text-red-200' : 'text-gray-900 dark:text-gray-100'}`}>
                              {opt.text}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* 제출 및 피드백 영역 */}
                  <div className="mt-6 flex flex-col items-end">
                    {!isAnswered ? (
                      <button
                        onClick={() => handleSubmit(q.id)}
                        disabled={!answers[q.id] || submittingId === q.id}
                        className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 dark:disabled:bg-gray-600 transition"
                      >
                        {submittingId === q.id ? "채점 중..." : "정답 확인하기"}
                      </button>
                    ) : (
                      // 슬라이드 다운 애니메이션 뷰
                      <div className="w-full mt-4 p-4 rounded-md animate-fade-in-down border" 
                        style={{
                          backgroundColor: fb.isCorrect ? 'rgba(240, 253, 244, 0.5)' : 'rgba(254, 242, 242, 0.5)',
                          borderColor: fb.isCorrect ? '#86efac' : '#fca5a5'
                        }}>
                        <div className="flex items-center mb-2">
                          <span className="text-xl mr-2">{fb.isCorrect ? '✅' : '❌'}</span>
                          <span className={`font-bold text-lg ${fb.isCorrect ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                            {fb.message}
                          </span>
                        </div>
                        <p className={`text-sm ${fb.isCorrect ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                          {fb.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {allDone && (
          <div className="mt-10 flex justify-center pb-10">
            <button
              onClick={() => router.push(`/report/${classId}`)}
              className="px-8 py-3 bg-blue-600 text-white font-bold rounded-full shadow-lg hover:bg-blue-700 transform transition hover:scale-105"
            >
              📊 최종 학습 리포트 확인하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
