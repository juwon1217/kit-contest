-- 사용자 테이블
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    profile_image TEXT,
    role TEXT CHECK (role IN ('instructor', 'student')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 수업 테이블
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id VARCHAR(6) UNIQUE NOT NULL,
    instructor_id UUID REFERENCES users(id) NOT NULL,
    title TEXT NOT NULL,
    pdf_url TEXT NOT NULL,
    total_pages INT NOT NULL DEFAULT 0,
    status TEXT CHECK (status IN ('active', 'ended')) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

-- 수업-학생 매핑 테이블
CREATE TABLE class_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES classes(id) NOT NULL,
    student_id UUID REFERENCES users(id) NOT NULL,
    total_questions INT DEFAULT 0,
    is_online BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(class_id, student_id)
);

-- 인터랙션 테이블
CREATE TABLE interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES classes(id) NOT NULL,
    student_id UUID REFERENCES users(id) NOT NULL,
    page_number INT NOT NULL,
    interaction_type TEXT CHECK (interaction_type IN ('text_drag', 'area_capture', 'follow_up')) NOT NULL,
    question_content TEXT NOT NULL,
    ai_response TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스: 히트맵 쿼리 최적화
CREATE INDEX idx_interactions_class_page ON interactions(class_id, page_number);
-- 인덱스: 학생별 인터랙션 조회
CREATE INDEX idx_interactions_student ON interactions(class_id, student_id);

-- 채팅 세션 테이블
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES classes(id) NOT NULL,
    student_id UUID REFERENCES users(id) NOT NULL,
    context_type TEXT CHECK (context_type IN ('text_drag', 'area_capture')) NOT NULL,
    context_source TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 채팅 메시지 테이블
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES chat_sessions(id) NOT NULL,
    role TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 퀴즈 테이블
CREATE TABLE quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES classes(id) NOT NULL,
    quiz_type TEXT CHECK (quiz_type IN ('common', 'personal')) NOT NULL,
    target_student_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 퀴즈 문항 테이블
CREATE TABLE quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES quizzes(id) NOT NULL,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_answer TEXT NOT NULL,
    explanation TEXT NOT NULL,
    source_page INT NOT NULL
);

-- 퀴즈 답안 제출 테이블
CREATE TABLE quiz_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES quiz_questions(id) NOT NULL,
    student_id UUID REFERENCES users(id) NOT NULL,
    submitted_answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(question_id, student_id)
);
