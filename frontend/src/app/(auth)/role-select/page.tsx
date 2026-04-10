'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import AppleButton from '@/components/apple/AppleButton';
import AppleCard from '@/components/apple/AppleCard';
import { getApiUrl } from '@/lib/api';


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
      const res = await fetch(`${getApiUrl()}/api/auth/simple-login`, {
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-apple-gray dark:bg-apple-black px-4 font-sf-text">
        <AppleCard theme="light" className="max-w-md w-full p-[40px] text-center dark:bg-[#272729] dark:text-apple-text-light">
          <h2 className="text-[28px] leading-[1.14] tracking-[0.196px] font-sf-display font-medium text-apple-text-dark dark:text-white mb-8">
            {selectedRole === 'instructor' ? '강사 정보 입력' : '학생 정보 입력'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6 text-left">
            {selectedRole === 'student' && (
              <div>
                <label className="block text-[14px] leading-[1.29] tracking-[-0.224px] text-black/80 dark:text-white/80 mb-2">학번</label>
                <input 
                  type="text" 
                  required 
                  value={studentId}
                  onChange={e => setStudentId(e.target.value)}
                  className="w-full rounded-[11px] bg-white dark:bg-[#1d1d1f] text-apple-text-dark dark:text-white px-[14px] py-[12px] outline-none focus:ring-2 focus:ring-apple-focus-ring border border-black/5 dark:border-white/10"
                  placeholder="예: 20201234"
                />
              </div>
            )}
            <div>
              <label className="block text-[14px] leading-[1.29] tracking-[-0.224px] text-black/80 dark:text-white/80 mb-2">이름</label>
              <input 
                type="text" 
                required 
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full rounded-[11px] bg-white dark:bg-[#1d1d1f] text-apple-text-dark dark:text-white px-[14px] py-[12px] outline-none focus:ring-2 focus:ring-apple-focus-ring border border-black/5 dark:border-white/10"
                placeholder={selectedRole === 'instructor' ? "예: 김교수" : "예: 홍길동"}
              />
            </div>
            
            <div className="pt-6 flex gap-[15px]">
              <AppleButton
                type="button"
                variant="dark"
                onClick={() => setSelectedRole(null)}
                className="flex-1 !bg-black/5 !text-black hover:!bg-black/10 dark:!bg-white/10 dark:!text-white dark:hover:!bg-white/20"
              >
                뒤로
              </AppleButton>
              <AppleButton
                type="submit"
                variant="primary"
                disabled={loading}
                className="flex-1"
              >
                {loading ? '처리 중...' : '시작하기'}
              </AppleButton>
            </div>
          </form>
        </AppleCard>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-apple-gray dark:bg-apple-black px-4 font-sf-text">
      <div className="max-w-[834px] w-full space-y-12 text-center">
        <div>
          <h2 className="text-[40px] md:text-[56px] leading-[1.07] tracking-[-0.28px] font-sf-display font-semibold text-apple-text-dark dark:text-white">
            역할을 선택해주세요
          </h2>
          <p className="mt-[15px] text-[17px] md:text-[21px] leading-[1.19] tracking-[0.231px] text-black/80 dark:text-white/80">
            Edu-Lens AI에서 사용할 계정 역할을 선택합니다.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px] max-w-[640px] mx-auto">
          <button
            onClick={() => setSelectedRole('instructor')}
            disabled={loading}
            className="group flex flex-col items-center p-[40px] bg-white dark:bg-[#272729] rounded-[16px] transition-all outline-none focus:ring-2 focus:ring-apple-focus-ring hover:shadow-[var(--apple-shadow-card)]"
          >
            <div className="w-[64px] h-[64px] bg-[#f5f5f7] dark:bg-[#1d1d1f] rounded-full flex items-center justify-center mb-[20px] group-hover:scale-105 transition-transform border border-black/5 dark:border-white/10">
              <span className="text-[28px] font-sf-display font-bold text-[#0071e3] tracking-tighter">I</span>
            </div>
            <h3 className="text-[21px] font-semibold text-apple-text-dark dark:text-white leading-[1.19] tracking-[0.231px]">강사 (Instructor)</h3>
            <p className="mt-[10px] text-[14px] text-black/48 dark:text-white/48 text-center leading-[1.29]">수업을 개설하고 학생활동을 모니터링합니다.</p>
          </button>
          
          <button
            onClick={() => setSelectedRole('student')}
            disabled={loading}
            className="group flex flex-col items-center p-[40px] bg-white dark:bg-[#272729] rounded-[16px] transition-all outline-none focus:ring-2 focus:ring-apple-focus-ring hover:shadow-[var(--apple-shadow-card)]"
          >
            <div className="w-[64px] h-[64px] bg-[#f5f5f7] dark:bg-[#1d1d1f] rounded-full flex items-center justify-center mb-[20px] group-hover:scale-105 transition-transform border border-black/5 dark:border-white/10">
              <span className="text-[28px] font-sf-display font-bold text-[#2997ff] tracking-tighter">S</span>
            </div>
            <h3 className="text-[21px] font-semibold text-apple-text-dark dark:text-white leading-[1.19] tracking-[0.231px]">학생 (Student)</h3>
            <p className="mt-[10px] text-[14px] text-black/48 dark:text-white/48 text-center leading-[1.29]">수업에 참여하고 AI 해설을 제공받습니다.</p>
          </button>
        </div>
      </div>
    </div>
  );
}
