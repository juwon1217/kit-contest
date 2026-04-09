# 🍎 Apple 스타일 UI/UX 안전한 마이그레이션 가이드

본 문서는 기존 프론트엔드(Next.js 16 + Tailwind CSS v4) 서비스의 기능과 로직 결함을 방지(꼬이지 않게 보호)하면서, `DESIGN.md`에 명시된 Apple의 디자인 시스템을 안정적으로 이식하기 위한 단계별 전략과 예방 수칙을 정리한 가이드입니다.

---

## 1. 꼬임 방지를 위한 핵심 대원칙

*   **점진적 도입 (Incremental Adoption):** 기존 스타일 코드를 한 번에 완전히 엎지 않습니다. 페이지 전체가 망가지는 것을 막기 위해 가장 작고 독립적인 단위(버튼, 배지)나 독립된 단일 페이지부터 점진적으로 교체합니다.
*   **로직과 렌더링(스타일)의 엄격한 분리:** React의 상태 관리(useState, useEffect)나 API 연동 부분(.tsx 내부 로직)은 **절대 수정하지 않고 보호**합니다. 순수하게 `className` 안의 CSS와 DOM 껍데기만 Apple 디자인으로 씌웁니다.
*   **새로운 래퍼(Wrapper) 컴포넌트 생성 방식:** 기존에 얽혀 있는 컴포넌트(예: `<Button>`)를 직접 고치다가 다른 페이지가 터지는 일을 막기 위해, 옆에 새로운 컴포넌트(예: `<AppleButton>`)를 만들어두고 하나씩 바꿔치기 하는 "병렬 교체 방식"을 권장합니다.

---

## 2. 1단계: 디자인 토큰(Design Tokens) 및 테마 기반 공사

스타일을 하드코딩하면 추후 수정 시 모두 꼬일 수 있으므로, **Tailwind CSS v4 환경**의 메인 CSS 파일(ex: `globals.css`)에 통일된 Apple 변수들을 미리 선언해두고 가져다 씁니다.

```css
/* app/globals.css 예시 */
@layer theme {
  :root {
    /* 1. 색상 (Color Palette) */
    --apple-black: #000000;
    --apple-gray: #f5f5f7;
    --apple-text-dark: #1d1d1f;
    --apple-text-light: #ffffff;
    --apple-blue: #0071e3;
    --apple-link-blue: #0066cc;
    --apple-focus-ring: #0071e3;

    /* 2. 공간 (Shadow & Glass) */
    --apple-shadow-card: 3px 5px 30px 0px rgba(0, 0, 0, 0.22);
  }
}
```

---

## 3. 2단계: 타이포그래피(폰트)의 점진적 적용

기존 프로젝트의 폰트를 일괄로 변경하면 여백과 레이아웃이 전부 뒤틀리게 됩니다.
따라서 `SF Pro Display`, `SF Pro Text` 폰트 클래스를 만들고, 리팩토링할 구역만 해당 클래스를 감싸서(Wrap) 적용합니다.

*   `DESIGN.md`의 타이포그래피 철학(마이너스 자간 적용)을 Tailwind의 유틸리티로 규격화합니다.
    *   **헤드라인 강제 좁은 행간:** `leading-[1.07]` , `tracking-[-0.28px]`
    *   **본문 폰트 가독성 행간:** `leading-[1.47]`, `tracking-[-0.374px]`

---

## 4. 3단계: 안전한 UI 컴포넌트화 (병렬 방식)

기능이 꼬이는 가장 큰 원인은 '모두가 공유하고 있는 흔한 버튼 스타일'을 잘못 건드리는 경우입니다. 독립된 컨테이너로 캡슐화합니다.

### 🍏 안전한 컴포넌트 교체 예시: `AppleButton.tsx` 만들기
기존 로직(onClick, disabled 등)은 전부 그대로 전달(`...props`)받기 때문에 기능은 전혀 고장 나지 않습니다.

```tsx
export default function AppleButton({ children, variant = 'primary', ...props }) {
  // Apple 스타일 기본 베이스
  const baseStyle = "transition-all duration-200 outline-none focus:ring-2 focus:ring-[#0071e3]";
  
  // DESIGN.md에 따른 상태별 Button Variants
  const variants = {
    primary: "bg-[#0071e3] text-white px-[15px] py-[8px] rounded-[8px] hover:brightness-110",
    dark: "bg-[#1d1d1f] text-white px-[15px] py-[8px] rounded-[8px]",
    pill: "bg-transparent text-[#0066cc] border border-[#0066cc] rounded-[980px] px-4 py-1 hover:underline text-[14px]",
  };
  
  return (
    <button className={`${baseStyle} ${variants[variant]}`} {...props}>
      {children}
    </button>
  );
}
```

---

## 5. 4단계: 섹션(여백)과 레이아웃 교체 시 주의점

`DESIGN.md`의 핵심인 "시네마틱한 호흡 관리(Generous Whitespace)"를 구현하기 위한 배치 규칙입니다. 레이아웃 꼬임을 막는 체크리스트입니다.

1.  **배경색 충돌 방지:** `bg-[#000000]` 과 `bg-[#f5f5f7]`이 교차되는 구간을 만들 때, 기존 여백(margin) 때문에 컴포넌트들 사이에 틈새(흰 줄)가 보이지 않도록 모두 Padding 단위로 흡수시킵니다.
2.  **Navigation Glass Effect 겹침 현상:** `backdrop-filter: saturate(180%) blur(20px)`를 사용하는 상단 네비게이션이 모달(Modal)이나 배경 오브젝트보다 뒤로 숨어 꼬이지 않도록 명시적으로 `z-index` 체계를 설계해야 합니다. (예: Nav는 `z-50`, Modal은 `z-100`)
3.  **반응형(모바일) 글자 넘침 방지:** Display Header 텍스트(56px)는 모바일 화면에서 무조건 깨지거나 밀려나므로, `vw`를 활용하거나 `md:text-[40px] text-[28px]` 식으로 Tailwind 반응형 접두어를 반드시 포함해야 합니다.

---

## 🚀 앞으로의 진행 프로세스 제안

프론트엔드가 꼬이는 것을 막기 위해, 다음 순서로 하나씩 작업을 지시해 주시면 매우 안전하게 이식할 수 있습니다.

1.  **[1스텝]** 전역 테마 파일 (`globals.css` 및 Tailwind v4 변수) 설정하기
2.  **[2스텝]** 공통 기본 컴포넌트(`AppleButton`, `AppleCard` 등) 신규 생성하기
3.  **[3스텝]** 특정 테스트 페이지(예: 메인페이지의 히어로 섹션) 1개만 기능 고장 없이 통째로 교체해보기
4.  **[4스텝]** 네비게이션(Nav)에 Apple Glass Effect 유리 효과 입히기
