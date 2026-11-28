const MEDIA_PIPE_MODULE_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/vision_bundle.mjs";
const MEDIA_PIPE_WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm";
const FACE_LANDMARKER_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const SCORE_STORAGE_PARAM = "score";
const DIRECTION_NAMES = { left: "左", right: "右" };

const video = document.getElementById("camera_preview");
const statusMessage = document.getElementById("camera_status");
const directionGuide = document.getElementById("face_direction_guide");
const personGuide = document.getElementById("camera_person_guide");
const scoreDisplay = document.getElementById("score_display");
const background = document.querySelector(".camera_game_background");
const correctDirection = background.dataset.correctDirection;
const nextPage = background.dataset.nextPage;
const animationDurationMs =
  Number(background.dataset.animationDurationMs) || 3600;
const animationLastFrameMs =
  Number(background.dataset.animationLastFrameMs) || 30;
const answerDurationMs = Number(background.dataset.answerDurationMs) || 1760;
const answerLastFrameMs = Number(background.dataset.answerLastFrameMs) || 80;
const scoreParam = new URLSearchParams(window.location.search).get(
  SCORE_STORAGE_PARAM,
);
const parsedScore = Number(scoreParam);
let score =
  scoreParam !== null && Number.isFinite(parsedScore) ? parsedScore : 0;
const correctParam = new URLSearchParams(window.location.search).get("correct");
const parsedCorrectCount = Number(correctParam);
let correctAnswers =
  correctParam !== null && Number.isFinite(parsedCorrectCount)
    ? parsedCorrectCount
    : Number(localStorage.getItem("level1CorrectCount") ?? "0");
let cameraStream;
let faceLandmarker;
let frameRequest;
let lastVideoTime = -1;
let candidateDirection;
let candidateFrames = 0;
let transitionStarted = false;
let backgroundAnimationSource;
let backgroundPausePromise = Promise.resolve();
let playerDetected = false;
let gameplayStarted = false;
let countdownElement;
let backgroundAnimationStarted = false;
let squashFrameRequest;
let warpPatchCanvas;
if (scoreDisplay) {
  scoreDisplay.textContent = `本次得分：0 分｜累計積分：${score} 分`;
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }
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
  // Keep the page artwork visible if camera permission or model loading fails.
  resumeBackgroundAnimation();
  if (frameRequest) {
    cancelAnimationFrame(frameRequest);
  }

  if (error && error.name === "NotAllowedError") {
    statusMessage.textContent =
      "相機權限遭拒，請在瀏覽器設定中允許使用攝影機。";
  } else if (error && error.name === "NotFoundError") {
    statusMessage.textContent = "找不到攝影機，請連接攝影機後重新載入。";
  } else {
    const details = error instanceof Error ? error.message : String(error);
    statusMessage.textContent = `鏡頭偵測失敗：${details}`;
  }
  console.error("Camera person-position detection failed.", error);
}

function classifyPosition(landmarks) {
  const faceCenterX = landmarks[1]?.x;
  if (!Number.isFinite(faceCenterX)) return null;
  // The mirrored preview reverses the source video's horizontal coordinates.
  if (faceCenterX > 0.58) return "left";
  if (faceCenterX < 0.42) return "right";
  return null;
}

