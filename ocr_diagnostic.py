#!/usr/bin/env python3
"""
OCR Diagnostic Tool für FrameCleaner Gibberish-Problem

Analysiert das OCR-System und identifiziert die Ursache für unlesbaren
representative_ocr_text in der Frame-Verarbeitung.

Usage:
    python ocr_diagnostic.py --video-id 23 --output-dir ./debug/ocr
"""

import os
import sys
import logging
import subprocess
import tempfile
import argparse
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional
import cv2
import numpy as np
import pandas as pd
import pytesseract
from PIL import Image
import re
import unicodedata

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class OCRDiagnostic:
    """Diagnose-Tool für OCR-Probleme im FrameCleaner."""
    
    def __init__(self, output_dir: str = "./debug/ocr"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Verschiedene OCR-Konfigurationen zum Testen
        self.test_configs = [
            {"name": "current", "lang": "deu+eng", "psm": 6, "oem": 3, "dpi": 300},
            {"name": "single_word", "lang": "deu+eng", "psm": 8, "oem": 3, "dpi": 400},
            {"name": "single_block", "lang": "deu+eng", "psm": 6, "oem": 1, "dpi": 300},
            {"name": "single_line", "lang": "deu+eng", "psm": 7, "oem": 3, "dpi": 300},
            {"name": "auto_osd", "lang": "deu+eng", "psm": 3, "oem": 3, "dpi": 300},
            {"name": "eng_only", "lang": "eng", "psm": 6, "oem": 3, "dpi": 300},
            {"name": "deu_only", "lang": "deu", "psm": 6, "oem": 3, "dpi": 300},
        ]
        
        self.results = []
        
    def check_tesseract_setup(self) -> Dict[str, Any]:
        """Überprüft Tesseract-Installation und verfügbare Sprachen."""
        logger.info("🔍 Checking Tesseract setup...")
        
        setup_info = {}
        
        try:
            # Tesseract Version
            version_output = subprocess.check_output(["tesseract", "--version"], 
                                                   stderr=subprocess.STDOUT, text=True)
            setup_info["version"] = version_output.strip().split('\n')[0]
            
            # Verfügbare Sprachen
            langs_output = subprocess.check_output(["tesseract", "--list-langs"], 
                                                 stderr=subprocess.STDOUT, text=True)
            langs = [line.strip() for line in langs_output.strip().split('\n')[1:]]
            setup_info["languages"] = langs
            setup_info["has_deu"] = "deu" in langs
            setup_info["has_eng"] = "eng" in langs
            
            logger.info(f"✅ Tesseract Version: {setup_info['version']}")
            logger.info(f"✅ Sprachen verfügbar: {len(langs)} (deu: {setup_info['has_deu']}, eng: {setup_info['has_eng']})")
            
        except Exception as e:
            setup_info["error"] = str(e)
            logger.error(f"❌ Tesseract Setup-Fehler: {e}")
            
        return setup_info
    
    def analyze_text_quality(self, text: str) -> Dict[str, Any]:
        """Analysiert die Qualität eines OCR-Textes."""
        if not text:
            return {"len": 0, "letters": 0, "digits": 0, "punct": 0, 
                   "punct_ratio": 0.0, "words": 0, "readable_words": 0}
        
        # Normalisiere Unicode
        text = unicodedata.normalize("NFKC", text)
        
        # Zähle verschiedene Zeichentypen
        punct_chars = r"""!@#$%^&*()_+{}|:"<>?`~[]\;',./§°^""‚''–—•…"""
        letters = sum(1 for ch in text if ch.isalpha())
        digits = sum(1 for ch in text if ch.isdigit())
        punct = sum(1 for ch in text if ch in punct_chars)
        whitespace = sum(1 for ch in text if ch.isspace())
        
        # Wörter analysieren
        words = re.findall(r"[A-Za-zÄÖÜäöüß]{2,}", text)
        readable_words = [w for w in words if len(w) >= 3 and not all(c == words[0][0] for c in w)]
        
        # Gibberish-Indikatoren
        repeated_chars = len(re.findall(r"(.)\1{3,}", text))  # 4+ gleiche Zeichen hintereinander
        special_symbols = sum(1 for ch in text if ord(ch) > 127 and not ch.isalpha())
        
        return {
            "len": len(text),
            "letters": letters,
            "digits": digits,
            "punct": punct,
            "whitespace": whitespace,
            "punct_ratio": punct / max(1, len(text)),
            "words": len(words),
            "readable_words": len(readable_words),
            "repeated_chars": repeated_chars,
            "special_symbols": special_symbols,
            "text_sample": text[:100].replace("\n", "\\n")
        }
    
    def test_ocr_config(self, image: np.ndarray, config: Dict[str, Any], 
                       frame_idx: int) -> Dict[str, Any]:
        """Testet eine OCR-Konfiguration auf einem Bild."""
        try:
            # Build tesseract config string
            tesseract_config = f"--oem {config['oem']} --psm {config['psm']} --dpi {config['dpi']}"
            
            # Führe OCR durch
            ocr_data = pytesseract.image_to_data(
                image,
                lang=config['lang'],
                config=tesseract_config,
                output_type=pytesseract.Output.DICT
            )
            
            # Extrahiere Text mit Konfidenz
            words = []
            confidences = []
            
            for i, word in enumerate(ocr_data['text']):
                if word.strip():
                    conf = int(ocr_data['conf'][i])
                    if conf > 0:  # Akzeptiere alle positiven Konfidenzen für Diagnose
                        words.append(word.strip())
                        confidences.append(conf)
            
            text = ' '.join(words)
            mean_conf = sum(confidences) / len(confidences) if confidences else 0.0
            
            # Analysiere Textqualität
            quality = self.analyze_text_quality(text)
            
            result = {
                "frame_idx": frame_idx,
                "config_name": config['name'],
                "text": text,
                "mean_conf": mean_conf,
                "word_count": len(words),
                **quality
            }
            
            logger.debug(f"Config {config['name']}: {mean_conf:.1f}% conf, {len(words)} words, "
                        f"punct_ratio: {quality['punct_ratio']:.2f}")
            
            return result
            
        except Exception as e:
            logger.error(f"OCR config {config['name']} failed: {e}")
            return {
                "frame_idx": frame_idx,
                "config_name": config['name'],
                "error": str(e),
                "text": "",
                "mean_conf": 0.0,
                "word_count": 0
            }
    
    def preprocess_variations(self, frame: np.ndarray) -> Dict[str, np.ndarray]:
        """Erstellt verschiedene Preprocessing-Varianten eines Frames."""
        variations = {}
        
        # Original grayscale
        if len(frame.shape) == 3:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        else:
            gray = frame.copy()
        variations["original"] = gray
        
        # Keine Vorverarbeitung (ROI ausgeschnitten)
        variations["raw"] = gray
        
        # OTSU Threshold
        _, otsu = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        variations["otsu"] = otsu
        
        # Adaptive Threshold
        adaptive = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                       cv2.THRESH_BINARY, 11, 2)
        variations["adaptive"] = adaptive
        
        # Kontrastverbesserung
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        enhanced = clahe.apply(gray)
        variations["enhanced"] = enhanced
        
        # Gaussian Blur + Threshold
        blurred = cv2.GaussianBlur(gray, (3, 3), 0)
        _, blur_thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        variations["blur_thresh"] = blur_thresh
        
        # Morphological cleaning
        kernel = np.ones((2,2), np.uint8)
        cleaned = cv2.morphologyEx(otsu, cv2.MORPH_CLOSE, kernel)
        cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, kernel)
        variations["morph_clean"] = cleaned
        
        return variations
    
    def diagnose_frame(self, frame: np.ndarray, frame_idx: int, roi: Optional[Dict] = None) -> List[Dict]:
        """Führt vollständige Diagnose für einen Frame durch."""
        logger.info(f"🔍 Diagnosing frame {frame_idx}")
        
        # ROI anwenden falls vorhanden
        if roi:
            x, y, w, h = roi.get('x', 0), roi.get('y', 0), roi.get('width', frame.shape[1]), roi.get('height', frame.shape[0])
            frame = frame[y:y+h, x:x+w]
        
        # Speichere Original
        frame_dir = self.output_dir / f"frame_{frame_idx:06d}"
        frame_dir.mkdir(exist_ok=True)
        cv2.imwrite(str(frame_dir / "original.png"), frame)
        
        frame_results = []
        
        # Teste verschiedene Preprocessing-Varianten
        variations = self.preprocess_variations(frame)
        
        for var_name, processed_img in variations.items():
            # Speichere Preprocessing-Variante
            cv2.imwrite(str(frame_dir / f"preprocess_{var_name}.png"), processed_img)
            
            # Teste alle OCR-Konfigurationen
            for config in self.test_configs:
                result = self.test_ocr_config(processed_img, config, frame_idx)
                result["preprocessing"] = var_name
                result["roi"] = str(roi) if roi else "None"
                frame_results.append(result)
        
        return frame_results
    
    def generate_report(self, video_id: str, results: List[Dict]) -> str:
        """Generiert einen detaillierten Diagnosebericht."""
        report_path = self.output_dir / f"ocr_diagnostic_report_{video_id}.md"
        
        # Konvertiere zu DataFrame für Analyse
        df = pd.DataFrame([r for r in results if 'error' not in r])
        
        if df.empty:
            logger.error("Keine erfolgreichen OCR-Ergebnisse für Bericht")
            return str(report_path)
        
        # Analysiere Ergebnisse
        best_configs = df.nlargest(5, 'mean_conf')
        worst_gibberish = df.nsmallest(5, 'readable_words')
        
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(f"# OCR Diagnostic Report - Video {video_id}\n\n")
            f.write(f"Generated: {pd.Timestamp.now()}\n\n")
            
            # Setup Info
            setup = self.check_tesseract_setup()
            f.write("## Tesseract Setup\n\n")
            f.write(f"- Version: {setup.get('version', 'Unknown')}\n")
            f.write(f"- German language pack: {'✅' if setup.get('has_deu') else '❌'}\n")
            f.write(f"- English language pack: {'✅' if setup.get('has_eng') else '❌'}\n")
            f.write(f"- Available languages: {len(setup.get('languages', []))}\n\n")
            
            # Statistiken
            f.write("## OCR Statistics\n\n")
            f.write(f"- Total tests: {len(df)}\n")
            f.write(f"- Average confidence: {df['mean_conf'].mean():.1f}%\n")
            f.write(f"- Average punctuation ratio: {df['punct_ratio'].mean():.3f}\n")
            f.write(f"- Average readable words: {df['readable_words'].mean():.1f}\n\n")
            
            # Beste Konfigurationen
            f.write("## Top 5 Configurations by Confidence\n\n")
            f.write("| Config | Preprocessing | Confidence | Readable Words | Punct Ratio | Text Sample |\n")
            f.write("|--------|---------------|------------|----------------|-------------|-------------|\n")
            for _, row in best_configs.iterrows():
                f.write(f"| {row['config_name']} | {row['preprocessing']} | {row['mean_conf']:.1f}% | {row['readable_words']} | {row['punct_ratio']:.3f} | {row['text_sample'][:30]}... |\n")
            
            f.write("\n## Worst Gibberish Results\n\n")
            f.write("| Config | Preprocessing | Confidence | Readable Words | Punct Ratio | Text Sample |\n")
            f.write("|--------|---------------|------------|----------------|-------------|-------------|\n")
            for _, row in worst_gibberish.iterrows():
                f.write(f"| {row['config_name']} | {row['preprocessing']} | {row['mean_conf']:.1f}% | {row['readable_words']} | {row['punct_ratio']:.3f} | {row['text_sample'][:30]}... |\n")
            
            # Empfehlungen
            f.write("\n## Recommendations\n\n")
            
            if df['mean_conf'].max() < 20:
                f.write("⚠️ **LOW CONFIDENCE ISSUE**: All OCR results have very low confidence (<20%)\n")
                f.write("- Check if ROI is correctly positioned over text areas\n")
                f.write("- Verify image quality and resolution\n")
                f.write("- Consider different preprocessing approaches\n\n")
            
            if df['punct_ratio'].mean() > 0.5:
                f.write("⚠️ **HIGH PUNCTUATION RATIO**: Text contains excessive punctuation/symbols\n")
                f.write("- Likely indicating OCR misinterpretation of visual elements\n")
                f.write("- Consider different PSM modes or preprocessing\n\n")
            
            if df['readable_words'].mean() < 2:
                f.write("⚠️ **LOW READABLE WORDS**: Very few meaningful words extracted\n")
                f.write("- Text may be too small, rotated, or corrupted\n")
                f.write("- Try different scaling or orientation detection\n\n")
            
            # Spezifische Empfehlungen basierend auf besten Ergebnissen
            best_row = df.loc[df['mean_conf'].idxmax()]
            f.write(f"### Recommended Configuration\n\n")
            f.write(f"- **Language**: {best_row.get('config_name', 'N/A')}\n")
            f.write(f"- **Preprocessing**: {best_row.get('preprocessing', 'N/A')}\n")
            f.write(f"- **Expected confidence**: {best_row['mean_conf']:.1f}%\n")
            f.write(f"- **Expected readable words**: {best_row['readable_words']}\n")
        
        logger.info(f"📄 Report generated: {report_path}")
        return str(report_path)
    
    def run_diagnosis(self, video_path: str, video_id: str, num_frames: int = 5) -> str:
        """Führt vollständige OCR-Diagnose durch."""
        logger.info(f"🚀 Starting OCR diagnosis for video {video_id}")
        
        # Video öffnen
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")
        
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        logger.info(f"Video has {total_frames} frames, sampling {num_frames}")
        
        # Sample-Frames auswählen (gleichmäßig verteilt)
        frame_indices = np.linspace(0, total_frames-1, num_frames, dtype=int)
        
        all_results = []
        
        for i, frame_idx in enumerate(frame_indices):
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame = cap.read()
            
            if not ret:
                logger.warning(f"Could not read frame {frame_idx}")
                continue
            
            # Diagnose diesen Frame
            frame_results = self.diagnose_frame(frame, frame_idx)
            all_results.extend(frame_results)
            
            logger.info(f"Progress: {i+1}/{len(frame_indices)} frames processed")
        
        cap.release()
        
        # Speichere Ergebnisse als CSV
        results_df = pd.DataFrame(all_results)
        csv_path = self.output_dir / f"ocr_results_{video_id}.csv"
        results_df.to_csv(csv_path, index=False)
        logger.info(f"💾 Results saved to: {csv_path}")
        
        # Generiere Bericht
        report_path = self.generate_report(video_id, all_results)
        
        return report_path


def main():
    parser = argparse.ArgumentParser(description="OCR Diagnostic Tool")
    parser.add_argument("--video-path", required=True, help="Path to video file")
    parser.add_argument("--video-id", required=True, help="Video ID for reporting")
    parser.add_argument("--output-dir", default="./debug/ocr", help="Output directory")
    parser.add_argument("--num-frames", type=int, default=10, help="Number of frames to sample")
    
    args = parser.parse_args()
    
    # Erstelle Diagnose-Tool
    diagnostic = OCRDiagnostic(args.output_dir)
    
    # Führe Diagnose durch
    try:
        report_path = diagnostic.run_diagnosis(args.video_path, args.video_id, args.num_frames)
        
        print(f"\n✅ OCR Diagnostic completed!")
        print(f"📄 Report: {report_path}")
        print(f"📁 Debug files: {args.output_dir}")
        
    except Exception as e:
        logger.error(f"❌ Diagnostic failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
