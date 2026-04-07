'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
      const token = localStorage.getItem('auth_token') || 'dev_instructor';
      const formData = new FormData();
      formData.append('title', title);
      formData.append('pdf_file', file);
      formData.append('total_pages', '24'); // MVP 임시 페이지 수 지정
      
      const res = await fetch('http://localhost:8000/api/classes', {
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
    <div className="min-h-screen py-12 bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden p-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">새 수업 개설</h2>
        
        {!classId ? (
          <form onSubmit={handleCreate} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                수업 제목
              </label>
              <input
                type="text"
                id="title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                placeholder="예: 2024 데이터베이스 1분반"
              />
            </div>
            
            <div>
              <label htmlFor="file" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                강의 자료 (PDF)
              </label>
              <input
                type="file"
                id="file"
                accept=".pdf"
                required
                onChange={handleFileChange}
                className="mt-1 block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900 dark:file:text-indigo-300"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading || !title || !file}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
            >
              {loading ? '개설 중...' : '수업 개설하기'}
            </button>
          </form>
        ) : (
          <div className="text-center space-y-6">
            <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-md">
              <p className="text-sm text-green-700 dark:text-green-300 font-semibold mb-2">수업이 개설되었습니다! 참여 코드:</p>
              <p className="text-4xl font-mono font-bold text-gray-900 dark:text-white tracking-widest">{classId}</p>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">학생들에게 위 코드를 공유하여 접속하게 하세요.</p>
            <button
              onClick={enterDashboard}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              대시보드로 입장하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
