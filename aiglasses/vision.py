"""Local perception adapters for a laptop webcam, video file, or still image.

The default detector is a conservative OpenCV color heuristic for saturated,
lamp-shaped red and green regions. It does not measure distance and it does
not recognize crosswalks. An optional OpenCV Zoo YOLOX model can add a small
COCO allowlist. Neither path is a certified navigation aid: scores below the
guidance threshold stay non-actionable, and this module never invents a range.
"""

from __future__ import annotations

from dataclasses import dataclass
from math import isfinite, pi
from pathlib import Path

from .guidance import Observation

MAX_IMAGE_SIDE = 4000
YOLOX_INPUT = 640
YOLOX_STRIDES = (8, 16, 32)
# SHA-256 of opencv/opencv_zoo object_detection_yolox_2022nov.onnx (35,858,002 bytes).
YOLOX_SHA256 = "c5c2d13e59ae883e6af3b45daea64af4833a4951c92d116ec270d9ddbe998063"
YOLOX_URL = (
    "https://media.githubusercontent.com/media/opencv/opencv_zoo/"
    "main/models/object_detection_yolox/object_detection_yolox_2022nov.onnx"
)

# COCO labels used by the OpenCV Zoo YOLOX sample (Apache-2.0).
COCO_LABELS = (
    "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck",
    "boat", "traffic light", "fire hydrant", "stop sign", "parking meter", "bench",
    "bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra",
    "giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee",
    "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove",
    "skateboard", "surfboard", "tennis racket", "bottle", "wine glass", "cup",
    "fork", "knife", "spoon", "bowl", "banana", "apple", "sandwich", "orange",
    "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch",
    "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse",
    "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink",
    "refrigerator", "book", "clock", "vase", "scissors", "teddy bear",
    "hair drier", "toothbrush",
)

# Monocular boxes do not carry a measured distance. Labels are only used when
# the guidance engine already includes them (the near-obstacle warning). The
# camera path leaves distance empty, so that warning cannot fire from vision.
OBSTACLE_LABELS = {
    "person": "行人",
    "bicycle": "自行车",
    "car": "汽车",
    "motorcycle": "摩托车",
    "bus": "公交车",
    "train": "火车",
    "truck": "卡车",
    "dog": "狗",
    "stop sign": "停车标志",
}
TRAFFIC_LIGHT_LABELS = {"traffic light", "traffic_light"}

LAMP_MIN_AREA = 120
LAMP_MAX_AREA_FRACTION = 0.18
LAMP_MIN_FILL = 0.78


class VisionDependencyError(RuntimeError):
    """Raised when optional vision code cannot run in this environment."""


class WeightsNotFoundError(VisionDependencyError):
    """Raised when an explicitly requested weight file is missing."""


@dataclass(frozen=True)
class Detection:
    label: str
    confidence: float
    bbox: tuple[float, float, float, float] | None = None
    light_state: str | None = None


def opencv_available() -> bool:
    try:
        import cv2  # noqa: F401
    except ImportError:
        return False
    return True


def default_weights_path() -> Path:
    packaged = Path(__file__).resolve().parent.parent / "model" / "object_detection_yolox_2022nov.onnx"
    local = Path("model") / "object_detection_yolox_2022nov.onnx"
    if local.is_file():
        return local
    return packaged


def resolve_detector(name: str, weights: Path) -> str:
    cleaned = name.strip().lower()
    if cleaned == "auto":
        return "yolox" if weights.is_file() else "heuristic"
    if cleaned not in {"heuristic", "yolox"}:
        raise ValueError("detector must be 'heuristic', 'yolox', or 'auto'")
    return cleaned


def _cv2():
    try:
        import cv2
    except ImportError as error:
        raise VisionDependencyError(
            "OpenCV is not installed. Install the vision extra: pip install -e '.[vision]'"
        ) from error
    return cv2


def _numpy():
    try:
        import numpy as np
    except ImportError as error:
        raise VisionDependencyError(
            "NumPy is not installed. Install the vision extra: pip install -e '.[vision]'"
        ) from error
    return np


