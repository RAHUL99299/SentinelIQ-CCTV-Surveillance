import os
import time
os.environ["TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD"] = "1"

import cv2
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from ultralytics import YOLO
from statistics import median
import numpy as np
import subprocess
import re
import json
from urllib.parse import urlparse, parse_qs
from imageio_ffmpeg import get_ffmpeg_exe

try:
    import requests  # used for EarthCam HTML parsing
except Exception:  # pragma: no cover
    requests = None

app = Flask(__name__)
CORS(app)

model = YOLO("yolov8s.pt") 

import threading
model_lock = threading.Lock()

# Global variables
current_counts = {}  # keyed by resolved stream URL (supports multi-camera)
camera = None
camera_source = None

def _resolve_source(source):
    """
    Resolve a flexible source string into something OpenCV can open.
    - "auto" → env AI_CAMERA_URL or webcam 0
    - int-like strings → webcam index
    - everything else → treat as URL (rtsp/http/file)
    """
    if source is None or source == "" or source == "auto":
        env_src = os.environ.get("AI_CAMERA_URL")
        if env_src:
            return env_src
        return 0
    # try converting to integer index
    try:
        return int(source)
    except (TypeError, ValueError):
        return source

earthcam_resolve_cache = {}

def _resolve_earthcam_stream_from_page(page_url: str):
    """
    EarthCam serves the live video via HLS. The HTML includes a JS object (json_base)
    holding the HLS domain + path. We extract HLS parameters and cache the resolved HLS URL.
    """
    global earthcam_resolve_cache
    now = time.time()
    if page_url in earthcam_resolve_cache:
        hls_url, expires_at = earthcam_resolve_cache[page_url]
        if expires_at > now:
            return hls_url
        else:
            del earthcam_resolve_cache[page_url]

    if requests is None:
        return None

    if not isinstance(page_url, str) or "earthcam.com" not in page_url:
        return None

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }

    try:
        resp = requests.get(page_url, headers=headers, timeout=15)
    except Exception:
        return None
    if resp.status_code != 200:
        return None

    html = resp.text
    m = re.search(r"var\s+json_base\s*=\s*(?P<json>\{.*?\})\s*;", html, flags=re.DOTALL)
    if not m:
        return None

    try:
        parsed = json.loads(m.group("json"))
    except Exception:
        return None

    cam_name = parse_qs(urlparse(page_url).query).get("cam", [None])[0]
    cam_map = parsed.get("cam") if isinstance(parsed, dict) else None
    if not isinstance(cam_map, dict):
        return None

    cam_data = cam_map.get(cam_name) if cam_name else None
    if not cam_data and cam_map:
        cam_data = next(iter(cam_map.values()))

    if not isinstance(cam_data, dict):
        return None

    hls_domain = cam_data.get("html5_streamingdomain")
    hls_path = cam_data.get("html5_streampath")
    if not hls_domain or not hls_path:
        return None

    base = str(hls_domain)
    if not base.startswith("http://") and not base.startswith("https://"):
        base = "https://" + base
    base = base.rstrip("/")
    path = str(hls_path).lstrip("/")
    hls_url = f"{base}/{path}"
    
    # Cache for 120 seconds
    earthcam_resolve_cache[page_url] = (hls_url, now + 120)
    return hls_url

def _resolve_detection_source(source):
    requested = source
    resolved = _resolve_source(source)
    if isinstance(resolved, str) and "earthcam.com" in resolved:
        hls = _resolve_earthcam_stream_from_page(resolved)
        if hls:
            return hls
    return resolved

def _resolve_detection_source_debug(source):
    requested = source
    resolved = _resolve_source(source)
    debug = {
        "requested_source": requested,
        "resolved_source_initial": resolved,
        "earthcam_page_detected": isinstance(resolved, str) and "earthcam.com" in resolved,
        "earthcam_hls_resolved": False,
        "earthcam_hls_url": None,
    }
    if debug["earthcam_page_detected"]:
        hls = _resolve_earthcam_stream_from_page(resolved)
        if hls:
            debug["earthcam_hls_resolved"] = True
            debug["earthcam_hls_url"] = hls
            resolved = hls
    debug["final_resolved_source"] = resolved
    return debug

def get_camera(source=0):
    global camera, camera_source
    resolved = _resolve_detection_source(source)
    if camera is None or camera_source != resolved:
        if camera is not None:
            camera.release()
        camera = cv2.VideoCapture(resolved)
        camera_source = resolved
    return camera

