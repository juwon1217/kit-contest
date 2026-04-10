export const getApiUrl = () => {
  // 환경 변수가 설정되어 있으면 해당 값을 사용하고, 그렇지 않으면 로컬 주소를 사용합니다.
  return process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
};
