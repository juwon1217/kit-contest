'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

// ─────────────────── 타입 정의 ───────────────────
interface PageStat {
  page: number;
  count: number;
  sample_questions: string[];
}

interface StudentReport {
  student_id: string;
  student_name: string;
  performance: {
    total_quizzes: number;
    correct_count: number;
    accuracy: number;
    common_correct: number;
    common_total: number;
    personal_correct: number;
    personal_total: number;
  };
  participation: {
    total_questions: number;
    total_interactions: number;
    chat_sessions: number;
  };
  page_stats: PageStat[];
  ai_summary: string; // Gemini가 생성한 마크다운 보고서
  quiz_info: {
    common_quiz_count: number;
    personal_quiz_count: number;
  };
}

interface HotPage {
  page: number;
  count: number;
}

interface CommonQuizInfo {
  quiz_id: string;
  question_count: number;
  source_pages: number[];
  sample_questions: string[];
}

interface StudentQuizStat {
  student_id: string;
  name: string;
  correct: number;
  total: number;
  accuracy: number;
}

interface InstructorReport {
  overview: {
    total_students: number;
    total_questions: number;
    average_accuracy: number;
  };
  hot_pages: HotPage[];
  max_page_count: number;
  common_quiz_info: CommonQuizInfo[];
  student_quiz_stats: StudentQuizStat[];
}