def _annotate_live_frame(frame, source_label="LIVE", source_id=None):
    """YOLO on one frame; draw boxes + return JPEG bytes with professional CCTV HUD overlay."""
    global current_counts
    frame = cv2.resize(frame, (640, 480))
    with model_lock:
        results = model(frame, conf=0.15, verbose=False)
    detections = results[0]
    
    person_count = 0
    vehicle_count = 0
    vehicle_classes = [1, 2, 3, 5, 7] # bicycle, car, motorcycle, bus, truck
    
    for box in detections.boxes:
        cls_id = int(box.cls[0])
        confidence = float(box.conf[0])
        
        # Person Detection (Green Box)
        if cls_id == 0 and confidence > 0.15:
            person_count += 1
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            
        # Vehicle Detection (Red Box)
        elif cls_id in vehicle_classes and confidence > 0.15:
            vehicle_count += 1
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
            
    if source_id is not None:
        current_counts[source_id] = {
            "people": person_count,
            "vehicles": vehicle_count
        }
    else:
        current_counts["__default__"] = {
            "people": person_count,
            "vehicles": vehicle_count
        }
        
    h, w = frame.shape[:2]
    
    # 1. Draw CCTV HUD Corner Brackets
    l = 25  # Bracket line length
    color = (235, 235, 235)  # Off-white color
    # Top-Left
    cv2.line(frame, (20, 20), (20 + l, 20), color, 2)
    cv2.line(frame, (20, 20), (20, 20 + l), color, 2)
    # Top-Right
    cv2.line(frame, (w - 20, 20), (w - 20 - l, 20), color, 2)
    cv2.line(frame, (w - 20, 20), (w - 20, 20 + l), color, 2)
    # Bottom-Left
    cv2.line(frame, (20, h - 20), (20 + l, h - 20), color, 2)
    cv2.line(frame, (20, h - 20), (20, h - 20 - l), color, 2)
    # Bottom-Right
    cv2.line(frame, (w - 20, h - 20), (w - 20 - l, h - 20), color, 2)
    cv2.line(frame, (w - 20, h - 20), (w - 20, h - 20 - l), color, 2)

    # 2. Draw Camera Label Pill (Top Right)
    cam_label = source_label.upper()
    text_size_cam = cv2.getTextSize(cam_label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)[0]
    tx_cam = w - 40 - text_size_cam[0]
    ty_cam = 40
    cv2.rectangle(frame, (tx_cam - 8, ty_cam - 14), (tx_cam + text_size_cam[0] + 8, ty_cam + 6), (40, 40, 40), -1)
    cv2.putText(frame, cam_label, (tx_cam, ty_cam), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (235, 235, 235), 1, cv2.LINE_AA)

    # 3. Draw People & Vehicle Counter Pill (Top Left)
    count_label = f"PEOPLE: {person_count} | VEHS: {vehicle_count}"
    text_size_cnt = cv2.getTextSize(count_label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)[0]
    tx_cnt = 40
    ty_cnt = 40
    cv2.rectangle(frame, (tx_cnt - 8, ty_cnt - 14), (tx_cnt + text_size_cnt[0] + 8, ty_cnt + 6), (40, 40, 40), -1)
    cv2.putText(frame, count_label, (tx_cnt, ty_cnt), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (235, 235, 235), 1, cv2.LINE_AA)

    # 4. Draw Rolling Timecode Pill (Bottom Center)
    t_str = time.strftime("%H:%M:%S")
    ms = int((time.time() % 1) * 100)
    timecode_str = f"{t_str}:{ms:02d}"
    text_size_tc = cv2.getTextSize(timecode_str, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)[0]
    tx_tc = (w // 2) - (text_size_tc[0] // 2)
    ty_tc = h - 40
    cv2.rectangle(frame, (tx_tc - 8, ty_tc - 14), (tx_tc + text_size_tc[0] + 8, ty_tc + 6), (40, 40, 40), -1)
    cv2.putText(frame, timecode_str, (tx_tc, ty_tc), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (235, 235, 235), 1, cv2.LINE_AA)

    # 5. Apply CCTV Horizontal Scanlines
    frame[::3, :, :] = (frame[::3, :, :] * 0.88).astype(np.uint8)

    ret, buffer = cv2.imencode(".jpg", frame)
    return buffer.tobytes()


def _frame_to_jpeg(frame, quality=72):
    """Resize and encode one frame (no YOLO) for lightweight grid previews."""
    frame = cv2.resize(frame, (640, 480))
    ret, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, quality])
    return buffer.tobytes() if ret else None


