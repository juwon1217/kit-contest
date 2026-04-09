# Report 시스템 버그 수정 계획

## 문제 요약

리포트 시스템에 3가지 핵심 문제가 있습니다:

1. **학생/강사 리포트 모두 더미 데이터 표시** — 백엔드 API가 실패하여 프론트엔드 catch 블록의 하드코딩 더미 데이터가 표시됨
2. **학생이 강사 리포트를 볼 수 있음** — UI에 역할 전환 토글이 있어 학생도 강사 뷰를 볼 수 있음
3. **수업방별 데이터 분리 안됨** — class_id 변환 누락으로 DB 쿼리가 빈 결과를 반환

## 근본 원인 분석

### 🔴 핵심 버그: class_id 미변환 (백엔드)

> [!CAUTION]
> 이것이 모든 문제의 근본 원인입니다.

DB 스키마를 보면:
- `classes` 테이블: `id`(UUID, PK) + `class_id`(VARCHAR(6), 수업 코드 "A1B2C3")
- `interactions`, `class_students`, `chat_sessions`, `quizzes` 등: 모두 `class_id`가 **UUID FK** (classes.id 참조)

프론트엔드 URL의 `classId`는 **단축 코드**(예: "A1B2C3")인데, `report_router.py`가 이것을 **변환 없이 그대로** `generate_student_report(class_id, ...)` / `generate_instructor_report(class_id)`에 전달합니다.

```python
# 현재 코드 (report_router.py:13)
report_data = generate_student_report(class_id, user["id"])  # class_id = "A1B2C3" ← 잘못됨!
```

`report_generator.py`에서는 이 값으로 `supabase.table("interactions").eq("class_id", class_id)` 등을 호출하는데, DB의 `class_id` 컬럼에는 UUID가 저장되어 있으므로 **항상 빈 결과**가 나옴 → 빈 리포트 반환 → 프론트엔드에서 에러 미체크로 catch문의 더미 데이터가 표시.

비교: `class_manager.py`의 다른 엔드포인트들(`heatmap`, `roster` 등)은 올바르게 변환합니다:
```python
class_res = supabase.table("classes").select("id").eq("class_id", class_id).execute()
internal_class_id = class_res.data[0]["id"]  # UUID로 변환
```

### 🔴 `quiz_engine.py`의 동일한 버그

`get_quizzes_for_student(class_id, student_id)`도 단축 코드를 그대로 사용:
```python
res = supabase.table("quizzes").select("*").eq("class_id", class_id).execute()
# class_id = "A1B2C3" ← UUID여야 하는데 잘못됨!
```
→ 퀴즈도 빈 결과 → 프론트엔드 catch 블록의 더미 퀴즈가 표시

### 🟡 프론트엔드: 역할 토글 & 더미 데이터

- 리포트 페이지에 학생↔강사 역할 전환 버튼이 있어 학생도 강사 뷰를 볼 수 있음
- API 실패 시 catch 블록에서 대규모 더미 데이터를 세팅하여, 사용자가 실제 데이터인지 구분 불가

---

## Proposed Changes

### Backend - class_id 변환 추가

#### [MODIFY] [report_router.py](file:///c:/Users/kjw05/Desktop/kit%20공모전%20-%20복사본/backend/report_router.py)

- 3개 엔드포인트 모두에 **단축 코드 → UUID 변환** 로직 추가
- `classes` 테이블에서 `id`를 조회한 후, UUID를 `generate_student_report()` / `generate_instructor_report()`에 전달
- 존재하지 않는 수업 코드 시 404 반환

```python
# 변환 로직 추가
from config import supabase

def _resolve_class_id(class_code: str) -> str:
    class_res = supabase.table("classes").select("id").eq("class_id", class_code).execute()
    if not class_res.data:
        raise HTTPException(status_code=404, detail="INVALID_CLASS_ID")
    return class_res.data[0]["id"]
```

---

#### [MODIFY] [quiz_engine.py](file:///c:/Users/kjw05/Desktop/kit%20공모전%20-%20복사본/backend/quiz_engine.py)

`get_quizzes_for_student()` 함수에도 동일하게 단축 코드 → UUID 변환 추가

---

### Frontend - 역할 분리 & 더미 데이터 제거

#### [MODIFY] [report page.tsx](file:///c:/Users/kjw05/Desktop/kit%20공모전%20-%20복사본/frontend/src/app/report/[classId]/page.tsx)

1. **역할 전환 토글 제거** — `localStorage`의 `user_role` 기반으로 역할 고정
2. **더미 데이터 fallback 제거** — catch 블록에서 하드코딩 데이터 대신 에러 상태를 표시
3. **에러 UI 추가** — "리포트를 불러올 수 없습니다" 메시지와 재시도 버튼

---

#### [MODIFY] [quiz page.tsx](file:///c:/Users/kjw05/Desktop/kit%20공모전%20-%20복사본/frontend/src/app/quiz/[classId]/page.tsx)

1. **더미 퀴즈 fallback 제거** (line 92-129) — catch에서 에러 UI 표시
2. **더미 채점 fallback 제거** (line 167-179) — catch에서 에러 메시지 표시

---

## User Review Required

> [!IMPORTANT]
> **역할 전환 토글을 완전히 제거합니다.** 현재 헤더에 있는 "학생/강사" 전환 버튼을 삭제하고, 로그인 시 설정한 역할(localStorage의 `user_role`)에 따라 해당하는 리포트만 보여주게 됩니다. 개발/데모 시 양쪽 뷰를 보려면 다른 계정으로 로그인해야 합니다.

> [!IMPORTANT]
> **모든 더미 데이터 fallback을 제거합니다.** API 실패 시 가짜 데이터 대신 에러 UI를 표시합니다. 이렇게 하면 서버가 꺼져있을 때 빈 화면이 보이게 되지만, 가짜 데이터가 실제 데이터인 것처럼 보이는 문제는 해결됩니다.

## Open Questions

없음 — 근본 원인이 명확하고 수정 범위도 확정되었습니다.

## Verification Plan

### Backend 검증
- 서버 실행 후 `/api/report/{class_code}/student` API를 직접 호출하여 실제 DB 데이터가 반환되는지 확인
- 학생 토큰으로 `/api/report/{class_code}/instructor` 호출 시 403 반환 확인

### Frontend 검증
- 학생으로 로그인 → 리포트 페이지 진입 → 학생 리포트만 표시되고, 강사 전환 버튼이 없는지 확인
- 강사로 로그인 → 리포트 페이지 진입 → 강사 리포트만 표시되는지 확인
- 서버 미가동 시 에러 UI가 표시되는지 확인