function setGuideDirection(direction) {
  directionGuide.classList.remove("direction_right", "direction_left");
  if (direction) directionGuide.classList.add(`direction_${direction}`);
}

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function startCountdown() {
  countdownElement = document.createElement("div");
  countdownElement.className = "camera_countdown";
  countdownElement.setAttribute("aria-live", "assertive");
  countdownElement.setAttribute("aria-label", "遊戲即將開始");
  document.querySelector(".game_stage").append(countdownElement);

  for (const number of [3, 2, 1]) {
    countdownElement.classList.remove("is-stamping");
    countdownElement.textContent = String(number);
    void countdownElement.offsetWidth;
    countdownElement.classList.add("is-stamping");
    await wait(1000);
  }

  countdownElement.remove();
  gameplayStarted = true;
  statusMessage.textContent = "請移動到左側或右側。";
  resumeBackgroundAnimation();
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

function freezeAnimatedFrame(animatedImage) {
  if (!animatedImage.isConnected) return;
  const frozenFrame = document.createElement("canvas");
  frozenFrame.className = "camera_game_frozen_frame";
  frozenFrame.width = animatedImage.naturalWidth || 1920;
  frozenFrame.height = animatedImage.naturalHeight || 1080;
  frozenFrame.setAttribute("aria-hidden", "true");
  Object.assign(frozenFrame.style, {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: "100%",
    height: "100%",
    transform: "translate(-50%, -50%)",
    pointerEvents: "none",
  });
  const context = frozenFrame.getContext("2d");
  if (!context) return;
  context.drawImage(animatedImage, 0, 0, frozenFrame.width, frozenFrame.height);
  animatedImage.replaceWith(frozenFrame);
}

function warpCameraAroundFace(canvas, context, centerX, centerY, faceWidth, faceHeight) {
  const stageWidth = canvas.width;
  const stageHeight = canvas.height;
  const regionWidth = Math.min(stageWidth, Math.ceil(faceWidth * 2.2));
  const regionHeight = Math.min(stageHeight, Math.ceil(faceHeight * 2.2));
  const regionLeft = Math.max(
    0,
    Math.min(stageWidth - regionWidth, Math.round(centerX - regionWidth / 2)),
  );
  const regionTop = Math.max(
    0,
    Math.min(stageHeight - regionHeight, Math.round(centerY - regionHeight / 2)),
  );
  warpPatchCanvas ??= document.createElement("canvas");
  const patch = warpPatchCanvas;
  patch.width = regionWidth;
  patch.height = regionHeight;
  const patchContext = patch.getContext("2d", { willReadFrequently: true });
  if (!patchContext) return;
  patchContext.drawImage(
    canvas,
    regionLeft,
    regionTop,
    regionWidth,
    regionHeight,
    0,
    0,
    regionWidth,
    regionHeight,
  );
  const source = patchContext.getImageData(0, 0, regionWidth, regionHeight);
  const warped = patchContext.createImageData(regionWidth, regionHeight);
  const localCenterX = centerX - regionLeft;
  const localCenterY = centerY - regionTop;
  const radiusX = Math.max(1, faceWidth * 0.62);
  const radiusY = Math.max(1, faceHeight * 0.58);

  for (let y = 0; y < regionHeight; y += 1) {
    for (let x = 0; x < regionWidth; x += 1) {
      const dx = x - localCenterX;
      const dy = y - localCenterY;
      const weight = Math.exp(
        -0.5 * ((dx / radiusX) ** 2 + (dy / radiusY) ** 2),
      );
      const sourceX = Math.max(
        0,
        Math.min(regionWidth - 1, Math.round(localCenterX + dx * (1 - 0.08 * weight))),
      );
      const sourceY = Math.max(
        0,
        Math.min(regionHeight - 1, Math.round(localCenterY + dy * (1 + 1.25 * weight))),
      );
      const sourceOffset = (sourceY * regionWidth + sourceX) * 4;
      const destinationOffset = (y * regionWidth + x) * 4;
      warped.data[destinationOffset] = source.data[sourceOffset];
      warped.data[destinationOffset + 1] = source.data[sourceOffset + 1];
      warped.data[destinationOffset + 2] = source.data[sourceOffset + 2];
      warped.data[destinationOffset + 3] = source.data[sourceOffset + 3];
    }
  }

  patchContext.putImageData(warped, 0, 0);
  context.drawImage(patch, regionLeft, regionTop);
}

function showSquashedFace(initialLandmarks) {
  if (!video.videoWidth || !video.videoHeight || !faceLandmarker) return;
  const stage = document.querySelector(".game_stage");
  const stageWidth = stage.clientWidth;
  const stageHeight = stage.clientHeight;
  const scale = Math.max(
    stageWidth / video.videoWidth,
    stageHeight / video.videoHeight,
  );
  const renderWidth = video.videoWidth * scale;
  const renderHeight = video.videoHeight * scale;
  const renderLeft = (stageWidth - renderWidth) / 2;
  const renderTop = (stageHeight - renderHeight) / 2;
  const snapshot = document.createElement("canvas");
  snapshot.className = "camera_live_mirror";
  snapshot.width = stageWidth;
  snapshot.height = stageHeight;
  const hitBurst = document.createElement("div");
  hitBurst.className = "camera_hit_burst";
  const hitText = document.createElement("div");
  hitText.className = "camera_hit_text";
  hitText.textContent = "啪！";
  const filterDefs = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  filterDefs.classList.add("camera_hit_filter_defs");
  filterDefs.setAttribute("aria-hidden", "true");
  filterDefs.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
  filterDefs.innerHTML = `<filter id="camera-hit-rough" x="-25%" y="-25%" width="150%" height="150%">
    <feTurbulence type="fractalNoise" baseFrequency="0.055" numOctaves="3" seed="8" result="rough" />
    <feDisplacementMap in="SourceGraphic" in2="rough" scale="13" xChannelSelector="R" yChannelSelector="G" />
  </filter>`;
  const snapshotContext = snapshot.getContext("2d");
  if (!snapshotContext) return;

  stage.append(filterDefs, snapshot, hitBurst, hitText);
  window.setTimeout(() => {
    hitBurst.remove();
    hitText.remove();
  }, 750);
  video.style.visibility = "hidden";
  let currentLandmarks = initialLandmarks;
  let lastDetectedVideoTime = -1;
  let hitTextPositioned = false;

  const renderEffect = (timestamp) => {
    if (!faceLandmarker) {
      snapshot.remove();
      hitBurst.remove();
      video.style.visibility = "";
      squashFrameRequest = undefined;
      closeFaceLandmarker();
      return;
    }

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      snapshotContext.fillStyle = "#111";
      snapshotContext.fillRect(0, 0, stageWidth, stageHeight);
      snapshotContext.save();
      snapshotContext.translate(stageWidth, 0);
      snapshotContext.scale(-1, 1);
      snapshotContext.drawImage(
        video,
        renderLeft,
        renderTop,
        renderWidth,
        renderHeight,
      );
      snapshotContext.restore();

      if (video.currentTime !== lastDetectedVideoTime) {
        lastDetectedVideoTime = video.currentTime;
        try {
          currentLandmarks = faceLandmarker.detectForVideo(video, timestamp)
            .faceLandmarks[0];
        } catch (error) {
          console.warn(
            "Could not track the face during the squash effect.",
            error,
          );
        }
      }

      if (currentLandmarks?.length) {
        const bounds = currentLandmarks.reduce(
          (result, point) => ({
            minX: Math.min(result.minX, point.x),
            maxX: Math.max(result.maxX, point.x),
            minY: Math.min(result.minY, point.y),
            maxY: Math.max(result.maxY, point.y),
          }),
          { minX: 1, maxX: 0, minY: 1, maxY: 0 },
        );
        const padX = (bounds.maxX - bounds.minX) * 0.05;
        const padY = (bounds.maxY - bounds.minY) * 0.05;
        const minX = Math.max(0, bounds.minX - padX);
        const maxX = Math.min(1, bounds.maxX + padX);
        const minY = Math.max(0, bounds.minY - padY);
        const maxY = Math.min(1, bounds.maxY + padY);
        const faceLeft = renderLeft + (1 - maxX) * renderWidth;
        const faceTop = renderTop + minY * renderHeight;
        const faceWidth = Math.max(1, (maxX - minX) * renderWidth);
        const faceHeight = Math.max(1, (maxY - minY) * renderHeight);
        warpCameraAroundFace(
          snapshot,
          snapshotContext,
          faceLeft + faceWidth / 2,
          faceTop + faceHeight / 2,
          faceWidth,
          faceHeight,
        );
        Object.assign(hitBurst.style, {
          display: "flex",
          left: `${faceLeft + faceWidth / 2}px`,
          top: `${faceTop + faceHeight * 0.18}px`,
          width: `${faceWidth * 1.2}px`,
          height: `${faceHeight * 1.2}px`,
        });
        if (!hitTextPositioned) {
          Object.assign(hitText.style, {
            left: `${faceLeft - faceWidth * 0.14}px`,
            top: `${faceTop - faceHeight * 0.12}px`,
            width: `${faceWidth * 0.9}px`,
            height: `${faceHeight * 0.35}px`,
            fontSize: `${faceWidth * 0.28}px`,
            display: "block",
          });
          void hitText.offsetWidth;
          hitText.classList.add("is-animated");
          hitTextPositioned = true;
        }
      } else {
        hitBurst.style.display = "none";
        if (!hitTextPositioned) hitText.style.display = "none";
      }
    }

    squashFrameRequest = requestAnimationFrame(renderEffect);
  };

  squashFrameRequest = requestAnimationFrame(renderEffect);
}

