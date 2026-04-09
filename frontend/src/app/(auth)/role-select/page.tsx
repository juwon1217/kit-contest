'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function RoleSelectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'instructor' | 'student' | null>(null);
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    setLoading(true);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/auth/simple-login', {

        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          role: selectedRole,
          name,
          student_id: selectedRole === 'student' ? studentId : undefined
        })
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      sessionStorage.setItem('auth_token', data.token);
      sessionStorage.setItem('user_role', data.user.role);


      if (selectedRole === 'instructor') {
        router.push('/create');
      } else {
        router.push('/join');
      }
    } catch (error) {
      console.error('로그인 에러:', error);
      alert('로그인에 실패했습니다. 백엔드 연결을 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  if (selectedRole) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-6">
            {selectedRole === 'instructor' ? '👨‍🏫 강사 정보 입력' : '👨‍🎓 학생 정보 입력'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            {selectedRole === 'student' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">학번</label>
                <input 
                  type="text" 
                  required 
                  value={studentId}
                  onChange={e => setStudentId(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 border-[1px]"
                  placeholder="예: 20201234"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">이름</label>
              <input 
                type="text" 
                required 
                value={name}
                onChange={e => setName(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 border-[1px]"
                placeholder={selectedRole === 'instructor' ? "예: 김교수" : "예: 홍길동"}
              />
            </div>
            
            <div className="pt-4 flex gap-4">
              <button
                type="button"
                onClick={() => setSelectedRole(null)}
                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white py-2 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition border-[1px] border-transparent"
              >
                뒤로
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition"
              >
                {loading ? '처리 중...' : '시작하기'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-xl w-full space-y-8 text-center">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">역할을 선택해주세요</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Edu-Lens AI에서 사용할 계정 역할을 선택합니다.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <button
            onClick={() => setSelectedRole('instructor')}
            disabled={loading}
            className="flex flex-col items-center p-8 bg-white dark:bg-gray-800 border-2 border-transparent hover:border-indigo-500 rounded-2xl shadow-sm transition-all focus:outline-none"
          >
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl text-indigo-600 dark:text-indigo-300">👨‍🏫</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">강사 (Instructor)</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center">수업을 개설하고 학생활동을 모니터링합니다.</p>
          </button>
          
          <button
            onClick={() => setSelectedRole('student')}
            disabled={loading}
            className="flex flex-col items-center p-8 bg-white dark:bg-gray-800 border-2 border-transparent hover:border-green-500 rounded-2xl shadow-sm transition-all focus:outline-none"
          >
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl text-green-600 dark:text-green-300">👨‍🎓</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">학생 (Student)</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center">수업에 참여하고 AI 해설을 제공받습니다.</p>
          </button>
        </div>
      </div>
    </div>
  );
}
