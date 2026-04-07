from config import supabase

def generate_student_report(class_id: str, student_id: str):
    """학생 개인 성취도 및 참여도 리포트 생성"""
    # 1. 퀴즈 성취도 조회
    submissions_res = supabase.table("quiz_submissions").select("*").eq("student_id", student_id).execute()
    submissions = submissions_res.data
    
    total_quizzes = len(submissions)
    correct_count = sum(1 for sub in submissions if sub.get("is_correct"))
    accuracy = (correct_count / total_quizzes * 100) if total_quizzes > 0 else 0

    # 2. 수업 참여도 (질문 횟수) 조회
    student_res = supabase.table("class_students").select("total_questions").eq("class_id", class_id).eq("student_id", student_id).execute()
    total_questions = student_res.data[0]["total_questions"] if student_res.data else 0

    # 3. 질문 키워드 (MVP 더미)
    # 실제로는 interactions 테이블의 question_content를 AI Engine에 넘겨 NLP 키워드 추출
    keywords = ["의존성 주입", "데이터 라우팅", "JWT 토큰", "MVC 패턴"]

    return {
        "student_id": student_id,
        "performance": {
            "total_quizzes": total_quizzes,
            "correct_count": correct_count,
            "accuracy": round(accuracy, 1)
        },
        "participation": {
            "total_questions": total_questions
        },
        "keywords": keywords
    }

def generate_instructor_report(class_id: str):
    """강사용 수업 전체 종합 리포트 생성"""
    # 1. 학생 명단 및 전체 질문 수
    students_res = supabase.table("class_students").select("student_id, total_questions").eq("class_id", class_id).execute()
    students = students_res.data
    total_students = len(students)
    total_class_questions = sum(s.get("total_questions", 0) for s in students)
    
    # 2. 질문이 가장 많았던 핫페이지
    from quiz_generator import get_hot_pages
    hot_pages = get_hot_pages(class_id, top_n=3)
    
    # 3. 반 평균 퀴즈 정답률
    # MVP: 간단 계산 (전체 submissions 조회)
    # 실제론 class_id 필터링이 필요하나 MVP 시뮬레이션에서는 임의 값으로 대체하거나 student_id 리스트로 필터링
    student_ids = [s["student_id"] for s in students]
    avg_accuracy = 0
    if student_ids:
        all_subs = supabase.table("quiz_submissions").select("is_correct").in_("student_id", student_ids).execute()
        valid_subs = all_subs.data
        if valid_subs:
            total_corr = sum(1 for sub in valid_subs if sub.get("is_correct"))
            avg_accuracy = (total_corr / len(valid_subs)) * 100

    return {
        "overview": {
            "total_students": total_students,
            "total_questions": total_class_questions,
            "average_accuracy": round(avg_accuracy, 1)
        },
        "hot_pages": hot_pages
    }
