const video = document.getElementById("cameraVideo");
const frame = document.querySelector(".camera_frame");
const guide = document.querySelector(".face_guide");
const statusText = document.getElementById("cameraStatus");
const shutter = document.getElementById("shutterButton");

let detector;
let gestureRecognizer;
let loadingDetector;
let detectionFrame = 0;
let lastVideoTime = -1;
let lastDetectionAt = 0;
let centeredFrames = 0;
let faceIsAligned = false;
let victoryFrames = 0;
let autoCaptureStarted = false;

window.addEventListener("camera-video-ready", startFaceDetection);
window.addEventListener("camera-photo-taken", () => {
  cancelAnimationFrame(detectionFrame);
  detector?.close();
  gestureRecognizer?.close();
  detector = undefined;
  gestureRecognizer = undefined;
});
window.addEventListener("pagehide", () => {
  cancelAnimationFrame(detectionFrame);
  detector?.close();
  gestureRecognizer?.close();
});

if (window.cameraVideoReady) startFaceDetection();

async function startFaceDetection() {
  if (!video || !frame || !guide || !statusText || !shutter || video.hidden)
    return;
  if (loadingDetector) return loadingDetector;

  loadingDetector = (async () => {
    try {
      statusText.textContent = "正在載入臉部偵測…";
      const { FilesetResolver, FaceDetector, GestureRecognizer } =
        await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/+esm");
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
      );
      detector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        minDetectionConfidence: 0.55,
      });
      try {
        gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/latest/gesture_recognizer.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.55,
          minHandPresenceConfidence: 0.55,
          minTrackingConfidence: 0.5,
        });
      } catch (error) {
        console.error("Gesture recognition could not be loaded:", error);
        statusText.textContent = "手勢偵測載入失敗，仍可使用拍照鍵";
      }
      if (!gestureRecognizer) shutter.disabled = false;
      detectionLoop();
    } catch (error) {
      console.error("Face detection could not be loaded:", error);
      guide.classList.remove("is_aligned");
      statusText.textContent = "臉部偵測載入失敗，可直接手動拍照";
      shutter.disabled = false;
    }
  })();
  return loadingDetector;
}

function detectionLoop() {
  if (!detector || video.hidden || !video.srcObject) return;

  const now = performance.now();
  if (
    video.readyState >= 2 &&
    video.currentTime !== lastVideoTime &&
    now - lastDetectionAt >= 100
  ) {
    lastVideoTime = video.currentTime;
    lastDetectionAt = now;
    try {
      const detections = detector.detectForVideo(video, now).detections;
      updateFacePosition(detections[0]?.boundingBox);
      if (gestureRecognizer) {
        const gestureResult = gestureRecognizer.recognizeForVideo(video, now);
        updateVictoryGesture(gestureResult.gestures);
      }
    } catch (error) {
      console.error("Face detection failed:", error);
      statusText.textContent = "偵測暫時無法使用，可直接手動拍照";
      shutter.disabled = false;
      return;
    }
  }

  detectionFrame = requestAnimationFrame(detectionLoop);
}

function updateFacePosition(box) {
  if (!box) {
    centeredFrames = 0;
    faceIsAligned = false;
    guide.classList.remove("is_aligned");
    statusText.textContent = "尚未偵測到臉";
    shutter.disabled = Boolean(gestureRecognizer);
    return;
  }

  const previewWidth = frame.clientWidth;
  const previewHeight = frame.clientHeight;
  const scale = Math.max(
    previewWidth / video.videoWidth,
    previewHeight / video.videoHeight,
  );
  const cropX = (video.videoWidth * scale - previewWidth) / 2;
  const cropY = (video.videoHeight * scale - previewHeight) / 2;
  const zoom =
    Number.parseFloat(
      getComputedStyle(video).getPropertyValue("--camera-zoom"),
    ) || 1;
  // The live preview is mirrored with CSS, so mirror the detector's x-coordinate too.
  const sourceCenterX = video.videoWidth - (box.originX + box.width / 2);
  const unzoomedX = sourceCenterX * scale - cropX;
  const unzoomedY = (box.originY + box.height / 2) * scale - cropY;
  const centerX = (unzoomedX - previewWidth / 2) * zoom + previewWidth / 2;
  const centerY = (unzoomedY - previewHeight / 2) * zoom + previewHeight / 2;
  const radius = Math.hypot(
    centerX - previewWidth / 2,
    centerY - previewHeight / 2,
  );
  const faceWidth = box.width * scale * zoom;
  const faceIsLargeEnough = faceWidth >= previewWidth * 0.2;
  const faceFitsGuide = faceWidth <= previewWidth * 0.7;
  const isCentered =
    radius <= previewWidth * 0.16 && faceIsLargeEnough && faceFitsGuide;

  centeredFrames = isCentered ? centeredFrames + 1 : 0;
  const ready = centeredFrames >= 3;
  faceIsAligned = ready;
  guide.classList.toggle("is_aligned", ready);
  shutter.disabled = gestureRecognizer ? !ready : false;
  if (victoryFrames >= 3) {
    statusText.textContent = ready
      ? "偵測到比耶，三秒後自動拍照！"
      : "偵測到比耶，請先把臉對準圓框";
  } else {
    statusText.textContent = ready
      ? "已對準，請按拍照鍵拍下照片"
      : !faceIsLargeEnough
        ? "請靠近鏡頭，讓臉大一點"
        : !faceFitsGuide
          ? "請稍微退後，讓整張臉留在圓框內"
          : "請把臉移到圓框中央";
  }
}

function updateVictoryGesture(gestureGroups) {
  const isVictory = gestureGroups.some((categories) =>
    categories.some(
      (category) =>
        category.categoryName === "Victory" && category.score >= 0.78,
    ),
  );
  victoryFrames = isVictory ? victoryFrames + 1 : 0;

  if (
    victoryFrames >= 3 &&
    faceIsAligned &&
    !autoCaptureStarted &&
    !shutter.disabled
  ) {
    autoCaptureStarted = true;
    shutter.click();
  }
}
