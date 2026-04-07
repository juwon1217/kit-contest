# 요구사항 문서

## 소개

Edu-Lens AI는 데이터 기반 양방향 AI 튜터링 플랫폼으로, 강사와 학생 간의 학습 간극을 실시간 인터랙션과 맞춤형 피드백을 통해 해소하는 차세대 교육 솔루션이다. PDF 기반 학습 환경(대학 강의, 온라인 라이브 클래스, 사내 교육)에서 학습 병목 현상을 데이터화하고, AI 튜터링을 통해 개인화된 학습 경험을 제공한다.

## 용어 사전 (Glossary)

- **Platform**: Edu-Lens AI 웹 애플리케이션 전체 시스템
- **Auth_Module**: Google OAuth 2.0 기반 인증 및 사용자 프로필 관리 모듈
- **Class_Manager**: 수업 생성, Class ID 발급, 학생 입장을 관리하는 모듈
- **Dashboard_Router**: 사용자 역할(강사/학생)에 따라 차별화된 UI를 라우팅하는 모듈
- **PDF_Viewer**: PDF 강의 자료를 렌더링하는 뷰어 컴포넌트
- **AI_Sidebar**: 학생 화면 우측에 위치한 AI 채팅 및 해설 사이드바 컴포넌트
- **Text_Selector**: PDF 내 텍스트 드래그 선택을 감지하고 AI_Sidebar로 전달하는 모듈
- **Area_Cropper**: PDF 내 직사각형 영역을 지정하여 스크린샷을 캡처하는 모듈
- **AI_Engine**: Gemini 1.5 Pro (Vision/Chat) 및 LangChain 기반 AI 처리 엔진
- **Chat_Manager**: 멀티턴 대화 컨텍스트를 유지하며 AI와의 질의응답을 관리하는 모듈
- **Heatmap_Panel**: 강사 화면 좌측에 위치한 페이지별 질문 빈도 시각화 패널
- **Student_Roster**: 강사 화면 우측에 위치한 학생 현황 명부 패널
- **Polling_Service**: 10초 주기로 서버 데이터를 갱신하는 폴링 서비스
- **Interaction_Recorder**: 학생의 질문/드래그 이벤트를 DB에 기록하는 모듈
- **Quiz_Generator**: AI 기반 퀴즈 자동 생성 및 배포 모듈
- **Quiz_Engine**: 공통 퀴즈와 개인 맞춤 퀴즈를 통합 관리하고 채점하는 모듈
- **Report_Generator**: 수업 참여도, 퀴즈 성취도, 질문 키워드 요약 리포트를 생성하는 모듈
- **Resizable_Divider**: 마우스 드래그로 패널 너비를 조절하는 UI 컴포넌트
- **Toast_Notifier**: 강사에게 페이지 전환 시 브리핑 알림을 표시하는 컴포넌트
- **Class_ID**: 강사가 수업 생성 시 발급되는 고유 6자리 영숫자 코드

## 요구사항

### 요구사항 1: Google OAuth 2.0 인증

**사용자 스토리:** 사용자로서, 별도의 회원가입 없이 구글 계정으로 로그인하고 싶다. 이를 통해 빠르고 간편하게 플랫폼에 접근할 수 있다.

#### 인수 조건

1. WHEN 사용자가 로그인 페이지에서 Google 로그인 버튼을 클릭하면, THE Auth_Module SHALL Google OAuth 2.0 인증 흐름을 시작하고 사용자를 Google 인증 페이지로 리다이렉트한다.
2. WHEN Google 인증이 성공적으로 완료되면, THE Auth_Module SHALL 사용자의 이름, 이메일, 프로필 이미지를 포함한 프로필 정보를 저장하고 역할 선택 화면으로 이동시킨다.
3. IF Google 인증이 실패하면, THEN THE Auth_Module SHALL "인증에 실패했습니다. 다시 시도해주세요."라는 오류 메시지를 로그인 페이지에 표시한다.
4. WHEN 인증된 사용자가 역할 선택 화면에서 "강사" 또는 "학생" 역할을 선택하면, THE Auth_Module SHALL 선택된 역할을 세션에 저장하고 해당 역할의 대시보드로 이동시킨다.