def _earthcam_ffmpeg_headers(source):
    if isinstance(source, str) and "earthcam.com" in source:
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Referer": source,
            "Origin": "https://www.earthcam.com",
        }
    return None


def generate_frames_lite(source=0):
    """MJPEG relay without YOLO — one stream per grid tile, much lighter than /video_feed."""
    resolved = _resolve_detection_source(source)
    ffmpeg_headers = _earthcam_ffmpeg_headers(source)
    is_network = isinstance(resolved, str) and (
        resolved.startswith("http://") or 
        resolved.startswith("https://") or 
        resolved.startswith("rtsp://") or 
        ".m3u8" in resolved
    )
    while True:
        if not is_network:
            cap = cv2.VideoCapture(resolved)
            if cap.isOpened():
                stream_fps = cap.get(cv2.CAP_PROP_FPS)
                if not stream_fps or stream_fps <= 0 or stream_fps > 120:
                    stream_fps = 25.0
                
                fail_streak = 0
                t_last = time.time()
                while fail_streak < 20:
                    success, frame = cap.read()
                    if not success:
                        fail_streak += 1
                        time.sleep(0.05)
                        continue
                    fail_streak = 0
                    frame_bytes = _frame_to_jpeg(frame)
                    if frame_bytes:
                        yield (
                            b"--frame\r\n"
                            b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
                        )
                    
                    # Pacing
                    elapsed = time.time() - t_last
                    sleep_time = (1.0 / stream_fps) - elapsed
                    if sleep_time > 0:
                        time.sleep(sleep_time)
                    t_last = time.time()
                cap.release()
            else:
                try:
                    cap.release()
                except Exception:
                    pass

        try:
            t_last = time.time()
            for _frame_idx, frame in iter_frames_ffmpeg(
                resolved,
                width=640,
                height=480,
                fps=6,
                max_frames=200000,
                ffmpeg_headers=ffmpeg_headers,
            ):
                frame_bytes = _frame_to_jpeg(frame)
                if frame_bytes:
                    yield (
                        b"--frame\r\n"
                        b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
                    )
                
                # Pacing
                elapsed = time.time() - t_last
                sleep_time = (1.0 / 6.0) - elapsed
                if sleep_time > 0:
                    time.sleep(sleep_time)
                t_last = time.time()
        except Exception:
            pass

        time.sleep(0.8)

def generate_frames(source=0):
    """Per-request live MJPEG generator (no global capture — supports multiple viewers)."""
    resolved = _resolve_detection_source(source)
    source_id = str(resolved)  # unique key per camera stream
    label = "LIVE CCTV"
    if isinstance(source, str) and "earthcam.com" in source:
        label = "EarthCam LIVE"

    ffmpeg_headers = _earthcam_ffmpeg_headers(source)

    is_network = isinstance(resolved, str) and (
        resolved.startswith("http://") or 
        resolved.startswith("https://") or 
        resolved.startswith("rtsp://") or 
        ".m3u8" in resolved
    )
    while True:
        if not is_network:
            cap = cv2.VideoCapture(resolved)
            opened = cap.isOpened()
            if opened:
                stream_fps = cap.get(cv2.CAP_PROP_FPS)
                if not stream_fps or stream_fps <= 0 or stream_fps > 120:
                    stream_fps = 25.0
                
                fail_streak = 0
                t_last = time.time()
                while fail_streak < 30:
                    success, frame = cap.read()
                    if not success:
                        fail_streak += 1
                        time.sleep(0.05)
                        continue
                    fail_streak = 0
                    frame_bytes = _annotate_live_frame(frame, label, source_id=source_id)
                    yield (
                        b"--frame\r\n"
                        b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
                    )
                    
                    # Pacing
                    elapsed = time.time() - t_last
                    sleep_time = (1.0 / stream_fps) - elapsed
                    if sleep_time > 0:
                        time.sleep(sleep_time)
                    t_last = time.time()
                cap.release()
            else:
                try:
                    cap.release()
                except Exception:
                    pass

        # HLS / EarthCam fallback via ffmpeg (live segments)
        try:
            t_last = time.time()
            for _frame_idx, frame in iter_frames_ffmpeg(
                resolved,
                width=640,
                height=480,
                fps=8,
                max_frames=200000,
                ffmpeg_headers=ffmpeg_headers,
            ):
                frame_bytes = _annotate_live_frame(frame, label, source_id=source_id)
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
                )
                
                # Pacing
                elapsed = time.time() - t_last
                sleep_time = (1.0 / 8.0) - elapsed
                if sleep_time > 0:
                    time.sleep(sleep_time)
                t_last = time.time()
        except Exception:
            pass

        time.sleep(1.0)

