"""
================================================================================
 underwater_debris_detector.py
--------------------------------------------------------------------------------
 ARK-C 로봇 온보드(엣지) 수중 해양 쓰레기 실시간 탐지·분류 참조 구현.

 이 저장소(ARK-C 관제 앱)는 탐지 "결과"를 시각화하는 React 웹앱이고,
 실제 추론은 로봇 온보드에서 수행한다(엣지 컴퓨팅). 이 파일은 그 온보드
 탐지기의 참조 코드다. 웹 빌드에는 포함되지 않는다.

 기능
 - 기존 '페트병' 단일 클래스 → '종이 박스', '나뭇가지'까지 확장(추론/학습).
 - 수중 특성(흐릿함·저조도) 대응 전처리(디헤이징·화이트밸런스·감마).
 - 실시간 경량 추론: Ultralytics YOLOv8(n/s) 기반, FP16·리사이즈.
 - 시각화: 주황(#FF8C00) 사각 박스 + 박스 옆 '세로 배치' 한국어 라벨 태그
   (이름 + 신뢰도). 라벨 겹침 방지 배치 로직 포함.

 의존성
   pip install ultralytics opencv-python pillow numpy

 사용 예
   # 웹캠/스트림 실시간
   python underwater_debris_detector.py --source 0
   # 동영상 파일
   python underwater_debris_detector.py --source dive.mp4 --save out.mp4
   # 이미지 한 장
   python underwater_debris_detector.py --source frame.jpg --show
================================================================================
"""
from __future__ import annotations

import argparse
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

# ──────────────────────────────────────────────────────────────────────────────
# 1) 클래스 정의  (모델 확장 지점)
#    영문 키 = 학습 데이터 클래스명, 한글 = 화면 출력 라벨(요구사항: 한국어 출력)
#    새 클래스를 추가하려면 아래 딕셔너리와 data.yaml(하단 train 참고)만 맞추면 된다.
# ──────────────────────────────────────────────────────────────────────────────
CLASS_KO = {
    "pet_bottle": "페트병",
    "cardboard_box": "종이 박스",
    "tree_branch": "나뭇가지",
}
CLASS_ORDER = ["pet_bottle", "cardboard_box", "tree_branch"]  # 클래스 인덱스 순서


@dataclass
class DetectorConfig:
    """탐지·시각화 파라미터. 수중 환경에 맞춰 기본값을 보수적으로 설정."""
    weights: str = "yolov8n.pt"      # 학습 완료 시 'runs/.../best.pt'로 교체
    imgsz: int = 640                 # 추론 해상도(작을수록 빠름). 실시간이면 512도 고려
    conf: float = 0.25               # 신뢰도 임계값 — 흐릿한 수중 객체 위해 낮게
    iou: float = 0.50                # NMS IoU
    max_det: int = 50
    device: str = ""                 # "" 자동 / "cpu" / "0"(GPU)
    half: bool = True                # FP16 추론(GPU에서 프레임 드랍 방지)
    augment: bool = True             # TTA — 저대비 객체 검출률↑ (약간 느려짐)
    # 시각화
    box_rgb: tuple = (255, 140, 0)   # #FF8C00 (주황). PIL은 RGB 사용
    box_thickness: int = 3
    font_path: str = ""              # 한글 폰트 경로(미지정 시 자동 탐색)
    font_size: int = 18
    enhance: bool = True             # 수중 전처리 on/off


