'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppleCard from '@/components/apple/AppleCard';
import AppleButton from '@/components/apple/AppleButton';
import { getApiUrl } from '@/lib/api';


export default function CreateClassPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [classId, setClassId] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !file) return;

    setLoading(true);
    
    try {
      const token = sessionStorage.getItem('auth_token') || 'dev_instructor';
      const formData = new FormData();

      formData.append('title', title);
      formData.append('pdf_file', file);
      formData.append('total_pages', '24'); // MVP 임시 페이지 수 지정
      
      const res = await fetch(`${getApiUrl()}/api/classes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
         console.warn(await res.text());
         throw new Error("API FAILED");
      }
      
      const data = await res.json();
      const newClassId = data.class?.class_id || data.class_id;
      setClassId(newClassId);
      // PDF를 sessionStorage에 저장
      if (file) {
        const pdfUrl = URL.createObjectURL(file);
        sessionStorage.setItem(`pdf_${newClassId}`, pdfUrl);
      }
    } catch (e) {
      console.error(e);
      alert('수업 개설에 실패했습니다. 코드가 생성되지 않았습니다.');
    } finally {
      setLoading(false);
    }
  };

  const enterDashboard = () => {
    if (classId) {
      router.push(`/instructor/${classId}`);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-apple-gray dark:bg-apple-black px-4 font-sf-text">
      <AppleCard theme="light" className="max-w-md w-full p-[40px] dark:bg-[#272729] dark:text-apple-text-light text-center">
        <h2 className="text-[28px] leading-[1.14] tracking-[0.196px] font-sf-display font-medium text-apple-text-dark dark:text-white mb-8 text-center">
          새 수업 개설
        </h2>
        
        {!classId ? (
          <form onSubmit={handleCreate} className="space-y-6 text-left">
            <div>
              <label htmlFor="title" className="block text-[14px] leading-[1.29] tracking-[-0.224px] text-black/80 dark:text-white/80 mb-2">
                수업 제목
              </label>
              <input
                type="text"
                id="title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-[11px] bg-white dark:bg-[#1d1d1f] text-apple-text-dark dark:text-white px-[14px] py-[12px] outline-none focus:ring-2 focus:ring-apple-focus-ring border border-black/5 dark:border-white/10"
                placeholder="예: 2024 데이터베이스 1분반"
              />
            </div>
            
            <div>
              <label htmlFor="file" className="block text-[14px] leading-[1.29] tracking-[-0.224px] text-black/80 dark:text-white/80 mb-2">
                강의 자료 (PDF)
              </label>
              <input
                type="file"
                id="file"
                accept=".pdf"
                required
                onChange={handleFileChange}
                className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-[8px] file:border-0 file:text-[14px] file:font-sf-text file:bg-black/5 file:text-apple-text-dark hover:file:bg-black/10 dark:file:bg-white/10 dark:file:text-white dark:hover:file:bg-white/20 transition-colors"
              />
            </div>
            
            <div className="pt-2">
              <AppleButton
                type="submit"
                variant="primary"
                disabled={loading || !title || !file}
                className="w-full"
              >
                {loading ? '개설 중...' : '수업 개설하기'}
              </AppleButton>
            </div>
          </form>
        ) : (
          <div className="text-center space-y-8">
            <div className="bg-white dark:bg-[#1d1d1f] p-6 rounded-[16px] border border-black/5 dark:border-white/10">
              <p className="text-[14px] text-black/80 dark:text-white/80 font-medium mb-3">수업이 개설되었습니다! 참여 코드:</p>
              <p className="text-[40px] font-sf-display font-bold text-apple-blue dark:text-[#2997ff] tracking-tight">{classId}</p>
            </div>
            <p className="text-[14px] leading-[1.29] tracking-[-0.224px] text-black/60 dark:text-white/60">학생들에게 위 코드를 공유하여 접속하게 하세요.</p>
            <div className="pt-4">
              <AppleButton
                onClick={enterDashboard}
                variant="primary"
                className="w-full"
              >
                대시보드로 입장하기
              </AppleButton>
            </div>
          </div>
        )}
      </AppleCard>
    </div>
  );
}