// ─────────────────── 마크다운 → HTML 변환 ───────────────────
function renderMarkdown(text: string): string {
  return text
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-gray-800 dark:text-gray-100 mt-6 mb-2 flex items-center gap-2">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-gray-700 dark:text-gray-200 mt-4 mb-1">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900 dark:text-white">$1</strong>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-gray-600 dark:text-gray-400 text-sm list-disc">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 text-gray-600 dark:text-gray-400 text-sm list-decimal">$2</li>')
    .replace(/\n\n/g, '</p><p class="text-sm text-gray-600 dark:text-gray-400 mb-2">')
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
  const [activeTab, setActiveTab] = useState<'summary' | 'quiz' | 'pages'>('summary');

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
          : `/api/report/${classId}/student`;

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
        console.warn("리포트 API 연동 실패 - 더미 데이터 사용");
        // 학생 더미
        setStudentData({
          student_id: "stu_01",
          student_name: "김주원",
          performance: {
            total_quizzes: 5,
            correct_count: 4,
            accuracy: 80,
            common_correct: 2,
            common_total: 3,
            personal_correct: 2,
            personal_total: 2,
          },
          participation: {
            total_questions: 7,
            total_interactions: 7,
            chat_sessions: 3,
          },
          page_stats: [
            { page: 12, count: 3, sample_questions: ["의존성 주입이란 무엇인가요?", "DI와 IoC의 차이점은?"] },
            { page: 8, count: 2, sample_questions: ["단일 책임 원칙을 설명해주세요"] },
            { page: 5, count: 2, sample_questions: ["데이터 모델링 기초 개념이 궁금합니다"] },
          ],
          ai_summary: `## 📊 학습 패턴 분석
이 학생은 주로 12페이지(의존성 주입), 8페이지(단일 책임 원칙), 5페이지(데이터 모델링) 영역에서 활발한 질문을 보였습니다. 특히 객체지향 설계 원칙과 관련된 개념에 깊은 관심을 보이고 있습니다.

## 💡 핵심 개념 요약
**의존성 주입(Dependency Injection)**: 객체 간의 결합도를 낮추기 위해 외부에서 의존 객체를 주입받는 패턴으로, 테스트 용이성과 유지보수성이 향상됩니다.

**단일 책임 원칙(SRP)**: 하나의 클래스는 하나의 변경 이유만 가져야 하며, 각 모듈은 명확한 단일 기능을 담당해야 합니다.

**데이터 모델링**: 실세계의 데이터 구조를 논리적으로 표현하는 과정으로, 관계형 DB 설계의 핵심 기초입니다.

## 🔍 이해도 평가
이해도: **중-상** — 기본 개념을 빠르게 파악하고 연관 개념으로 확장하는 질문 패턴이 보입니다. DI와 IoC의 차이처럼 심화 개념까지 탐구하는 능동적인 학습 태도를 보입니다.

## 📝 학습 권고사항
- SOLID 원칙 전체를 순서대로 복습하시면 각 원칙의 연관성을 이해하는 데 도움이 됩니다.
- 의존성 주입 관련하여 Spring/NestJS 프레임워크의 실제 DI 구현 사례를 살펴보세요.
- 데이터 모델링은 ER 다이어그램 작성 실습을 통해 개념을 더욱 명확히 할 수 있습니다.`,
          quiz_info: { common_quiz_count: 1, personal_quiz_count: 1 }
        });

        // 강사 더미
        setInstructorData({
          overview: { total_students: 12, total_questions: 47, average_accuracy: 78.5 },
          hot_pages: [
            { page: 12, count: 18 },
            { page: 8, count: 12 },
            { page: 5, count: 9 },
            { page: 15, count: 5 },
            { page: 3, count: 3 },
          ],
          max_page_count: 18,
          common_quiz_info: [{
            quiz_id: "quiz_1",
            question_count: 3,
            source_pages: [12, 8, 5],
            sample_questions: [
              "[공통] 12페이지에서 주로 다룬 의존성 주입의 핵심 목적은?",
              "[공통] 단일 책임 원칙에서 '단일'이 의미하는 것은?",
              "[공통] 데이터 모델링에서 정규화의 목적은 무엇입니까?"
            ]
          }],
          student_quiz_stats: [
            { student_id: "s1", name: "김주원", correct: 4, total: 5, accuracy: 80 },
            { student_id: "s2", name: "이민준", correct: 5, total: 5, accuracy: 100 },
            { student_id: "s3", name: "박서연", correct: 3, total: 5, accuracy: 60 },
            { student_id: "s4", name: "최지훈", correct: 2, total: 5, accuracy: 40 },
          ]
        });
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [classId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative w-20 h-20">
            <div className="w-20 h-20 border-4 border-indigo-200 dark:border-indigo-900 rounded-full animate-spin border-t-indigo-600"></div>
            <span className="absolute inset-0 flex items-center justify-center text-2xl">📊</span>
          </div>
          <p className="text-indigo-700 dark:text-indigo-300 font-semibold text-lg">학습 리포트 생성 중...</p>
          <p className="text-gray-500 text-sm">AI가 수업 데이터를 분석하고 있습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      {/* 헤더 */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              📊 최종 학습 리포트
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              수업 코드: <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{classId.toUpperCase()}</span>
            </p>
          </div>
          {/* 역할 전환 (개발/데모용) */}
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setRole('student')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${role === 'student' ? 'bg-white dark:bg-gray-700 shadow text-indigo-600 dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400'}`}
            >학생</button>
            <button
              onClick={() => setRole('instructor')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${role === 'instructor' ? 'bg-white dark:bg-gray-700 shadow text-indigo-600 dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400'}`}
            >강사</button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* ══════════════════ 학생 뷰 ══════════════════ */}
        {role === 'student' && studentData && (
          <>
            {/* 상단 요약 카드 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* 정확도 */}
              <div className="col-span-2 sm:col-span-1 bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center">
                <div className="relative w-24 h-24 mb-3">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="#e5e7eb" strokeWidth="8"/>
                    <circle
                      cx="40" cy="40" r="34" fill="none"
                      stroke={studentData.performance.accuracy >= 70 ? '#6366f1' : studentData.performance.accuracy >= 50 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="8"
                      strokeDasharray={`${(studentData.performance.accuracy / 100) * 213.6} 213.6`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-black text-gray-900 dark:text-white">{studentData.performance.accuracy}%</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">퀴즈 정답률</p>
              </div>

              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-5 shadow-sm text-white flex flex-col justify-center">
                <p className="text-indigo-200 text-xs font-semibold mb-1">총 질문 수</p>
                <p className="text-3xl font-black">{studentData.participation.total_questions}<span className="text-base font-normal ml-1">회</span></p>
              </div>

              <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-5 shadow-sm text-white flex flex-col justify-center">
                <p className="text-emerald-100 text-xs font-semibold mb-1">공통 퀴즈</p>
                <p className="text-3xl font-black">{studentData.performance.common_correct}<span className="text-base font-normal ml-1">/ {studentData.performance.common_total}</span></p>
              </div>

              <div className="bg-gradient-to-br from-orange-400 to-rose-500 rounded-2xl p-5 shadow-sm text-white flex flex-col justify-center">
                <p className="text-orange-100 text-xs font-semibold mb-1">개인 퀴즈</p>
                <p className="text-3xl font-black">{studentData.performance.personal_correct}<span className="text-base font-normal ml-1">/ {studentData.performance.personal_total}</span></p>
              </div>
            </div>

            {/* 탭 네비게이션 */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="flex border-b border-gray-100 dark:border-gray-700">
                {[
                  { id: 'summary', label: '🤖 AI 학습 요약', icon: '' },
                  { id: 'pages', label: '📄 페이지별 활동', icon: '' },
                  { id: 'quiz', label: '📝 퀴즈 분석', icon: '' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 py-3 text-sm font-semibold transition ${
                      activeTab === tab.id
                        ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* AI 학습 요약 탭 */}
              {activeTab === 'summary' && (
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">AI</div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white text-sm">Gemini AI 학습 분석 보고서</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{studentData.student_name} 학생 · 수업 중 AI 대화 기반 분석</p>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 dark:from-gray-700/50 dark:to-indigo-900/10 rounded-xl p-5 border border-indigo-100 dark:border-indigo-900/30">
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(studentData.ai_summary) }}
                    />
                  </div>
                </div>
              )}

              {/* 페이지별 활동 탭 */}
              {activeTab === 'pages' && (
                <div className="p-6 space-y-4">
                  {studentData.page_stats.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <p className="text-4xl mb-2">📭</p>
                      <p>수업 중 질문한 내역이 없습니다.</p>
                    </div>
                  ) : (
                    studentData.page_stats.map((ps, i) => (
                      <div key={ps.page} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex flex-col items-center justify-center">
                          <span className="text-lg font-black text-indigo-700 dark:text-indigo-300">{i + 1}</span>
                          <span className="text-[10px] text-indigo-500 dark:text-indigo-400">위</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-gray-800 dark:text-gray-100">📄 {ps.page}페이지</span>
                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">{ps.count}회 질문</span>
                          </div>
                          {ps.sample_questions.length > 0 && (
                            <ul className="space-y-1">
                              {ps.sample_questions.map((q, qi) => (
                                <li key={qi} className="text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1.5">
                                  <span className="text-indigo-400 mt-0.5 flex-shrink-0">💬</span>
                                  {q}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* 퀴즈 분석 탭 */}
              {activeTab === 'quiz' && (
                <div className="p-6 space-y-5">
                  {/* 퀴즈 타입별 성과 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                      <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">📚 공통 퀴즈</p>
                      <p className="text-2xl font-black text-indigo-700 dark:text-indigo-300">
                        {studentData.performance.common_correct}
                        <span className="text-sm font-normal text-indigo-400"> / {studentData.performance.common_total}문제</span>
                      </p>
                      <div className="mt-2 h-1.5 bg-indigo-200 dark:bg-indigo-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${studentData.performance.common_total > 0 ? (studentData.performance.common_correct / studentData.performance.common_total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-800">
                      <p className="text-xs font-bold text-orange-600 dark:text-orange-400 mb-1">⭐ 개인 맞춤 퀴즈</p>
                      <p className="text-2xl font-black text-orange-700 dark:text-orange-300">
                        {studentData.performance.personal_correct}
                        <span className="text-sm font-normal text-orange-400"> / {studentData.performance.personal_total}문제</span>
                      </p>
                      <div className="mt-2 h-1.5 bg-orange-200 dark:bg-orange-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500 rounded-full"
                          style={{ width: `${studentData.performance.personal_total > 0 ? (studentData.performance.personal_correct / studentData.performance.personal_total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="text-center py-4">
                    <button
                      onClick={() => router.push(`/quiz/${classId}`)}
                      className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-md transition"
                    >
                      📝 퀴즈 다시 풀기
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ══════════════════ 강사 뷰 ══════════════════ */}
        {role === 'instructor' && instructorData && (
          <>
            {/* 상단 통계 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-2xl shadow text-white flex flex-col justify-center items-center">
                <p className="text-indigo-100 font-semibold text-xs mb-1">총 수강 인원</p>
                <span className="text-4xl font-extrabold">{instructorData.overview.total_students}</span>
                <span className="text-indigo-200 text-sm mt-0.5">명</span>
              </div>
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-2xl shadow text-white flex flex-col justify-center items-center">
                <p className="text-emerald-100 font-semibold text-xs mb-1">전체 질문 수</p>
                <span className="text-4xl font-extrabold">{instructorData.overview.total_questions}</span>
                <span className="text-emerald-200 text-sm mt-0.5">건</span>
              </div>
              <div className="bg-gradient-to-br from-orange-400 to-rose-500 p-6 rounded-2xl shadow text-white flex flex-col justify-center items-center">
                <p className="text-orange-100 font-semibold text-xs mb-1">반 평균 정답률</p>
                <span className="text-4xl font-extrabold">{instructorData.overview.average_accuracy}</span>
                <span className="text-orange-200 text-sm mt-0.5">%</span>
              </div>
            </div>

            {/* 취약 페이지 (히트맵 기반) */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                🚨 학생들이 어려워한 페이지 (TOP {instructorData.hot_pages.length})
              </h3>
              <div className="space-y-4">
                {instructorData.hot_pages.map((hp, i) => {
                  const pct = Math.round((hp.count / (instructorData.max_page_count || 1)) * 100);
                  const colors = ['from-rose-500 to-red-500', 'from-orange-500 to-amber-500', 'from-yellow-500 to-lime-500', 'from-green-500 to-teal-500', 'from-cyan-500 to-blue-500'];
                  return (
                    <div key={hp.page} className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-black text-gray-500 dark:text-gray-400 flex-shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1.5">
                          <span className="text-sm font-bold text-gray-800 dark:text-gray-100">📄 {hp.page}페이지</span>
                          <span className="text-xs font-bold text-rose-500">{hp.count}건 질문</span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${colors[i % colors.length]} transition-all duration-700`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 공통 퀴즈 출제 내역 */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                📚 출제된 공통 퀴즈
              </h3>
              {instructorData.common_quiz_info.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">아직 공통 퀴즈가 생성되지 않았습니다.</p>
              ) : (
                <div className="space-y-4">
                  {instructorData.common_quiz_info.map((cq, i) => (
                    <div key={cq.quiz_id} className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                          공통 퀴즈 #{i + 1}
                        </span>
                        <div className="flex gap-2">
                          <span className="text-xs bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 px-2 py-0.5 rounded-full font-medium">
                            {cq.question_count}문제
                          </span>
                          <span className="text-xs bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded-full font-medium">
                            기반 페이지: {cq.source_pages.join(', ')}p
                          </span>
                        </div>
                      </div>
                      <ul className="space-y-1.5">
                        {cq.sample_questions.map((sq, qi) => (
                          <li key={qi} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
                            <span className="text-indigo-400 flex-shrink-0 mt-0.5">Q{qi + 1}.</span>
                            <span>{sq.replace(/^\[공통\]\s*/, '')}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 학생별 퀴즈 정답률 테이블 */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                👥 학생별 퀴즈 성취도
              </h3>
              {instructorData.student_quiz_stats.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">퀴즈 응시 데이터가 없습니다.</p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50">
                        <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">순위</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">이름</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">정답/전체</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">정답률</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {instructorData.student_quiz_stats.map((stat, i) => (
                        <tr key={stat.student_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                          <td className="py-3 px-4 text-gray-400 font-medium">{i + 1}</td>
                          <td className="py-3 px-4 font-semibold text-gray-800 dark:text-gray-200">{stat.name}</td>
                          <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400">
                            {stat.correct} / {stat.total}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                              stat.accuracy >= 80
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                : stat.accuracy >= 60
                                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                            }`}>
                              {stat.accuracy}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
