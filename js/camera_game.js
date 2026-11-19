const MEDIA_PIPE_MODULE_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/vision_bundle.mjs";
const MEDIA_PIPE_WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm";
const FACE_LANDMARKER_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const SCORE_STORAGE_PARAM = "score";
const DIRECTION_NAMES = { up: "上", down: "下", left: "左", right: "右" };
const FISHEYE_PREVIEW_WIDTH = 320;
const FISHEYE_PREVIEW_HEIGHT = 240;
const FISHEYE_STRENGTH = 0.8;

const video = document.getElementById("camera_preview");
const statusMessage = document.getElementById("camera_status");
const directionGuide = document.getElementById("face_direction_guide");
const scoreDisplay = document.getElementById("score_display");
const background = document.querySelector(".camera_game_background");
const stopBackgroundImage = new Image();
const correctDirection = background.dataset.correctDirection;
const nextPage = background.dataset.nextPage;
const scoreParam = new URLSearchParams(window.location.search).get(SCORE_STORAGE_PARAM);
const parsedScore = Number(scoreParam);
let score = scoreParam !== null && Number.isFinite(parsedScore) ? parsedScore : 0;
const animationDurationMs =
  Number(background.dataset.animationDurationMs) || 2160;
let cameraStream;
let faceLandmarker;
let frameRequest;
let lastVideoTime = -1;
let calibrationStartedAt;
let calibrationSamples = [];
let neutralPose;
let candidateDirection;
let candidateFrames = 0;
let transitionStarted = false;
let noMovementTimeout;
let turnDetectionEnabled = false;
let backgroundAnimationSource;
let fisheyeCanvas;
let fisheyeContext;
let fisheyeSourceCanvas;
let fisheyeSourceContext;
let fisheyeSourceMap;
let fisheyeOutputFrame;
let previewFrameRequest;
let lastPreviewRenderAt = 0;

if (background.dataset.stopImage) {
  stopBackgroundImage.src = background.dataset.stopImage;
}

if (scoreDisplay) {
  scoreDisplay.textContent = `本次得分：0 分｜累計積分：${score} 分`;
}

function stopCamera() {
  if (previewFrameRequest !== undefined) {
    cancelAnimationFrame(previewFrameRequest);
    previewFrameRequest = undefined;
  }

  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }
}

function createFisheyeSourceMap() {
  const map = new Int32Array(FISHEYE_PREVIEW_WIDTH * FISHEYE_PREVIEW_HEIGHT);
  const centerX = (FISHEYE_PREVIEW_WIDTH - 1) / 2;
  const centerY = (FISHEYE_PREVIEW_HEIGHT - 1) / 2;

  for (let y = 0; y < FISHEYE_PREVIEW_HEIGHT; y += 1) {
    for (let x = 0; x < FISHEYE_PREVIEW_WIDTH; x += 1) {
      const normalizedX = (x - centerX) / centerX;
      const normalizedY = (y - centerY) / centerY;
      const radiusSquared = normalizedX ** 2 + normalizedY ** 2;
      const distortion = 1 + FISHEYE_STRENGTH * radiusSquared;
      const sourceX = Math.round(centerX + normalizedX * distortion * centerX);
      const sourceY = Math.round(centerY + normalizedY * distortion * centerY);
      const destinationIndex = y * FISHEYE_PREVIEW_WIDTH + x;

      map[destinationIndex] =
        sourceX >= 0 &&
        sourceX < FISHEYE_PREVIEW_WIDTH &&
        sourceY >= 0 &&
        sourceY < FISHEYE_PREVIEW_HEIGHT
          ? (sourceY * FISHEYE_PREVIEW_WIDTH + sourceX) * 4
          : -1;
    }
  }

  return map;
}