@app.route('/video_feed')
def video_feed():
    """
    Video streaming route. 
    Put this in the src attribute of an img tag: <img src="http://localhost:5000/video_feed" />
    """
    source = request.args.get('source', 'auto')
    return Response(generate_frames(source), mimetype='multipart/x-mixed-replace; boundary=frame')


@app.route('/video_feed_lite')
def video_feed_lite():
    """Lightweight MJPEG (no YOLO) for multi-camera grids."""
    source = request.args.get('source', 'auto')
    return Response(generate_frames_lite(source), mimetype='multipart/x-mixed-replace; boundary=frame')


@app.route('/api/live_preview')
def live_preview():
    """Single JPEG frame — fallback when MJPEG cannot start."""
    source = request.args.get('source') or request.args.get('url', 'auto')
    resolved = _resolve_detection_source(source)
    ffmpeg_headers = _earthcam_ffmpeg_headers(source)
    frame = None

    cap = cv2.VideoCapture(resolved)
    if cap.isOpened():
        ok, frame = cap.read()
        cap.release()
        if not ok:
            frame = None

    if frame is None:
        try:
            gen = iter_frames_ffmpeg(
                resolved,
                width=640,
                height=480,
                fps=5,
                max_frames=1,
                ffmpeg_headers=ffmpeg_headers,
            )
            _, frame = next(gen)
        except StopIteration:
            return jsonify({"status": "error", "message": "Could not read a frame"}), 503

    frame_bytes = _frame_to_jpeg(frame)
    if not frame_bytes:
        return jsonify({"status": "error", "message": "Encode failed"}), 503
    return Response(frame_bytes, mimetype='image/jpeg')

@app.route('/api/health')
def health():
    return jsonify({
        "status": "ok",
        "features": ["video_feed", "video_feed_lite", "live_preview", "resolve_source"],
    })


@app.route('/api/stats')
def get_stats():
    """
    Returns the current crowd and vehicle counts as JSON.
    Pass ?source=<camera_url> to get the counts for a specific stream.
    Without source, returns the sum of all known streams.
    """
    global current_counts
    source = request.args.get('source')
    if source:
        # Resolve the source the same way generate_frames does
        resolved = str(_resolve_detection_source(source))
        data = current_counts.get(resolved, current_counts.get(source, {"people": 0, "vehicles": 0}))
        if isinstance(data, int):
            data = {"people": data, "vehicles": 0}
        people_count = data.get("people", 0)
        vehicle_count = data.get("vehicles", 0)
    else:
        people_count = 0
        vehicle_count = 0
        for val in current_counts.values():
            if isinstance(val, dict):
                people_count += val.get("people", 0)
                vehicle_count += val.get("vehicles", 0)
            elif isinstance(val, int):
                people_count += val
    return jsonify({
        "status": "success",
        "crowd_count": people_count,
        "vehicle_count": vehicle_count,
        "all_counts": current_counts,
    })

# In-memory cache: key -> { data, expires_at }
video_detection_cache = {}
CACHE_TTL_COUNTS = 30   # seconds — dashboard / counts-only
CACHE_TTL_COUNTS_LIVE = 8  # EarthCam HLS — fresher counts
CACHE_TTL_FULL = 120    # seconds — bounding-box overlays


def _cache_get(key):
    entry = video_detection_cache.get(key)
    if not entry:
        return None
    if entry["expires_at"] < time.time():
        del video_detection_cache[key]
        return None
    return entry["data"]


def _cache_set(key, data, ttl):
    video_detection_cache[key] = {"data": data, "expires_at": time.time() + ttl}

def robust_count_from_samples(samples):
    if not samples:
        return 0
    ordered = sorted(samples)
    if len(ordered) >= 5:
        trim = max(1, int(len(ordered) * 0.15))
        core = ordered[trim:len(ordered) - trim]
        if core:
            return round(sum(core) / len(core))
    return round(median(ordered))