def _usable_confidence(value: float) -> float:
    """Keep a real score in range. Invalid scores become 0 so they cannot command."""
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 0.0
    if not isfinite(number) or number < 0 or number > 1:
        return 0.0
    return round(number, 3)


def decode_image(frame: bytes):
    if not isinstance(frame, (bytes, bytearray)) or len(frame) == 0:
        raise ValueError("Empty frame")
    np = _numpy()
    array = np.frombuffer(bytes(frame), dtype=np.uint8)
    image = _cv2().imdecode(array, _cv2().IMREAD_COLOR)
    if image is None:
        raise ValueError("Frame is not a decodable image")
    return _validate_color_image(image)


def _validate_color_image(image):
    shape = getattr(image, "shape", None)
    if shape is None or len(shape) != 3 or shape[2] != 3:
        raise ValueError("Expected a color image")
    height, width = int(shape[0]), int(shape[1])
    if height < 1 or width < 1:
        raise ValueError("Frame is empty")
    if height > MAX_IMAGE_SIDE or width > MAX_IMAGE_SIDE:
        raise ValueError(f"Frame exceeds {MAX_IMAGE_SIDE} pixels on one side")
    if getattr(image, "dtype", None) is not None and image.dtype.itemsize != 1:
        raise ValueError("Expected an 8-bit color image")
    return image


def red_mask(hsv):
    cv2 = _cv2()
    lower = cv2.inRange(hsv, (0, 140, 100), (8, 255, 255))
    upper = cv2.inRange(hsv, (172, 140, 100), (180, 255, 255))
    return cv2.bitwise_or(lower, upper)


def green_mask(hsv):
    return _cv2().inRange(hsv, (45, 100, 80), (95, 255, 255))


def _best_lamp_blob(mask) -> tuple[float, tuple[float, float, float, float] | None]:
    cv2 = _cv2()
    contours, _hierarchy = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    frame_area = float(mask.shape[0] * mask.shape[1])
    best_score = 0.0
    best_box = None
    for contour in contours:
        area = float(cv2.contourArea(contour))
        if area < LAMP_MIN_AREA or area > frame_area * LAMP_MAX_AREA_FRACTION:
            continue
        _center, radius = cv2.minEnclosingCircle(contour)
        circle_area = pi * float(radius) * float(radius)
        if circle_area <= 0:
            continue
        fill = area / circle_area
        x, y, width, height = cv2.boundingRect(contour)
        if height <= 0 or not 0.7 <= (width / height) <= 1.45:
            continue
        box = (float(x), float(y), float(width), float(height))
        if fill >= LAMP_MIN_FILL:
            score = min(0.95, 0.72 + (fill - LAMP_MIN_FILL) * 0.8)
        else:
            score = min(0.69, fill * 0.7)
        score = round(score, 3)
        if score > best_score:
            best_score = score
            best_box = box
    return best_score, best_box


class HeuristicTrafficLightDetector:
    """Detect saturated round lamps. Ambiguous red+green becomes unknown."""

    def detect(self, image) -> list[Detection]:
        hsv = _cv2().cvtColor(image, _cv2().COLOR_BGR2HSV)
        red_score, red_box = _best_lamp_blob(red_mask(hsv))
        green_score, green_box = _best_lamp_blob(green_mask(hsv))
        if red_score >= 0.70 and green_score >= 0.70:
            return [Detection(
                "traffic light",
                round(min(red_score, green_score), 3),
                bbox=red_box,
                light_state="unknown",
            )]
        if red_score >= green_score and red_score > 0:
            return [Detection("traffic light", red_score, bbox=red_box, light_state="red")]
        if green_score > 0:
            return [Detection("traffic light", green_score, bbox=green_box, light_state="green")]
        return []