function renderFisheyePreview(timestamp) {
  if (
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
    timestamp - lastPreviewRenderAt >= 1000 / 24
  ) {
    lastPreviewRenderAt = timestamp;

    try {
      const targetAspect = FISHEYE_PREVIEW_WIDTH / FISHEYE_PREVIEW_HEIGHT;
      let cropX = 0;
      let cropY = 0;
      let cropWidth = video.videoWidth;
      let cropHeight = video.videoHeight;

      if (cropWidth / cropHeight > targetAspect) {
        cropWidth = cropHeight * targetAspect;
        cropX = (video.videoWidth - cropWidth) / 2;
      } else {
        cropHeight = cropWidth / targetAspect;
        cropY = (video.videoHeight - cropHeight) / 2;
      }

      fisheyeSourceContext.drawImage(
        video,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        FISHEYE_PREVIEW_WIDTH,
        FISHEYE_PREVIEW_HEIGHT,
      );

      const sourcePixels = fisheyeSourceContext.getImageData(
        0,
        0,
        FISHEYE_PREVIEW_WIDTH,
        FISHEYE_PREVIEW_HEIGHT,
      ).data;
      const outputPixels = fisheyeOutputFrame.data;

      for (let pixel = 0; pixel < fisheyeSourceMap.length; pixel += 1) {
        const destinationOffset = pixel * 4;
        const sourceOffset = fisheyeSourceMap[pixel];

        if (sourceOffset === -1) {
          outputPixels[destinationOffset] = 0;
          outputPixels[destinationOffset + 1] = 0;
          outputPixels[destinationOffset + 2] = 0;
          outputPixels[destinationOffset + 3] = 255;
        } else {
          outputPixels[destinationOffset] = sourcePixels[sourceOffset];
          outputPixels[destinationOffset + 1] = sourcePixels[sourceOffset + 1];
          outputPixels[destinationOffset + 2] = sourcePixels[sourceOffset + 2];
          outputPixels[destinationOffset + 3] = sourcePixels[sourceOffset + 3];
        }
      }

      fisheyeContext.putImageData(fisheyeOutputFrame, 0, 0);
    } catch (error) {
      showError(error);
      return;
    }
  }

  previewFrameRequest = requestAnimationFrame(renderFisheyePreview);
}

function startFisheyePreview() {
  const previewWrapper = video.parentElement;
  if (!previewWrapper) {
    throw new Error("找不到鏡頭預覽容器。");
  }

  fisheyeCanvas = document.createElement("canvas");
  fisheyeCanvas.className = "camera_fisheye_preview";
  fisheyeCanvas.width = FISHEYE_PREVIEW_WIDTH;
  fisheyeCanvas.height = FISHEYE_PREVIEW_HEIGHT;
  fisheyeCanvas.setAttribute("role", "img");
  fisheyeCanvas.setAttribute("aria-label", "鏡頭預覽（魚眼效果）");
  previewWrapper.insertBefore(fisheyeCanvas, directionGuide);

  fisheyeSourceCanvas = document.createElement("canvas");
  fisheyeSourceCanvas.width = FISHEYE_PREVIEW_WIDTH;
  fisheyeSourceCanvas.height = FISHEYE_PREVIEW_HEIGHT;
  fisheyeContext = fisheyeCanvas.getContext("2d");
  fisheyeSourceContext = fisheyeSourceCanvas.getContext("2d", {
    willReadFrequently: true,
  });
  if (!fisheyeContext || !fisheyeSourceContext) {
    throw new Error("瀏覽器無法建立魚眼預覽畫布。");
  }

  fisheyeSourceMap = createFisheyeSourceMap();
  fisheyeOutputFrame = fisheyeContext.createImageData(
    FISHEYE_PREVIEW_WIDTH,
    FISHEYE_PREVIEW_HEIGHT,
  );
  video.hidden = true;
  previewFrameRequest = requestAnimationFrame(renderFisheyePreview);
}

function closeFaceLandmarker() {
  if (faceLandmarker) {
    faceLandmarker.close();
    faceLandmarker = null;
  }
}

function showError(error) {
  stopCamera();
  closeFaceLandmarker();
  if (frameRequest) {
    cancelAnimationFrame(frameRequest);
  }

  if (error && error.name === "NotAllowedError") {
    statusMessage.textContent = "相機權限遭拒，請在瀏覽器設定中允許使用攝影機。";
  } else if (error && error.name === "NotFoundError") {
    statusMessage.textContent = "找不到攝影機，請連接攝影機後重新載入。";
  } else {
    const details = error instanceof Error ? error.message : String(error);
    statusMessage.textContent = `鏡頭偵測失敗：${details}`;
  }
  console.error("Camera head-direction detection failed.", error);
}