def iter_frames_ffmpeg(
    source: str,
    width: int = 640,
    height: int = 480,
    fps: int = 10,
    max_frames: int = 180,
    ffmpeg_headers: dict | None = None,
):
    """
    Read frames from HLS/MP4/etc using ffmpeg (via imageio_ffmpeg).
    This is more reliable than cv2.VideoCapture for HLS streams.
    """
    ffmpeg_exe = get_ffmpeg_exe()
    frame_size = width * height * 3  # bgr24
    cmd = [
        ffmpeg_exe,
        "-hide_banner",
        "-loglevel", "error",
        "-i", str(source),
        "-vf", f"scale={width}:{height},fps={fps}",
        "-f", "rawvideo",
        "-pix_fmt", "bgr24",
        "-",
    ]

    if ffmpeg_headers:
        # ffmpeg expects CRLF separated headers.
        header_lines = [f"{k}: {v}" for k, v in ffmpeg_headers.items()]
        headers_str = "\r\n".join(header_lines)
        cmd = [cmd[0], "-headers", headers_str, *cmd[1:]]

    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, bufsize=10**8)
    try:
        for frame_idx in range(max_frames):
            raw = proc.stdout.read(frame_size)
            if not raw or len(raw) != frame_size:
                break
            frame = np.frombuffer(raw, dtype=np.uint8).reshape((height, width, 3))
            yield frame_idx, frame
    finally:
        try:
            proc.kill()
        except Exception:
            pass

def _process_frame_detections(frame, store_boxes=True):
    """Run YOLO on one frame; return counts and optional normalized boxes."""
    frame_resized = frame if frame.shape[0] == 480 and frame.shape[1] == 640 else cv2.resize(frame, (640, 480))
    with model_lock:
        results = model(frame_resized, conf=0.15, verbose=False)
    detections = results[0]
    boxes = []
    people_in_frame = 0
    vehicles_in_frame = 0
    for box in detections.boxes:
        cls_id = int(box.cls[0])
        confidence = float(box.conf[0])
        is_person = (cls_id == 0)
        is_vehicle = (cls_id in [1, 2, 3, 5, 7])
        if (is_person or is_vehicle) and confidence > 0.15:
            if is_person:
                people_in_frame += 1
            elif is_vehicle:
                vehicles_in_frame += 1
            if store_boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                label = "Person" if is_person else "Vehicle"
                boxes.append({
                    "x": x1 / 640.0,
                    "y": y1 / 480.0,
                    "w": (x2 - x1) / 640.0,
                    "h": (y2 - y1) / 480.0,
                    "label": label,
                    "conf": int(confidence * 100),
                })
    return people_in_frame, vehicles_in_frame, boxes


def _run_detection_samples(url, resolved, counts_only=False, step=3, max_frames=180):
    """Sample frames and return people/vehicle counts; optionally full box data."""
    # Force FFmpeg for network streams (HLS, RTSP, HTTP) as OpenCV is highly unstable/limited for HLS on Windows
    use_ffmpeg = True
    is_network = isinstance(resolved, str) and (
        resolved.startswith("http://") or 
        resolved.startswith("https://") or 
        resolved.startswith("rtsp://") or 
        ".m3u8" in resolved
    )
    
    if not is_network:
        cap = cv2.VideoCapture(resolved)
        if cap.isOpened():
            try:
                ret, _ = cap.read()
                if ret:
                    use_ffmpeg = False
            except Exception:
                pass
            try:
                cap.release()
            except Exception:
                pass

    ffmpeg_headers = None
    if isinstance(url, str) and "earthcam.com" in url:
        ffmpeg_headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Referer": url,
            "Origin": "https://www.earthcam.com",
        }

    frames_data = []
    people_samples = []
    vehicle_samples = []
    sampled_frames = []
    store_boxes = not counts_only

    if counts_only:
        max_frames = max(1, min(max_frames, 600))
    else:
        max_frames = max(30, min(max_frames, 600))

    if use_ffmpeg:
        frame_iter = iter_frames_ffmpeg(
            resolved,
            width=640,
            height=480,
            fps=10,
            max_frames=max_frames,
            ffmpeg_headers=ffmpeg_headers,
        )
        # Consume all frames immediately to avoid blocking the ffmpeg stdout pipe during inference
        frames_list = list(frame_iter)
        for frame_idx, frame in frames_list:
            if counts_only and frame_idx < 10:
                continue
            if frame_idx % step != 0:
                continue
            people_in_frame, vehicles_in_frame, boxes = _process_frame_detections(frame, store_boxes)
            if store_boxes:
                frames_data.append(boxes)
                sampled_frames.append({
                    "boxes": boxes,
                    "people": people_in_frame,
                    "vehicles": vehicles_in_frame,
                })
            people_samples.append(people_in_frame)
            vehicle_samples.append(vehicles_in_frame)
    else:
        cap = cv2.VideoCapture(resolved)
        frame_idx = 0
        while frame_idx < max_frames:
            ret, frame = cap.read()
            if not ret:
                break
            if counts_only and frame_idx < 10:
                frame_idx += 1
                continue
            if frame_idx % step == 0:
                people_in_frame, vehicles_in_frame, boxes = _process_frame_detections(frame, store_boxes)
                if store_boxes:
                    frames_data.append(boxes)
                    sampled_frames.append({
                        "boxes": boxes,
                        "people": people_in_frame,
                        "vehicles": vehicles_in_frame,
                    })
                people_samples.append(people_in_frame)
                vehicle_samples.append(vehicles_in_frame)
            frame_idx += 1
        cap.release()

    if store_boxes and not frames_data:
        frames_data = [[]]

    people_count = robust_count_from_samples(people_samples)
    vehicle_count = robust_count_from_samples(vehicle_samples)

    representative = []
    if sampled_frames:
        representative = min(
            sampled_frames,
            key=lambda f: abs(f["people"] - people_count),
        )["boxes"]

    result = {
        "status": "success",
        "people_count": people_count,
        "vehicle_count": vehicle_count,
        "samples": len(people_samples),
    }
    if store_boxes:
        result["frames"] = frames_data
        result["representative_frame"] = representative
    return result