function cleanupSquashEffect() {
  if (squashFrameRequest !== undefined) {
    cancelAnimationFrame(squashFrameRequest);
    squashFrameRequest = undefined;
  }
  document
    .querySelectorAll(
      ".camera_live_mirror, .camera_hit_burst, .camera_hit_text, .camera_hit_filter_defs",
    )
    .forEach((element) => element.remove());
  video.style.visibility = "";
  closeFaceLandmarker();
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

async function resumeBackgroundAnimation() {
  if (backgroundAnimationStarted) return;
  await backgroundPausePromise;

  const frozenFrame = background.querySelector(".camera_game_frozen_frame");
  if (!frozenFrame || !backgroundAnimationSource) {
    return;
  }

  backgroundAnimationStarted = true;
  const image = document.createElement("img");
  image.alt = "";
  const animationUrl = new URL(backgroundAnimationSource, window.location.href);
  animationUrl.searchParams.set("restart", String(Date.now()));
  image.src = animationUrl.href;
  frozenFrame.replaceWith(image);
  await image.decode().catch(() => {});
  window.setTimeout(
    () => freezeAnimatedFrame(image),
    Math.max(0, animationDurationMs - animationLastFrameMs),
  );
}

async function playGifOnce(source, duration, lastFrameDuration, onStart) {
  const animationUrl = new URL(source, window.location.href);
  animationUrl.searchParams.set("restart", String(Date.now()));
  const image = document.createElement("img");
  image.alt = "";
  image.src = animationUrl.href;
  background.replaceChildren(image);
  await image.decode().catch(() => {});
  onStart?.();
  await wait(Math.max(0, duration - lastFrameDuration));
  freezeAnimatedFrame(image);
  await wait(lastFrameDuration);
}

function navigateToNextPage() {
  localStorage.setItem("level1Score", String(score));
  localStorage.setItem("totalScore", String(score));
  localStorage.setItem("level1CorrectCount", String(correctAnswers));
  const destination = new URL(nextPage, window.location.href);
  destination.searchParams.set(SCORE_STORAGE_PARAM, String(score));
  destination.searchParams.set("correct", String(correctAnswers));
  window.location.assign(destination.href);
}

function completeWithDirection(direction, landmarks) {
  if (transitionStarted) {
    return;
  }
  transitionStarted = true;
  const questionPoints = background.classList.contains("devel1_Q3_bg") ? 9 : 8;
  const earnedPoints = direction === correctDirection ? questionPoints : 0;
  score += earnedPoints;
  if (earnedPoints > 0) correctAnswers += 1;
  localStorage.setItem("level1Score", String(score));
  localStorage.setItem("totalScore", String(score));
  localStorage.setItem("level1CorrectCount", String(correctAnswers));
  console.log(
    `[Devel1 鏡頭] 本題得分 ${earnedPoints} 分；第一關累計 ${score} 分；遊戲總分 ${score} 分`,
  );
  if (scoreDisplay) {
    scoreDisplay.textContent = `本次得分：${earnedPoints} 分｜累計積分：${score} 分`;
  }

  if (direction === correctDirection) closeFaceLandmarker();
  personGuide?.classList.add("is-hidden");
  statusMessage.textContent = `你往${DIRECTION_NAMES[direction]}看了！`;
  setGuideDirection(direction);
  playAnswerAnimation(
    direction,
    direction !== correctDirection ? landmarks : null,
  );
}

async function playAnswerAnimation(direction, landmarksForEffect) {
  document.body.classList.add(
    direction === correctDirection ? "answer-correct" : "answer-wrong",
    `answer-${direction}`,
  );
  await wait(1000);
  document.body.classList.remove(
    "answer-correct",
    "answer-wrong",
    "answer-left",
    "answer-right",
  );

  const answerImage = background.dataset.answerImage;
  if (answerImage) {
    await playGifOnce(
      answerImage,
      answerDurationMs,
      answerLastFrameMs,
      landmarksForEffect
        ? () =>
            window.setTimeout(
              () => showSquashedFace(landmarksForEffect),
              1000,
            )
        : undefined,
    );
  }
  background.hidden = true;
  directionGuide.hidden = true;
  statusMessage.hidden = true;
  await wait(1000);
  stopCamera();
  navigateToNextPage();
}

function processFrame() {
  if (transitionStarted || !faceLandmarker) {
    return;
  }

  if (
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
    video.currentTime !== lastVideoTime
  ) {
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
      statusMessage.textContent = playerDetected
        ? "找不到人物，請回到鏡頭畫面。"
        : "請站在虛線人形位置。";
    } else {
      if (!playerDetected) {
        playerDetected = true;
        personGuide?.classList.add("is-hidden");
        statusMessage.textContent = "準備開始。";
        startCountdown();
      }
      if (!gameplayStarted) {
        candidateDirection = undefined;
        candidateFrames = 0;
      } else {
        const direction = classifyPosition(landmarks);
        if (!direction) {
          candidateDirection = undefined;
          candidateFrames = 0;
          setGuideDirection(undefined);
          statusMessage.textContent = "請移動到左側或右側。";
        } else {
          statusMessage.textContent = `偵測到人物在${DIRECTION_NAMES[direction]}側。`;
          if (direction === candidateDirection) {
            candidateFrames += 1;
            if (candidateFrames >= 5) {
              completeWithDirection(direction, landmarks);
            }
          } else {
            candidateDirection = direction;
            candidateFrames = 1;
            setGuideDirection(direction);
          }
        }
      }
    }
  }

  if (!transitionStarted) {
    frameRequest = requestAnimationFrame(processFrame);
  }
}

async function startCameraGame() {
  backgroundPausePromise = pauseBackgroundAnimation();
  await backgroundPausePromise;

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("請透過 localhost 或 HTTPS 開啟頁面，才能使用攝影機。");
  }

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

  statusMessage.textContent = "正在載入人物偵測模型...";
  const { FaceLandmarker, FilesetResolver } = await import(
    MEDIA_PIPE_MODULE_URL
  );
  const vision = await FilesetResolver.forVisionTasks(MEDIA_PIPE_WASM_URL);
  faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: FACE_LANDMARKER_MODEL_URL },
    runningMode: "VIDEO",
    numFaces: 1,
    minFaceDetectionConfidence: 0.6,
    minFacePresenceConfidence: 0.6,
    minTrackingConfidence: 0.6,
  });

  statusMessage.textContent = "請站在虛線人形位置。";
  frameRequest = requestAnimationFrame(processFrame);
}

window.addEventListener("pagehide", () => {
  stopCamera();
  cleanupSquashEffect();
});
startCameraGame().catch(showError);