function getHeadPose(landmarks) {
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const nose = landmarks[1];
  const forehead = landmarks[10];
  const chin = landmarks[152];
  const eyeWidth = Math.abs(rightEye.x - leftEye.x);
  const faceHeight = Math.abs(chin.y - forehead.y);

  if (eyeWidth < 0.02 || faceHeight < 0.05) {
    return null;
  }

  return {
    yaw: (nose.x - (leftEye.x + rightEye.x) / 2) / eyeWidth,
    pitch: (nose.y - (leftEye.y + rightEye.y) / 2) / faceHeight,
  };
}

function averagePose(samples) {
  return samples.reduce(
    (average, pose) => ({
      yaw: average.yaw + pose.yaw / samples.length,
      pitch: average.pitch + pose.pitch / samples.length,
    }),
    { yaw: 0, pitch: 0 },
  );
}

function classifyDirection(pose) {
  const horizontalChange = pose.yaw - neutralPose.yaw;
  const verticalChange = pose.pitch - neutralPose.pitch;
  const horizontalAmount = Math.abs(horizontalChange) / 0.1;
  const verticalAmount = Math.abs(verticalChange) / 0.05;

  if (horizontalAmount < 1 && verticalAmount < 1) {
    return null;
  }
  if (verticalAmount >= horizontalAmount) {
    return verticalChange < 0 ? "up" : "down";
  }

  // The preview is mirrored, so positive source-image movement is the user's left.
  return horizontalChange > 0 ? "left" : "right";
}

function setGuideDirection(direction) {
  directionGuide.classList.remove(
    "direction_up",
    "direction_right",
    "direction_down",
    "direction_left",
  );
  if (direction) directionGuide.classList.add(`direction_${direction}`);
}

function freezeCurrentBackground() {
  const currentImage = background.querySelector("img");
  if (!currentImage) return;

  const bounds = background.getBoundingClientRect();
  const imageBounds = currentImage.getBoundingClientRect();
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bounds.width));
  canvas.height = Math.max(1, Math.round(bounds.height));
  canvas.className = "camera_game_frozen_frame";
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
  });

  const context = canvas.getContext("2d");
  if (!context) return;

  try {
    context.drawImage(
      currentImage,
      imageBounds.left - bounds.left,
      imageBounds.top - bounds.top,
      imageBounds.width,
      imageBounds.height,
    );
    currentImage.remove();
    background.appendChild(canvas);
    return true;
  } catch (error) {
    console.warn("Could not freeze the background animation.", error);
    return false;
  }
}

async function pauseBackgroundAnimation() {
  const currentImage = background.querySelector("img");
  if (!currentImage) return;

  backgroundAnimationSource = currentImage.getAttribute("src");
  try {
    await currentImage.decode();
    freezeCurrentBackground();
  } catch (error) {
    console.warn("Could not pause the background animation.", error);
  }
}

function resumeBackgroundAnimation() {
  const frozenFrame = background.querySelector(".camera_game_frozen_frame");
  if (!frozenFrame || !backgroundAnimationSource) return;

  const image = document.createElement("img");
  image.alt = "";
  const animationUrl = new URL(backgroundAnimationSource, window.location.href);
  animationUrl.searchParams.set("restart", String(Date.now()));
  image.src = animationUrl.href;
  frozenFrame.replaceWith(image);
}

function completeWithDirection(direction) {
  if (transitionStarted) {
    return;
  }
  transitionStarted = true;
  window.clearTimeout(noMovementTimeout);

  const earnedPoints = direction === correctDirection ? 8 : 0;
  score += earnedPoints;
  if (scoreDisplay) {
    scoreDisplay.textContent = `本次得分：${earnedPoints} 分｜累計積分：${score} 分`;
  }

  closeFaceLandmarker();
  statusMessage.textContent = `偵測到頭部向${DIRECTION_NAMES[direction]}。`;
  setGuideDirection(direction);

  const showEndFrame = stopBackgroundImage.src
    ? stopBackgroundImage
        .decode()
        .then(() => {
          const currentImage = background.querySelector("img");
          if (currentImage) {
            stopBackgroundImage.alt = currentImage.alt;
            background.replaceChild(stopBackgroundImage, currentImage);
          }
        })
        .catch(() => freezeCurrentBackground())
    : Promise.resolve(freezeCurrentBackground());

  showEndFrame.finally(() => {
    setTimeout(() => {
      stopCamera();
      window.location.href = `${nextPage}?${SCORE_STORAGE_PARAM}=${score}`;
    }, 2000);
  });
}