def classify_lamp_colors(bgr) -> tuple[str, float]:
    """Classify a crop as red, green, or unknown. Unknown never authorizes motion."""
    if bgr is None or getattr(bgr, "size", 0) == 0:
        return "unknown", 0.0
    hsv = _cv2().cvtColor(bgr, _cv2().COLOR_BGR2HSV)
    total = float(bgr.shape[0] * bgr.shape[1])
    red_ratio = float(_cv2().countNonZero(red_mask(hsv))) / total
    green_ratio = float(_cv2().countNonZero(green_mask(hsv))) / total
    if red_ratio >= 0.12 and red_ratio >= green_ratio * 1.7:
        return "red", round(min(0.95, 0.62 + red_ratio), 3)
    if green_ratio >= 0.12 and green_ratio >= red_ratio * 1.7:
        return "green", round(min(0.95, 0.62 + green_ratio), 3)
    return "unknown", round(min(0.69, max(red_ratio, green_ratio)), 3)


def crop_box(image, bbox: tuple[float, float, float, float]):
    height, width = image.shape[:2]
    x, y, box_w, box_h = bbox
    left = max(0, int(round(x)))
    top = max(0, int(round(y)))
    right = min(width, int(round(x + box_w)))
    bottom = min(height, int(round(y + box_h)))
    if right <= left or bottom <= top:
        return image[0:0, 0:0]
    return image[top:bottom, left:right]


def map_detections_to_observations(detections, image=None) -> list[Observation]:
    """Map detector output onto the guidance vocabulary.

    Obstacle observations omit ``distance_m``. A webcam bounding box is not a
    measurement, and the guidance engine reserves near-field urgent warnings
    for observations that actually carry a distance.
    """
    observations: list[Observation] = []
    for detection in detections:
        confidence = _usable_confidence(detection.confidence)
        if detection.label in TRAFFIC_LIGHT_LABELS:
            state = detection.light_state
            if state not in {"red", "green", "unknown"}:
                if image is not None and detection.bbox is not None:
                    state, color_confidence = classify_lamp_colors(crop_box(image, detection.bbox))
                    if state in {"red", "green"}:
                        confidence = _usable_confidence(min(float(detection.confidence), color_confidence))
                else:
                    state = "unknown"
            observations.append(Observation("traffic_light", confidence, light_state=state))
            continue
        label = OBSTACLE_LABELS.get(detection.label)
        if label is None:
            continue
        observations.append(Observation("obstacle", confidence, distance_m=None, label=label))
    return observations


def letterbox(image, target: int = YOLOX_INPUT):
    """Top-left letterbox, matching the OpenCV Zoo YOLOX demo."""
    cv2 = _cv2()
    np = _numpy()
    height, width = image.shape[:2]
    scale = min(target / height, target / width)
    if scale <= 0:
        raise ValueError("Frame is empty")
    resized_width = max(1, int(width * scale))
    resized_height = max(1, int(height * scale))
    canvas = np.full((target, target, 3), 114, dtype=np.float32)
    resized = cv2.resize(image, (resized_width, resized_height), interpolation=cv2.INTER_LINEAR)
    canvas[:resized_height, :resized_width] = resized.astype(np.float32)
    return canvas, scale


def make_yolox_grids(input_size: int = YOLOX_INPUT, strides: tuple[int, ...] = YOLOX_STRIDES):
    np = _numpy()
    grids = []
    expanded = []
    for stride in strides:
        size = input_size // stride
        xv, yv = np.meshgrid(np.arange(size), np.arange(size))
        grid = np.stack((xv, yv), 2).reshape(1, -1, 2).astype(np.float32)
        grids.append(grid)
        expanded.append(np.full((1, grid.shape[1], 1), stride, dtype=np.float32))
    return np.concatenate(grids, 1), np.concatenate(expanded, 1)


def _iou_one_to_many(box, boxes):
    np = _numpy()
    ax1, ay1 = box[0], box[1]
    ax2, ay2 = box[0] + max(box[2], 0), box[1] + max(box[3], 0)
    bx1 = boxes[:, 0]
    by1 = boxes[:, 1]
    bx2 = boxes[:, 0] + np.maximum(boxes[:, 2], 0)
    by2 = boxes[:, 1] + np.maximum(boxes[:, 3], 0)
    inter_w = np.maximum(0, np.minimum(ax2, bx2) - np.maximum(ax1, bx1))
    inter_h = np.maximum(0, np.minimum(ay2, by2) - np.maximum(ay1, by1))
    inter = inter_w * inter_h
    area_a = max(box[2], 0) * max(box[3], 0)
    area_b = np.maximum(boxes[:, 2], 0) * np.maximum(boxes[:, 3], 0)
    union = area_a + area_b - inter
    return np.where(union > 0, inter / union, 0.0)


