#!/usr/bin/env python3
"""
Converts a PDF to a .docx file using pdf2docx, which reconstructs real
paragraphs, tables, and (critically) correct logical Unicode text — unlike
LibreOffice's generic PDF import filter, which frequently extracts
pre-shaped "presentation form" glyphs for complex scripts (Arabic, Persian,
Kurdish, etc.), producing disconnected/reversed-looking letters.

Usage: python3 pdf2docx_convert.py <input.pdf> <output.docx>
Exits 0 on success, non-zero with an error message on stderr on failure.
"""
import sys


def main():
    if len(sys.argv) != 3:
        print("Usage: pdf2docx_convert.py <input.pdf> <output.docx>", file=sys.stderr)
        sys.exit(1)

    input_path, output_path = sys.argv[1], sys.argv[2]

    try:
        from pdf2docx import Converter
    except ImportError:
        print("pdf2docx is not installed", file=sys.stderr)
        sys.exit(2)

    try:
        cv = Converter(input_path)
        cv.convert(output_path)
        cv.close()
    except Exception as e:
        print(f"pdf2docx conversion failed: {e}", file=sys.stderr)
        sys.exit(3)

    # Repair Arabic/Persian/Kurdish text damage (reversed lam-alef ligatures)
    # and mark right-to-left paragraphs. Best-effort: conversion stays usable.
    try:
        import os
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from rtl_fix import build_ligature_repairs, apply_to_docx
        repairs = build_ligature_repairs(input_path)
        apply_to_docx(output_path, repairs)
    except Exception as e:
        print(f"note: RTL post-processing skipped ({e})", file=sys.stderr)

    sys.exit(0)


if __name__ == "__main__":
    main()
