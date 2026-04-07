'use client';

import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  const handleGoogleLogin = async () => {
    // [TODO] Supabase OAuth 연동 (API KEY 및 설정 필요)
    // const { data, error } = await supabase.auth.signInWithOAuth({
    //   provider: 'google',
    //   options: { redirectTo: `${window.location.origin}/role-select` }
    // });
    
    // MVP 테스트용: 임시 경로 이동
    router.push('/role-select');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg text-center">
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            Edu-Lens AI
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            데이터 기반 양방향 AI 튜터링 플랫폼
          </p>
        </div>
        
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
        >
          {/* 간단한 Google 아이콘 플레이스홀더 */}
          <span className="mr-2">G</span>
          Google 계정으로 로그인 (인증 연동 시 대체됨)
        </button>
      </div>
    </div>
  );
}