def nms_xywh(boxes, scores, class_ids, score_threshold: float, iou_threshold: float):
    np = _numpy()
    candidates = np.flatnonzero(scores >= score_threshold)
    if candidates.size == 0:
        return np.empty(0, dtype=int)
    if candidates.size > 300:
        subset = scores[candidates]
        top = np.argpartition(subset, -300)[-300:]
        candidates = candidates[top]
    order = candidates[np.argsort(scores[candidates])[::-1]]
    keep: list[int] = []
    while order.size:
        current = int(order[0])
        keep.append(current)
        if order.size == 1:
            break
        rest = order[1:]
        same_class = class_ids[rest] == class_ids[current]
        overlap = _iou_one_to_many(boxes[current], boxes[rest]) >= iou_threshold
        order = rest[~(same_class & overlap)]
    return np.array(keep, dtype=int)


def decode_yolox(
    output,
    *,
    input_size: int = YOLOX_INPUT,
    conf_threshold: float = 0.25,
    iou_threshold: float = 0.45,
) -> list[tuple[float, float, float, float, float, int]]:
    """Decode an OpenCV Zoo YOLOX output tensor into xywh boxes on the 640 canvas.

    The exported graph is expected to already apply its activations. Scores
    outside 0..1 are ignored by the observation mapper rather than saturated
    upward. Returns tuples of ``(x, y, w, h, score, class_id)``.
    """
    np = _numpy()
    dets = np.array(output, dtype=np.float32)
    if dets.ndim == 3:
        dets = dets[0]
    if dets.ndim != 2 or dets.shape[1] != 5 + len(COCO_LABELS):
        raise ValueError("Unexpected YOLOX output shape")
    grids, strides = make_yolox_grids(input_size)
    if grids.shape[1] != dets.shape[0]:
        raise ValueError("YOLOX output does not match the 640-pixel anchor grid")
    decoded = dets.copy()
    decoded[:, :2] = (decoded[:, :2] + grids[0]) * strides[0]
    decoded[:, 2:4] = np.exp(np.clip(decoded[:, 2:4], -6, 8)) * strides[0]
    xywh = np.empty_like(decoded[:, :4])
    xywh[:, 0] = decoded[:, 0] - decoded[:, 2] / 2
    xywh[:, 1] = decoded[:, 1] - decoded[:, 3] / 2
    xywh[:, 2] = decoded[:, 2]
    xywh[:, 3] = decoded[:, 3]
    class_scores = dets[:, 4:5] * dets[:, 5:]
    class_ids = np.argmax(class_scores, axis=1).astype(int)
    max_scores = class_scores.max(axis=1)
    finite = np.isfinite(xywh).all(axis=1) & np.isfinite(max_scores)
    max_scores = np.where(finite, max_scores, 0)
    keep = nms_xywh(xywh, max_scores, class_ids, conf_threshold, iou_threshold)
    found = []
    for index in keep:
        x, y, width, height = (float(value) for value in xywh[index])
        found.append((x, y, width, height, float(max_scores[index]), int(class_ids[index])))
    return found