### 요구사항 2: Class ID 기반 수업 관리

**사용자 스토리:** 강사로서, 고유한 수업 코드를 생성하여 학생들이 쉽게 수업에 참여할 수 있도록 하고 싶다.

#### 인수 조건

1. WHEN 강사가 새 수업 생성을 요청하면, THE Class_Manager SHALL 고유한 6자리 영숫자 Class_ID를 생성하고 강사에게 표시한다.
2. WHEN 강사가 수업 생성 시 PDF 파일을 업로드하면, THE Class_Manager SHALL 해당 PDF 파일을 수업과 연결하여 저장한다.
3. WHEN 학생이 유효한 Class_ID를 입력하면, THE Class_Manager SHALL 해당 학생을 수업에 등록하고 학생 대시보드로 이동시킨다.
4. IF 학생이 존재하지 않는 Class_ID를 입력하면, THEN THE Class_Manager SHALL "유효하지 않은 수업 코드입니다."라는 오류 메시지를 표시한다.
5. IF 학생이 이미 종료된 수업의 Class_ID를 입력하면, THEN THE Class_Manager SHALL "이미 종료된 수업입니다."라는 오류 메시지를 표시한다.

### 요구사항 3: 역할 기반 대시보드 라우팅

**사용자 스토리:** 사용자로서, 선택한 역할(강사/학생)에 따라 최적화된 인터페이스를 제공받고 싶다.

#### 인수 조건

1. WHEN 강사 역할의 사용자가 수업에 입장하면, THE Dashboard_Router SHALL 3분할(1:4:1) 레이아웃(Heatmap_Panel, PDF_Viewer, Student_Roster)을 렌더링한다.
2. WHEN 학생 역할의 사용자가 수업에 입장하면, THE Dashboard_Router SHALL 2분할(4:1) 레이아웃(PDF_Viewer, AI_Sidebar)을 렌더링한다.
3. IF 인증되지 않은 사용자가 대시보드 URL에 직접 접근하면, THEN THE Dashboard_Router SHALL 해당 사용자를 로그인 페이지로 리다이렉트한다.

### 요구사항 4: 스마트 PDF 뷰어

**사용자 스토리:** 학생으로서, 강의 자료 PDF를 편리하게 열람하면서 AI 사이드바와 함께 학습하고 싶다.

#### 인수 조건

1. WHEN 학생이 수업에 입장하면, THE PDF_Viewer SHALL 강사가 업로드한 PDF 파일을 화면 가로비 4(PDF):1(AI_Sidebar) 비율로 렌더링한다.
2. THE Resizable_Divider SHALL 사용자가 마우스 드래그로 PDF_Viewer와 AI_Sidebar 간의 너비 비율을 자유롭게 조절할 수 있도록 한다.
3. WHEN 강사가 수업에 입장하면, THE PDF_Viewer SHALL 3분할 레이아웃의 중앙 영역에 PDF 파일을 렌더링한다.
4. THE Resizable_Divider SHALL 강사 레이아웃의 모든 분할 영역(Heatmap_Panel, PDF_Viewer, Student_Roster) 간 너비를 마우스 드래그로 조절할 수 있도록 한다.

### 요구사항 5: 텍스트 드래그 기반 AI 해설

**사용자 스토리:** 학생으로서, PDF에서 모르는 문구를 드래그하면 즉시 AI 해설을 받고 싶다.

#### 인수 조건

1. WHEN 학생이 PDF_Viewer에서 텍스트를 드래그하여 선택하면, THE Text_Selector SHALL 선택된 텍스트를 AI_Sidebar의 입력 필드에 자동으로 전달한다.
2. WHEN Text_Selector가 선택된 텍스트를 AI_Sidebar에 전달하면, THE AI_Engine SHALL 해당 텍스트에 대한 1차 해설을 3초 이내에 AI_Sidebar에 표시한다.
3. WHEN AI_Engine이 해설을 생성하면, THE Interaction_Recorder SHALL 해당 질문 내용, 학생 ID, 수업 ID, 페이지 번호를 interactions 테이블에 기록한다.
4. WHEN Interaction_Recorder가 질문을 기록하면, THE Interaction_Recorder SHALL 해당 학생의 total_questions 카운트를 1 증가시킨다.