function completeWithoutMovement() {
  if (transitionStarted) return;
  transitionStarted = true;
  candidateDirection = undefined;
  candidateFrames = 0;
  setGuideDirection(undefined);
  closeFaceLandmarker();
  if (frameRequest) cancelAnimationFrame(frameRequest);
  freezeCurrentBackground();
  statusMessage.textContent = "你太慢了";

  window.setTimeout(() => {
    stopCamera();
    window.location.href = `${nextPage}?${SCORE_STORAGE_PARAM}=${score}`;
  }, 1200);
}

function processFrame() {
  if (transitionStarted || !faceLandmarker) {
    return;
  }

  if (neutralPose && !turnDetectionEnabled) {
    frameRequest = requestAnimationFrame(processFrame);
    return;
  }

  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    let result;
    try {
      result = faceLandmarker.detectForVideo(video, performance.now());
    } catch (error) {
      showError(error);
      return;
    }

    const landmarks = result.faceLandmarks[0];
    if (!landmarks) {
      candidateDirection = undefined;
      candidateFrames = 0;
      setGuideDirection(undefined);
      statusMessage.textContent = neutralPose
        ? "未偵測到人臉，請回到鏡頭畫面中央。"
        : "請將臉放在鏡頭畫面中央，並正面看鏡頭校準。";
    } else {
      const pose = getHeadPose(landmarks);
      if (!pose) {
        candidateDirection = undefined;
        candidateFrames = 0;
        setGuideDirection(undefined);
      } else if (!neutralPose) {
        if (calibrationStartedAt === undefined) {
          calibrationStartedAt = performance.now();
        }
        calibrationSamples.push(pose);

        if (performance.now() - calibrationStartedAt >= 1000 && calibrationSamples.length >= 10) {
          neutralPose = averagePose(calibrationSamples);
          directionGuide.classList.add("is_calibrated");
          statusMessage.textContent = "確認成功";
          setTimeout(() => {
            if (transitionStarted) return;
            resumeBackgroundAnimation();
            turnDetectionEnabled = true;
            statusMessage.textContent = "請向上、下、左或右轉頭。";
            noMovementTimeout = window.setTimeout(
              completeWithoutMovement,
              animationDurationMs,
            );
          }, 1200);
        } else {
          statusMessage.textContent = "請正面看鏡頭，保持不動。";
        }
      } else {
        const direction = classifyDirection(pose);
        if (!direction) {
          candidateDirection = undefined;
          candidateFrames = 0;
          setGuideDirection(undefined);
          statusMessage.textContent = "請向上、下、左或右轉頭。";
        } else if (direction === candidateDirection) {
          candidateFrames += 1;
          if (candidateFrames >= 5) {
            completeWithDirection(direction);
          }
        } else {
          candidateDirection = direction;
          candidateFrames = 1;
          setGuideDirection(direction);
        }
      }
    }
  }

  if (!transitionStarted) {
    frameRequest = requestAnimationFrame(processFrame);
  }
}

async function startCameraGame() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("請透過 localhost 或 HTTPS 開啟頁面，才能使用攝影機。");
  }

  await pauseBackgroundAnimation();
  statusMessage.textContent = "等待攝影機權限...";
  cameraStream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: "user",
      width: { ideal: 640 },
      height: { ideal: 480 },
    },
  });
  video.srcObject = cameraStream;
  await video.play();
  startFisheyePreview();

  statusMessage.textContent = "正在載入頭部偵測模型...";
  const { FaceLandmarker, FilesetResolver } = await import(MEDIA_PIPE_MODULE_URL);
  const vision = await FilesetResolver.forVisionTasks(MEDIA_PIPE_WASM_URL);
  faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: FACE_LANDMARKER_MODEL_URL },
    runningMode: "VIDEO",
    numFaces: 1,
    minFaceDetectionConfidence: 0.6,
    minFacePresenceConfidence: 0.6,
    minTrackingConfidence: 0.6,
  });

  statusMessage.textContent = "請正面看鏡頭，保持不動。";
  frameRequest = requestAnimationFrame(processFrame);
}

window.addEventListener("pagehide", stopCamera);
startCameraGame().catch(showError);