# ──────────────────────────────────────────────────────────────────────────────
# 2) 수중 이미지 전처리
#    - 디헤이징(CLAHE): 탁도로 흐려진 대비를 국소적으로 복원
#    - 그레이월드 화이트밸런스: 청록색 편향(수중 색수차) 보정
#    - 감마: 어두운 객체 밝기 끌어올림
#    → 형태가 흐릿하거나 어두운 객체의 검출률을 높인다.
# ──────────────────────────────────────────────────────────────────────────────
class UnderwaterEnhancer:
    def __init__(self, clip_limit: float = 2.5, tile: int = 8, gamma: float = 1.15):
        self._clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(tile, tile))
        # 감마 LUT 미리 계산(프레임마다 재계산하지 않도록 — 실시간 성능)
        inv = 1.0 / max(1e-6, gamma)
        self._lut = np.array([((i / 255.0) ** inv) * 255 for i in range(256)], dtype=np.uint8)

    @staticmethod
    def _gray_world_wb(bgr: np.ndarray) -> np.ndarray:
        """그레이월드 가정 화이트밸런스 — 채널 평균을 맞춰 색 편향 제거."""
        b, g, r = cv2.split(bgr.astype(np.float32))
        mean = (b.mean() + g.mean() + r.mean()) / 3.0 + 1e-6
        b *= mean / (b.mean() + 1e-6)
        g *= mean / (g.mean() + 1e-6)
        r *= mean / (r.mean() + 1e-6)
        return cv2.merge([b, g, r]).clip(0, 255).astype(np.uint8)

    def __call__(self, bgr: np.ndarray) -> np.ndarray:
        out = self._gray_world_wb(bgr)
        # CLAHE는 밝기(L) 채널에만 적용해 색 왜곡 최소화
        lab = cv2.cvtColor(out, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        l = self._clahe.apply(l)
        out = cv2.cvtColor(cv2.merge([l, a, b]), cv2.COLOR_LAB2BGR)
        return cv2.LUT(out, self._lut)


# ──────────────────────────────────────────────────────────────────────────────
# 3) 탐지기 (Ultralytics YOLOv8)
#    run(frame) → [Detection, ...]  프레임 1장에 대한 탐지 결과
# ──────────────────────────────────────────────────────────────────────────────
@dataclass
class Detection:
    cls_key: str        # 영문 클래스 키
    label_ko: str       # 한국어 라벨
    conf: float         # 신뢰도 0~1
    xyxy: tuple         # (x1, y1, x2, y2) 픽셀


class DebrisDetector:
    def __init__(self, cfg: DetectorConfig):
        # 지연 임포트: ultralytics 미설치 환경에서도 파일 자체는 열람 가능
        from ultralytics import YOLO

        self.cfg = cfg
        self.enhancer = UnderwaterEnhancer() if cfg.enhance else None
        self.model = YOLO(cfg.weights)
        # 모델의 클래스 이름 → 한국어 매핑 테이블 준비(학습 모델/기본 모델 모두 대응)
        self._names = self.model.names  # {idx: 'name'}

    def _to_ko(self, name: str) -> Optional[str]:
        # 학습 모델이면 CLASS_KO 키와 일치, 기본 yolov8이면 데모용으로 일부만 매핑
        if name in CLASS_KO:
            return CLASS_KO[name]
        demo = {"bottle": "페트병"}  # COCO 'bottle' → 데모 표시용
        return demo.get(name)

    def run(self, frame_bgr: np.ndarray) -> List[Detection]:
        img = self.enhancer(frame_bgr) if self.enhancer else frame_bgr
        # predict: verbose 끄고, 실시간 파라미터 전달
        res = self.model.predict(
            img,
            imgsz=self.cfg.imgsz,
            conf=self.cfg.conf,
            iou=self.cfg.iou,
            max_det=self.cfg.max_det,
            device=self.cfg.device or None,
            half=self.cfg.half,
            augment=self.cfg.augment,
            verbose=False,
        )[0]

        dets: List[Detection] = []
        for b in res.boxes:
            name = self._names[int(b.cls)]
            ko = self._to_ko(name)
            if ko is None:
                continue  # 관심 클래스(쓰레기)만 남김
            x1, y1, x2, y2 = (float(v) for v in b.xyxy[0])
            dets.append(Detection(name, ko, float(b.conf), (x1, y1, x2, y2)))
        return dets


# ──────────────────────────────────────────────────────────────────────────────
# 4) 시각화  (주황 박스 + 세로 한국어 라벨 태그 + 겹침 방지)
# ──────────────────────────────────────────────────────────────────────────────
def _load_font(cfg: DetectorConfig) -> ImageFont.FreeTypeFont:
    """한국어 지원 폰트 로드. 지정이 없으면 OS별 기본 한글 폰트를 탐색."""
    candidates = [cfg.font_path] if cfg.font_path else []
    candidates += [
        "C:/Windows/Fonts/malgun.ttf",                         # Windows 맑은 고딕
        "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",     # Linux 나눔고딕
        "/System/Library/Fonts/AppleSDGothicNeo.ttc",          # macOS
    ]
    for p in candidates:
        if p and Path(p).exists():
            return ImageFont.truetype(p, cfg.font_size)
    return ImageFont.load_default()  # 폴백(한글이 깨질 수 있음 → 폰트 설치 권장)


def _text_size(font: ImageFont.FreeTypeFont, text: str) -> tuple:
    box = font.getbbox(text)
    return box[2] - box[0], box[3] - box[1]


def _resolve_overlaps(tags: List[dict], frame_h: int, gap: int = 4) -> None:
    """라벨 겹침 방지: 위→아래로 정렬 후, 겹치면 아래로 밀어 배치(제자리 수정).
    tags[i] = {y, h, ...}  (세로 태그의 세로 위치/높이)."""
    tags.sort(key=lambda t: t["y"])
    for i in range(1, len(tags)):
        prev = tags[i - 1]
        cur = tags[i]
        min_y = prev["y"] + prev["h"] + gap
        if cur["y"] < min_y:
            cur["y"] = min_y
    # 화면 하단을 넘치면 위로 되끌어 담기
    for t in tags:
        if t["y"] + t["h"] > frame_h:
            t["y"] = max(0, frame_h - t["h"])


def _make_vertical_tag(text: str, font: ImageFont.FreeTypeFont, rgb: tuple, pad: int = 6) -> Image.Image:
    """세로로 배치된 라벨 태그 이미지를 생성(가로로 그린 뒤 90° 회전).
    배경=주황 라운드 사각형, 글자=흰색.  '종이 박스 0.95' 형태."""
    tw, th = _text_size(font, text)
    horiz = Image.new("RGBA", (tw + pad * 2, th + pad * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(horiz)
    d.rounded_rectangle([0, 0, horiz.width - 1, horiz.height - 1], radius=6, fill=rgb + (235,))
    d.text((pad, pad - font.getbbox(text)[1]), text, font=font, fill=(255, 255, 255, 255))
    # 반시계 90° 회전 → 아래에서 위로 읽히는 세로 태그
    return horiz.rotate(90, expand=True)


def draw_detections(frame_bgr: np.ndarray, dets: List[Detection], cfg: DetectorConfig,
                    font: ImageFont.FreeTypeFont) -> np.ndarray:
    """탐지 결과를 프레임에 그린다. 모든 그리기는 PIL(RGB)로 처리 후 BGR 복귀."""
    pil = Image.fromarray(cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)).convert("RGBA")
    overlay = Image.new("RGBA", pil.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    H = pil.height

    # 4-1) 주황색 경계 상자
    for d in dets:
        x1, y1, x2, y2 = (int(v) for v in d.xyxy)
        draw.rectangle([x1, y1, x2, y2], outline=cfg.box_rgb + (255,), width=cfg.box_thickness)
        # 모서리 강조(코너 브래킷) — 인식 UI 느낌
        c = 10
        for cx, cy, dx, dy in [(x1, y1, 1, 1), (x2, y1, -1, 1), (x1, y2, 1, -1), (x2, y2, -1, -1)]:
            draw.line([cx, cy, cx + dx * c, cy], fill=cfg.box_rgb + (255,), width=cfg.box_thickness + 1)
            draw.line([cx, cy, cx, cy + dy * c], fill=cfg.box_rgb + (255,), width=cfg.box_thickness + 1)

    # 4-2) 세로 라벨 태그 — 박스 오른쪽에 배치, 겹치면 아래로 밀기
    tags = []
    for d in dets:
        x1, y1, x2, y2 = (int(v) for v in d.xyxy)
        text = f"{d.label_ko} {d.conf:.2f}"        # 예: "종이 박스 0.95"
        tag_img = _make_vertical_tag(text, font, cfg.box_rgb)
        tags.append({"x": x2 + 4, "y": y1, "w": tag_img.width, "h": tag_img.height, "img": tag_img})

    _resolve_overlaps(tags, H)                      # 라벨 겹침 방지
    for t in tags:
        # 오른쪽으로 벗어나면 박스 왼쪽에 배치
        if t["x"] + t["w"] > pil.width:
            t["x"] = max(0, t["x"] - t["w"] - 8)
        overlay.paste(t["img"], (int(t["x"]), int(t["y"])), t["img"])

    out = Image.alpha_composite(pil, overlay).convert("RGB")
    return cv2.cvtColor(np.array(out), cv2.COLOR_RGB2BGR)


# ──────────────────────────────────────────────────────────────────────────────
# 5) 실시간 실행 루프  (이미지 / 동영상 / 웹캠·스트림 공용)
# ──────────────────────────────────────────────────────────────────────────────
def run_stream(source: str, cfg: DetectorConfig, show: bool = True, save: Optional[str] = None) -> None:
    detector = DebrisDetector(cfg)
    font = _load_font(cfg)

    # 정지 이미지 처리
    if Path(str(source)).suffix.lower() in (".jpg", ".jpeg", ".png", ".bmp"):
        frame = cv2.imread(str(source))
        vis = draw_detections(frame, detector.run(frame), cfg, font)
        if save:
            cv2.imwrite(save, vis)
        if show:
            cv2.imshow("ARK-C Underwater Detection", vis)
            cv2.waitKey(0)
            cv2.destroyAllWindows()
        return

    # 동영상 / 스트림
    cap = cv2.VideoCapture(int(source) if str(source).isdigit() else source)
    if not cap.isOpened():
        raise RuntimeError(f"소스를 열 수 없습니다: {source}")

    writer = None
    if save:
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        writer = cv2.VideoWriter(save, cv2.VideoWriter_fourcc(*"mp4v"), fps, (w, h))

    ema_fps = 0.0
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            t0 = time.time()
            vis = draw_detections(frame, detector.run(frame), cfg, font)
            # 프레임 처리 FPS(지수이동평균) 오버레이 — 실시간 성능 모니터
            fps = 1.0 / max(1e-6, time.time() - t0)
            ema_fps = fps if ema_fps == 0 else 0.9 * ema_fps + 0.1 * fps
            cv2.putText(vis, f"{ema_fps:4.1f} FPS", (12, 28),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 140, 0), 2)

            if writer:
                writer.write(vis)
            if show:
                cv2.imshow("ARK-C Underwater Detection", vis)
                if cv2.waitKey(1) & 0xFF in (27, ord("q")):  # ESC/q 종료
                    break
    finally:
        cap.release()
        if writer:
            writer.release()
        cv2.destroyAllWindows()


# ──────────────────────────────────────────────────────────────────────────────
# 6) (선택) 모델 학습 — 페트병 → 종이 박스·나뭇가지 확장 학습
#    data.yaml 예시:
#      path: ./datasets/underwater
#      train: images/train
#      val: images/val
#      names: {0: pet_bottle, 1: cardboard_box, 2: tree_branch}
#    라벨은 YOLO 포맷(정규화 xywh). 기존 페트병 데이터에 신규 2클래스 라벨을
#    추가하고, 사전학습 yolov8n.pt에서 전이학습(파인튜닝)하면 빠르게 확장된다.
# ──────────────────────────────────────────────────────────────────────────────
def train(data_yaml: str, base: str = "yolov8n.pt", epochs: int = 100, imgsz: int = 640) -> str:
    from ultralytics import YOLO

    model = YOLO(base)  # 사전학습 가중치에서 파인튜닝(적은 데이터로도 수렴)
    model.train(
        data=data_yaml,
        epochs=epochs,
        imgsz=imgsz,
        # 수중 저대비 대응 증강 — 밝기/대비/HSV 흔들기 강화
        hsv_v=0.5, hsv_s=0.6, degrees=8.0, mosaic=1.0, mixup=0.1,
        project="runs", name="underwater",
    )
    return "runs/underwater/weights/best.pt"


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="ARK-C 수중 쓰레기 탐지")
    p.add_argument("--source", default="0", help="0(웹캠) / 파일 경로 / RTSP URL")
    p.add_argument("--weights", default=DetectorConfig.weights)
    p.add_argument("--conf", type=float, default=DetectorConfig.conf)
    p.add_argument("--imgsz", type=int, default=DetectorConfig.imgsz)
    p.add_argument("--no-enhance", action="store_true", help="수중 전처리 끄기")
    p.add_argument("--show", action="store_true", help="창으로 표시")
    p.add_argument("--save", default=None, help="결과 저장 경로")
    return p.parse_args()


if __name__ == "__main__":
    a = _parse_args()
    cfg = DetectorConfig(
        weights=a.weights, conf=a.conf, imgsz=a.imgsz, enhance=not a.no_enhance
    )
    run_stream(a.source, cfg, show=a.show or a.save is None, save=a.save)
