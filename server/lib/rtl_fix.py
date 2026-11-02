"""
Repairs Arabic/Persian/Kurdish text damage that occurs when PDFs are converted
to Word.

1. LAM-ALEF LIGATURE REVERSAL.
   "لا" is drawn in a PDF as a single ligature glyph whose ToUnicode entry maps
   it to U+0644 U+0627 in correct logical order. When an extractor reorders a
   right-to-left line, it reverses those two characters too, so every "لا"
   comes out as "ال".

   The reliable discriminator is geometric: a reversed ligature leaves the alef
   with a ZERO-WIDTH bounding box. A genuine standalone alef always has width.

2. PARAGRAPH DIRECTION.
   pdf2docx writes runs without marking the paragraph right-to-left, so Word
   lays the words out left-to-right. Any paragraph containing Arabic-script
   text gets an explicit RTL mark.
"""

import re

ALEF = "\u0627"
LAM = "\u0644"
ARABIC_RE = re.compile(r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]")


def build_ligature_repairs(pdf_path):
    import pymupdf

    repairs = {}
    genuine = set()
    doc = pymupdf.open(pdf_path)
    try:
        for page in doc:
            raw = page.get_text("rawdict")
            for block in raw.get("blocks", []):
                for line in block.get("lines", []):
                    chars = [c for span in line.get("spans", []) for c in span.get("chars", [])]
                    if not chars:
                        continue
                    word_damaged, word_fixed = [], []
                    skip_next = False
                    for i, ch in enumerate(chars):
                        c = ch["c"]
                        if c.isspace():
                            _record(repairs, genuine, word_damaged, word_fixed)
                            word_damaged, word_fixed = [], []
                            skip_next = False
                            continue
                        word_damaged.append(c)
                        if skip_next:
                            skip_next = False
                            continue
                        x0, x1 = ch["bbox"][0], ch["bbox"][2]
                        zero_width = abs(x1 - x0) < 0.01
                        nxt = chars[i + 1]["c"] if i + 1 < len(chars) else ""
                        if c == ALEF and zero_width and nxt == LAM:
                            word_fixed.append(LAM)
                            word_fixed.append(ALEF)
                            skip_next = True
                        else:
                            word_fixed.append(c)
                    _record(repairs, genuine, word_damaged, word_fixed)
    finally:
        doc.close()
    return {d: f for d, f in repairs.items() if d not in genuine}


def _record(repairs, genuine, damaged, fixed):
    d = "".join(damaged).strip()
    f = "".join(fixed).strip()
    if not d or not f:
        return
    if d != f:
        repairs[d] = f
    else:
        genuine.add(d)


def apply_to_docx(docx_path, repairs):
    import docx
    from docx.oxml.ns import qn
    from docx.oxml import OxmlElement

    document = docx.Document(docx_path)
    compiled = []
    for damaged, fixed in sorted(repairs.items(), key=lambda kv: -len(kv[0])):
        pattern = re.compile(
            r"(?<![\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF])"
            + re.escape(damaged)
            + r"(?![\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF])"
        )
        compiled.append((pattern, fixed))

    def fix_paragraph(paragraph):
        has_arabic = False
        for run in paragraph.runs:
            text = run.text
            if not text:
                continue
            if compiled:
                for pattern, fixed in compiled:
                    text = pattern.sub(fixed, text)
                if text != run.text:
                    run.text = text
            if ARABIC_RE.search(text):
                has_arabic = True
                rPr = run._element.get_or_add_rPr()
                if rPr.find(qn("w:rtl")) is None:
                    rtl = OxmlElement("w:rtl")
                    rPr.append(rtl)
        if has_arabic:
            pPr = paragraph._p.get_or_add_pPr()
            if pPr.find(qn("w:bidi")) is None:
                bidi = OxmlElement("w:bidi")
                pPr.append(bidi)

    for paragraph in document.paragraphs:
        fix_paragraph(paragraph)
    for table in document.tables:
        for row in table.rows:
            for cell in row.cells:
                for paragraph in cell.paragraphs:
                    fix_paragraph(paragraph)
    document.save(docx_path)