### 요구사항 6: 영역 지정 스크린샷 기반 AI 해설

**사용자 스토리:** 학생으로서, 수식이나 도표 등 텍스트로 선택할 수 없는 영역을 지정하여 AI 해설을 받고 싶다.

#### 인수 조건

1. WHEN 학생이 Area_Cropper 모드를 활성화하고 PDF_Viewer에서 직사각형 영역을 지정하면, THE Area_Cropper SHALL 해당 영역을 이미지로 캡처하여 AI_Sidebar에 전달한다.
2. WHEN Area_Cropper가 캡처된 이미지를 AI_Sidebar에 전달하면, THE AI_Engine SHALL Gemini 1.5 Pro Vision을 사용하여 시각 정보를 분석하고 해설을 AI_Sidebar에 표시한다.
3. WHEN AI_Engine이 영역 캡처 기반 해설을 생성하면, THE Interaction_Recorder SHALL 해당 질문 내용(이미지 참조 포함), 학생 ID, 수업 ID, 페이지 번호를 interactions 테이블에 기록한다.

### 요구사항 7: 멀티턴 AI 채팅

**사용자 스토리:** 학생으로서, 드래그한 내용을 기반으로 AI와 추가 질의응답을 주고받으며 깊이 있는 학습을 하고 싶다.

#### 인수 조건

1. WHEN 학생이 AI_Sidebar에서 추가 질문을 입력하면, THE Chat_Manager SHALL 이전 드래그 내용과 대화 이력을 컨텍스트로 유지하며 AI_Engine에 전달한다.
2. WHEN Chat_Manager가 컨텍스트와 함께 질문을 전달하면, THE AI_Engine SHALL 이전 대화 맥락을 반영한 응답을 생성하여 AI_Sidebar에 표시한다.
3. WHEN 학생이 새로운 텍스트를 드래그하거나 새로운 영역을 캡처하면, THE Chat_Manager SHALL 새로운 컨텍스트로 대화를 초기화하고 이전 대화 이력을 보존한다.
4. THE AI_Sidebar SHALL 각 대화 세션의 시작점(드래그 텍스트 또는 캡처 이미지)을 시각적으로 구분하여 표시한다.

### 요구사항 8: 실시간 페이지 히트맵

**사용자 스토리:** 강사로서, 학생들이 어떤 페이지에서 질문을 많이 하는지 실시간으로 파악하여 수업 진행에 반영하고 싶다.

#### 인수 조건

1. WHEN 강사가 수업에 입장하면, THE Heatmap_Panel SHALL 강사 레이아웃의 좌측 영역에 PDF 페이지별 질문 빈도를 시각화하여 표시한다.
2. THE Polling_Service SHALL 10초 주기로 interactions 테이블에서 페이지별 질문 빈도 데이터를 조회하여 Heatmap_Panel을 갱신한다.
3. THE Heatmap_Panel SHALL 질문 빈도에 따라 색상 강도를 차등 적용하여 질문이 집중된 페이지를 시각적으로 강조한다.

### 요구사항 9: 학생 현황 명부

**사용자 스토리:** 강사로서, 수업에 접속한 학생들의 현황과 질문 활동을 실시간으로 모니터링하고 싶다.

#### 인수 조건

1. WHEN 강사가 수업에 입장하면, THE Student_Roster SHALL 강사 레이아웃의 우측 영역에 접속한 학생들의 학번, 이름, 현재까지 총 질문 횟수를 리스트로 표시한다.
2. THE Polling_Service SHALL 10초 주기로 users 테이블에서 해당 수업에 접속한 학생 목록과 각 학생의 total_questions 데이터를 조회하여 Student_Roster를 갱신한다.
3. WHEN 새로운 학생이 수업에 접속하면, THE Student_Roster SHALL 다음 폴링 주기에 해당 학생을 명부에 추가하여 표시한다.

