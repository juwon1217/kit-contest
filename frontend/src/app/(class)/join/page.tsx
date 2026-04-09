'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppleCard from '@/components/apple/AppleCard';
import AppleButton from '@/components/apple/AppleButton';

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
      const token = sessionStorage.getItem('auth_token') || 'dev_student';

      const res = await fetch(`http://127.0.0.1:8000/api/classes/${classId}/join`, {
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
    <div className="flex min-h-screen items-center justify-center bg-apple-gray dark:bg-apple-black px-4 font-sf-text">
      <AppleCard theme="light" className="max-w-md w-full p-[40px] text-center dark:bg-[#272729] dark:text-apple-text-light">
        <h2 className="text-[28px] leading-[1.14] tracking-[0.196px] font-sf-display font-medium text-apple-text-dark dark:text-white mb-2">
          수업 참여
        </h2>
        <p className="text-[14px] leading-[1.29] tracking-[-0.224px] text-black/60 dark:text-white/60 mb-8">
          공유받은 6자리 코드를 입력해주세요.
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
              className="w-full text-center text-[40px] font-mono tracking-[0.3em] py-[15px] bg-white dark:bg-[#1d1d1f] text-apple-text-dark dark:text-white rounded-[11px] outline-none focus:ring-2 focus:ring-apple-focus-ring border border-black/5 dark:border-white/10 uppercase transition-colors"
              placeholder="A1B2C3"
            />
          </div>
          
          {error && (
            <p className="text-[#ff3b30] text-[14px] font-medium text-center bg-[#ff3b30]/10 py-2 rounded-[8px]">
              {error}
            </p>
          )}
          
          <div className="pt-2">
            <AppleButton
              type="submit"
              variant="primary"
              disabled={loading || classId.length < 6}
              className="w-full"
            >
              {loading ? '참여 중...' : '입장하기'}
            </AppleButton>
          </div>
        </form>
      </AppleCard>
    </div>
  );
}
