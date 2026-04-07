'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function JoinClassPage() {
  const router = useRouter();
  const [classId, setClassId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (classId.length !== 6) {
      setError('수업 코드는 6자리 영숫자입니다.');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      const token = localStorage.getItem('auth_token') || 'dev_student';
      const res = await fetch(`http://localhost:8000/api/classes/${classId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        if (res.status === 400 || res.status === 404) {
          setError('존재하지 않거나 유효하지 않은 수업입니다.');
        } else if (res.status === 410) {
          setError('이미 종료된 수업입니다.');
        } else {
          setError('서버 오류가 발생했습니다.');
        }
        return;
      }
      
      // 참여 성공 시 학생 대시보드로 이동
      router.push(`/student/${classId.toUpperCase()}`);
    } catch (e) {
      console.error(e);
      // 백엔드 미구동 시 MVP 테스트용 더미 패스
      router.push(`/student/${classId.toUpperCase()}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-12 bg-gray-50 dark:bg-gray-900 px-4 flex items-center justify-center">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">수업 참여</h2>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-8">
          강사님이 공유해주신 6자리 코드를 입력해주세요.
        </p>
        
        <form onSubmit={handleJoin} className="space-y-6">
          <div>
            <label htmlFor="code" className="sr-only">수업 코드</label>
            <input
              type="text"
              id="code"
              name="code"
              required
              maxLength={6}
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value.toUpperCase());
                setError('');
              }}
              className="block w-full text-center text-4xl font-mono tracking-[0.5em] py-4 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white uppercase transition-colors"
              placeholder="A1B2C3"
            />
          </div>
          
          {error && (
            <p className="text-red-600 dark:text-red-400 text-sm font-medium text-center bg-red-50 dark:bg-red-900/20 py-2 rounded">
              {error}
            </p>
          )}
          
          <button
            type="submit"
            disabled={loading || classId.length < 6}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 dark:disabled:bg-gray-600 transition-colors"
          >
            {loading ? '참여 중...' : '입장하기'}
          </button>
        </form>
      </div>
    </div>
  );
}