### 요구사항 10: 페이지 전환 브리핑 알림

**사용자 스토리:** 강사로서, 페이지를 넘길 때 이전 페이지에서의 학생 질문 현황을 즉시 파악하고 싶다.

#### 인수 조건

1. WHEN 강사가 PDF_Viewer에서 다른 페이지로 전환하면, THE Toast_Notifier SHALL "이전 페이지에서 N명이 질문했습니다"라는 형식의 토스트 알림을 화면 상단에 3초간 표시한다. (N은 이전 페이지의 질문 학생 수)
2. IF 이전 페이지에서 질문한 학생이 0명이면, THEN THE Toast_Notifier SHALL "이전 페이지에서 질문이 없었습니다"라는 토스트 알림을 표시한다.

### 요구사항 11: AI 자동 공통 퀴즈 생성

**사용자 스토리:** 강사로서, 수업 종료 시 학생들이 어려워한 내용을 기반으로 자동 생성된 퀴즈를 배포하고 싶다.

#### 인수 조건

1. WHEN 강사가 수업 종료를 요청하면, THE Quiz_Generator SHALL interactions 테이블에서 질문 빈도가 가장 높은 상위 페이지를 식별한다.
2. WHEN Quiz_Generator가 상위 페이지를 식별하면, THE AI_Engine SHALL 해당 페이지의 PDF 내용을 분석하여 핵심 개념 기반 공통 퀴즈를 생성한다.
3. WHEN AI_Engine이 공통 퀴즈를 생성하면, THE Quiz_Generator SHALL 생성된 퀴즈를 해당 수업의 모든 학생에게 배포한다.
4. WHEN 강사가 수업 종료를 요청하면, THE Class_Manager SHALL 해당 수업의 상태를 "종료"로 변경한다.

### 요구사항 12: 하이브리드 퀴즈 풀이

**사용자 스토리:** 학생으로서, 수업 종료 후 공통 퀴즈와 개인 맞춤 퀴즈를 통해 학습 내용을 복습하고 싶다.

#### 인수 조건

1. WHEN 수업이 종료되면, THE Quiz_Engine SHALL 강사가 배포한 공통 퀴즈를 학생에게 표시한다.
2. WHEN 공통 퀴즈가 표시되면, THE Quiz_Engine SHALL 해당 학생의 질문 이력을 기반으로 AI_Engine이 생성한 개인 맞춤 퀴즈를 추가로 표시한다.
3. WHEN 학생이 퀴즈 문항에 오답을 제출하면, THE Quiz_Engine SHALL 해당 문항에 대한 단계별(step-by-step) 해설과 학습 가이드를 표시한다.
4. WHEN 학생이 퀴즈 문항에 정답을 제출하면, THE Quiz_Engine SHALL 정답 확인 메시지와 함께 관련 핵심 개념 요약을 표시한다.

### 요구사항 13: 최종 학습 리포트

**사용자 스토리:** 학생으로서, 수업 참여도와 퀴즈 성취도를 종합한 리포트를 확인하여 학습 성과를 파악하고 싶다.

#### 인수 조건

1. WHEN 학생이 퀴즈 풀이를 완료하면, THE Report_Generator SHALL 수업 참여도(질문 횟수, 활동 시간), 퀴즈 성취도(정답률, 오답 문항), 질문 키워드 요약을 포함한 최종 리포트를 생성한다.
2. THE Report_Generator SHALL 최종 리포트를 시각적 차트와 텍스트 요약을 포함한 형태로 학생에게 표시한다.
3. WHEN 강사가 수업 리포트를 요청하면, THE Report_Generator SHALL 전체 학생의 참여도 통계, 페이지별 질문 분포, 퀴즈 평균 성취도를 포함한 수업 종합 리포트를 생성한다.
