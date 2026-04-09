import fitz  # PyMuPDF
import random
try:
    from paddleocr import PaddleOCR
    # PaddleOCR 초기화 (실제 설치되었을 때만)
    ocr = PaddleOCR(use_angle_cls=True, lang='korean', show_log=False)
    PADDLE_OCR_AVAILABLE = True
except ImportError:
    PADDLE_OCR_AVAILABLE = False
    ocr = None

def extract_text_from_pdf_pages(pdf_bytes: bytes, target_pages: list[int], total_pages: int = None) -> str:
    """다운로드된 PDF 바이트에서 주어진 target_pages에 해당하는 텍스트 추출
       PyMuPDF를 기본으로 사용하되, 추출된 텍스트가 너무 적으면 이미지로 변환하여 PaddleOCR 추출 시도.
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
        
        # 텍스트가 거의 추출되지 않았다면 (예: 글자가 50자 미만인 스캔본) -> OCR 폴백 
        if len(text) < 50 and PADDLE_OCR_AVAILABLE:
            print(f"[PDF_EXTRACT] Page {p_num} has little text. Falling back to PaddleOCR...")
            try:
                # PDF 페이지를 픽셀맵(이미지)으로 변환
                pix = page.get_pixmap()
                img_bytes = pix.tobytes("png")
                # PaddleOCR는 파일 경로나 numpy 배열을 요구하므로 numpy로 변환
                import numpy as np
                import cv2
                nparr = np.frombuffer(img_bytes, np.uint8)
                img_cv = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                result = ocr.ocr(img_cv, cls=True)
                ocr_text = ""
                if result and result[0]:
                    for line in result[0]:
                        # line 구조: [[(x,y), ...], (text, confidence)]
                        ocr_text += line[1][0] + " "
                text = ocr_text.strip()
            except Exception as e:
                print(f"[PDF_EXTRACT] PaddleOCR failed for page {p_num}: {e}")
                
        extracted_context += f"--- Page {p_num} ---\n{text}\n\n"
        
    doc.close()
    return extracted_context
