from fastapi import HTTPException
import config


async def get_quizzes_for_student(class_id: str, student_id: str):
    """
    학생이 풀 수 있는 공통 퀴즈 및 개인 맞춤 퀴즈 정보 가져오기
    """
    # quizzes 테이블에서 조회 (common이거나 target_student_id가 나인 것)
    res = await config.supabase.table("quizzes").select("*").eq("class_id", class_id).execute()

    
    quizzes = []
    for q in res.data:
        if q["quiz_type"] == "common" or q.get("target_student_id") == student_id:
            # 하위 질문 목록 가져오기
            q_res = await config.supabase.table("quiz_questions").select("*").eq("quiz_id", q["id"]).execute()

            q["questions"] = q_res.data
            quizzes.append(q)
            
    return quizzes

async def evaluate_answer(question_id: str, student_id: str, submitted_answer: str):
    """
    답안 제출 및 채점, 결과 리턴
    """
    # 1. 문제 정보 조회
    q_res = await config.supabase.table("quiz_questions").select("*").eq("id", question_id).execute()

    if not q_res.data:
        raise HTTPException(status_code=404, detail="QUESTION_NOT_FOUND")
    
    question = q_res.data[0]
    
    # 2. 채점
    is_correct = (submitted_answer == question["correct_answer"])
    
    # 3. 제출 기록 저장 (업서트 또는 인서트)
    submission_data = {
        "question_id": question_id,
        "student_id": student_id,
        "submitted_answer": submitted_answer,
        "is_correct": is_correct
    }
    
    # 이미 푼 기록이 있는 확인
    exist_res = await config.supabase.table("quiz_submissions").select("id").eq("question_id", question_id).eq("student_id", student_id).execute()

    if exist_res.data:
        submission_id = exist_res.data[0]["id"]
        await config.supabase.table("quiz_submissions").update(submission_data).eq("id", submission_id).execute()

    else:
        await config.supabase.table("quiz_submissions").insert(submission_data).execute()

        
    # 4. 결과 반환 포맷

    if is_correct:
         return {
             "is_correct": True,
             "message": "정답입니다!",
             "summary": f"[핵심 개념 요약] {question['explanation']}"
         }
    else:
         return {
             "is_correct": False,
             "message": "오답입니다.",
             "step_by_step_explanation": f"[단계별 해설] 올바른 정답은 '{question['correct_answer']}' 입니다. 이유: {question['explanation']}"
         }