@app.route('/api/detect')
def detect_objects_from_url():
    url = request.args.get('url') or request.args.get('source')
    if not url:
        return jsonify({"status": "error", "message": "No URL/source provided"}), 400

    mode = (request.args.get('mode') or 'full').lower()
    counts_only = mode == 'counts'
    cache_key = f"{url}::{'counts' if counts_only else 'full'}"

    cached = _cache_get(cache_key)
    if cached:
        return jsonify(cached)

    try:
        resolved = _resolve_detection_source(url)
        is_live = isinstance(url, str) and "earthcam.com" in url
        if counts_only:
            step, max_frames = (2, 25)
        else:
            step = int(request.args.get('step', 3))
            max_frames = int(request.args.get('max_frames', 120 if is_live else 180))

        response_data = _run_detection_samples(
            url, resolved, counts_only=counts_only, step=step, max_frames=max_frames,
        )
        if counts_only and is_live:
            ttl = CACHE_TTL_COUNTS_LIVE
        elif counts_only:
            ttl = CACHE_TTL_COUNTS
        else:
            ttl = CACHE_TTL_FULL
        _cache_set(cache_key, response_data, ttl)
        return jsonify(response_data)

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/stream_health')
def stream_health():
    """
    Quick check to see if a given stream/source is usable.
    Example:
      /api/stream_health?source=rtsp://...
      /api/stream_health?source=https://...mp4
      /api/stream_health?source=0
    """
    src = request.args.get('source', 'auto')
    resolved = _resolve_detection_source(src)
    try:
        cap = cv2.VideoCapture(resolved)
        if cap.isOpened():
            ok, _ = cap.read()
            cap.release()
            if not ok:
                return jsonify({"status": "error", "message": "Opened but no frames readable"}), 400
            return jsonify({"status": "success", "source": str(resolved)})

        # Fallback: try ffmpeg frame read for HLS streams.
        try:
            ffmpeg_headers = None
            if isinstance(src, str) and "earthcam.com" in src:
                ffmpeg_headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                    "Referer": src,
                    "Origin": "https://www.earthcam.com",
                }
            gen = iter_frames_ffmpeg(
                resolved,
                width=640,
                height=480,
                fps=5,
                max_frames=1,
                ffmpeg_headers=ffmpeg_headers,
            )
            next(gen)
            return jsonify({"status": "success", "source": str(resolved), "ffmpeg_fallback": True})
        except StopIteration:
            return jsonify({"status": "error", "message": "Could not decode frames via ffmpeg fallback"}), 400
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/resolve_source')
def resolve_source():
    """
    Resolve EarthCam page URL → unique live HLS playlist URL (one per camera).
    Frontend uses this instead of generic embed iframes (which show the same trending UI).
    """
    src = request.args.get('source', 'auto')
    debug = _resolve_detection_source_debug(src)
    hls = debug.get('earthcam_hls_url')
    if not hls and debug.get('earthcam_page_detected'):
        resolved = debug.get('final_resolved_source')
        if isinstance(resolved, str) and resolved.startswith('http'):
            hls = resolved
    return jsonify({
        **debug,
        'status': 'success' if hls else 'error',
        'hls_url': hls,
    })

if __name__ == '__main__':
    # Run the server on port 5000
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