class YoloXDetector:
    """Optional COCO detector. Weights stay out of the repository and out of CI."""

    def __init__(self, weights: Path, conf_threshold: float = 0.25, iou_threshold: float = 0.45) -> None:
        self.weights = Path(weights)
        self.conf_threshold = conf_threshold
        self.iou_threshold = iou_threshold
        self._network = None

    def detect(self, image) -> list[Detection]:
        if not self.weights.is_file():
            raise WeightsNotFoundError(
                f"YOLOX weights were not found at {self.weights}. "
                "The heuristic detector does not need them. To download the optional "
                "Apache-2.0 model: python scripts/download_vision_weights.py --accept-license"
            )
        cv2 = _cv2()
        np = _numpy()
        if self._network is None:
            try:
                network = cv2.dnn.readNetFromONNX(str(self.weights))
            except cv2.error as error:
                raise VisionDependencyError(f"Could not read YOLOX weights at {self.weights}") from error
            network.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
            network.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
            self._network = network
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        canvas, scale = letterbox(rgb)
        blob = np.transpose(canvas, (2, 0, 1))[np.newaxis, :, :, :]
        self._network.setInput(blob)
        raw = self._network.forward()
        height, width = image.shape[:2]
        detections: list[Detection] = []
        for x, y, box_w, box_h, score, class_id in decode_yolox(
            raw, conf_threshold=self.conf_threshold, iou_threshold=self.iou_threshold,
        ):
            if class_id < 0 or class_id >= len(COCO_LABELS):
                continue
            frame_box = (
                max(0.0, x / scale),
                max(0.0, y / scale),
                max(1.0, box_w / scale),
                max(1.0, box_h / scale),
            )
            frame_box = (
                min(frame_box[0], width - 1),
                min(frame_box[1], height - 1),
                frame_box[2],
                frame_box[3],
            )
            detections.append(Detection(COCO_LABELS[class_id], score, bbox=frame_box))
        return detections


class LocalVisionAdapter:
    """VisionAdapter that accepts encoded image bytes or a decoded BGR frame."""

    def __init__(self, detector: str = "heuristic", weights: str | Path | None = None) -> None:
        path = Path(weights) if weights else default_weights_path()
        self.weights = path
        self.detector_name = resolve_detector(detector, path)
        if self.detector_name == "heuristic":
            self._detector = HeuristicTrafficLightDetector()
        else:
            self._detector = YoloXDetector(path)

    def analyze(self, frame: bytes) -> list[Observation]:
        return self.analyze_image(decode_image(frame))

    def analyze_image(self, image) -> list[Observation]:
        validated = _validate_color_image(image)
        return map_detections_to_observations(self._detector.detect(validated), image=validated)


_ADAPTERS: dict[tuple[str, str], LocalVisionAdapter] = {}


def build_adapter(detector: str = "heuristic", weights: str | Path | None = None) -> LocalVisionAdapter:
    path = Path(weights) if weights else default_weights_path()
    resolved = resolve_detector(detector, path)
    key = (resolved, str(path))
    adapter = _ADAPTERS.get(key)
    if adapter is None:
        adapter = LocalVisionAdapter(resolved, path)
        _ADAPTERS[key] = adapter
    return adapter


def clear_adapter_cache() -> None:
    _ADAPTERS.clear()


def draw_lamp(color_bgr: tuple[int, int, int], radius: int = 36, center: tuple[int, int] | None = None):
    cv2 = _cv2()
    np = _numpy()
    image = np.zeros((240, 320, 3), dtype=np.uint8)
    point = center or (image.shape[1] // 2, image.shape[0] // 2)
    cv2.circle(image, point, radius, color_bgr, thickness=-1)
    return image


def synthetic_demo_frames() -> list:
    """Built-in frames for the no-camera path: clear red, clear green, then non-commands."""
    red = draw_lamp((0, 0, 220), radius=36)
    green = draw_lamp((0, 200, 0), radius=36)
    yellow = draw_lamp((0, 220, 220), radius=36)
    speck = draw_lamp((0, 0, 220), radius=2)
    return [red, green, yellow, speck]


def conflicting_lamps():
    cv2 = _cv2()
    np = _numpy()
    image = np.zeros((240, 320, 3), dtype=np.uint8)
    cv2.circle(image, (90, 120), 36, (0, 0, 220), thickness=-1)
    cv2.circle(image, (230, 120), 36, (0, 200, 0), thickness=-1)
    return image


def red_square():
    np = _numpy()
    image = np.zeros((240, 320, 3), dtype=np.uint8)
    image[80:160, 120:200] = (0, 0, 220)
    return image
