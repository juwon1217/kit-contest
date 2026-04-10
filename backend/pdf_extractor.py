import fitz  # PyMuPDF
import random

def extract_text_from_pdf_pages(pdf_bytes: bytes, target_pages: list[int], total_pages: int = None) -> str:
    """다운로드된 PDF 바이트에서 주어진 target_pages에 해당하는 텍스트 추출
       PyMuPDF를 사용하여 텍스트 추출.
    """
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as e:
        print(f"[PDF_EXTRACT] Failed to load PDF bytes: {e}")
        return ""
        
    doc_pages_count = len(doc)
    
    # 만약 target_pages 갯수가 5 미만이라면 랜덤하게 다른 페이지를 추가하여 컨텍스트 보충
    if len(target_pages) < 5:
        all_pages = set(range(1, doc_pages_count + 1))
        remaining = list(all_pages - set(target_pages))
        # 필요한 만큼 랜덤하게 추가 (최대 5페이지)
        needed = 5 - len(target_pages)
        if remaining:
            target_pages.extend(random.sample(remaining, min(needed, len(remaining))))

    extracted_context = ""

    for p_num in target_pages:
        # PyMuPDF는 0-indexed, 페이지 번호는 1-indexed
        idx = p_num - 1
        if idx < 0 or idx >= doc_pages_count:
            continue
            
        page = doc.load_page(idx)
        text = page.get_text().strip()
        
        # OCR 폴백 제거됨 (경량화)
        if not text:
            text = "(이미지 기반 페이지 혹은 텍스트가 없는 페이지입니다)"
            
        extracted_context += f"--- Page {p_num} ---\n{text}\n\n"
        
    doc.close()
    return extracted_context
