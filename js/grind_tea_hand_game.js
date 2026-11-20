const VISION_MODULE_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/vision_bundle.mjs";
const VISION_WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm";
const HAND_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const FIST_CONFIRMATION_MS = 1200;

const stage = document.getElementById("gameStage");
const video = document.getElementById("cameraFeed");
const tea = document.querySelector(".tea");
const status = document.getElementById("cameraStatus");
const track = document.getElementById("track");
const cow = document.getElementById("cow");
const cowGuide = document.getElementById("cowGuide");
const pestle = document.getElementById("pestle");
const scoreDisplay = document.getElementById("score");
const timerDisplay = document.getElementById("timer");
const feedback = document.getElementById("feedback");

const durationSeconds = 15;
const minScore = 5;
const maxScore = 25;
const initialCowSpeed = 400; // 牛剛開始的速度，單位為舞台像素／秒。
const cowAcceleration = 80; // 每秒增加的速度。
const maxCowSpeed = 1500; // 牛的最高速度。
const followDistance = 150;
let score = minScore;
let secondsLeft = durationSeconds;
let handX = null;
let handY = null;
let markerX = 0;
let direction = 1;
let lastFrame = 0;
let gameStartedAt = 0;
let lastVideoTime = -1;
let running = false;
let gameHasStarted = false;
let fistHoldStartedAt = null;
let teaAnimationSource = tea?.getAttribute("src") || "";
let handLandmarker;
let cameraStream;
let animationId;
let timerId;
let scoreId;

function distanceBetween(first, second) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function isClosedFist(landmarks) {
  const wrist = landmarks[0];
  return [
    [8, 6],
    [12, 10],
    [16, 14],
    [20, 18],
  ].every(
    ([tipIndex, jointIndex]) =>
      distanceBetween(landmarks[tipIndex], wrist) <
      distanceBetween(landmarks[jointIndex], wrist),
  );
}

async function pauseTeaAnimation() {
  if (!tea || !teaAnimationSource) return;
  try {
    await tea.decode();
    const frozenTea = document.createElement("canvas");
    frozenTea.className = "tea tea_frozen";
    frozenTea.width = tea.naturalWidth;
    frozenTea.height = tea.naturalHeight;
    frozenTea.setAttribute("aria-hidden", "true");
    const context = frozenTea.getContext("2d");
    if (!context) return;
    context.drawImage(tea, 0, 0);
    tea.replaceWith(frozenTea);
  } catch (error) {
    console.warn("Could not pause the tea animation before the game.", error);
  }
}

function resumeTeaAnimation() {
  const frozenTea = document.querySelector(".tea_frozen");
  if (!frozenTea || !teaAnimationSource) return;
  const animatedTea = document.createElement("img");
  animatedTea.className = "tea";
  animatedTea.alt = "茶葉";
  const animationUrl = new URL(teaAnimationSource, window.location.href);
  animationUrl.searchParams.set("restart", String(Date.now()));
  animatedTea.src = animationUrl.href;
  frozenTea.replaceWith(animatedTea);
}

function renderScore() {
  if (scoreDisplay) scoreDisplay.textContent = `分數：${score}`;
}

function animateMarker(now) {
  if (!running) return;
  if (lastFrame) {
    const elapsed = Math.min((now - lastFrame) / 1000, 0.05);
    const maxX = Math.max(0, track.clientWidth - cow.clientWidth);
    const currentSpeed = Math.min(
      maxCowSpeed,
      initialCowSpeed + ((now - gameStartedAt) / 1000) * cowAcceleration,
    );
    markerX += direction * currentSpeed * elapsed;
    if (markerX >= maxX) {
      markerX = maxX;
      direction = -1;
      cow.style.transform = "none";
    } else if (markerX <= 0) {
      markerX = 0;
      direction = 1;
      cow.style.transform = "scaleX(-1)";
    }
    cow.style.left = `${markerX}px`;
    cowGuide.style.left = `${markerX + cow.clientWidth / 2}px`;
  }
  lastFrame = now;
  animationId = requestAnimationFrame(animateMarker);
}

function updateScore() {
  if (!running) return;
  const trackBounds = track.getBoundingClientRect();
  const stageBounds = stage.getBoundingClientRect();
  const scaleX = stageBounds.width / 1920;
  const targetX =
    (trackBounds.left - stageBounds.left) / scaleX +
    markerX +
    cow.clientWidth / 2;
  const onTarget =
    handX !== null && Math.abs(handX - targetX) <= followDistance;
  cowGuide.classList.toggle("is_following", onTarget);
  cowGuide.classList.toggle("is_missing", !onTarget);
  score = Math.max(minScore, Math.min(maxScore, score + (onTarget ? 1 : -1)));
  renderScore();
  feedback.textContent =
    handX === null
      ? "請將手掌放進鏡頭畫面"
      : onTarget
        ? "跟上了，繼續保持！"
        : "跟著牛移動手掌！";
}

function stopGame() {
  running = false;
  cancelAnimationFrame(animationId);
  clearInterval(timerId);
  clearInterval(scoreId);
  if (timerDisplay) timerDisplay.textContent = "時間到！";
  feedback.textContent = "遊戲結束";
  const previousTotal = Number(localStorage.getItem("totalScore") ?? "0");
  const currentTotal = Number.isFinite(previousTotal) ? previousTotal : 0;
  const newTotal = currentTotal + score;
  localStorage.setItem("level2Score", String(score));
  localStorage.setItem("totalScore", String(newTotal));
  console.log(`[Devel2 鏡頭] 本關得分 ${score} 分；累計總分 ${newTotal} 分`);
  window.location.href = "./1_3_2.html";
}

function startGame() {
  score = minScore;
  secondsLeft = durationSeconds;
  handX = null;
  handY = null;
  markerX = 0;
  direction = 1;
  lastFrame = 0;
  gameStartedAt = performance.now();
  running = true;
  renderScore();
  if (timerDisplay) timerDisplay.textContent = `剩餘時間：${secondsLeft} 秒`;
  cow.style.left = "0px";
  cow.style.transform = "scaleX(-1)";
  cowGuide.style.left = `${cow.clientWidth / 2}px`;
  animationId = requestAnimationFrame(animateMarker);
  timerId = setInterval(() => {
    secondsLeft -= 1;
    if (timerDisplay) timerDisplay.textContent = `剩餘時間：${secondsLeft} 秒`;
    if (secondsLeft <= 0) stopGame();
  }, 1000);
  scoreId = setInterval(updateScore, 1000);
}

function mapHandToStage(sourceX, sourceY) {
  const cameraBounds = video.getBoundingClientRect();
  const viewportAspect = cameraBounds.width / cameraBounds.height;
  const sourceAspect = video.videoWidth / video.videoHeight;
  const visibleWidth = Math.min(1, viewportAspect / sourceAspect);
  const visibleHeight = Math.min(1, sourceAspect / viewportAspect);
  // The camera image is mirrored for the player, so reverse the landmark's x coordinate.
  const cameraX = Math.min(
    1,
    Math.max(0, (1 - sourceX - (1 - visibleWidth) / 2) / visibleWidth),
  );
  const screenX = cameraBounds.left + cameraX * cameraBounds.width;
  const stageBounds = stage.getBoundingClientRect();
  const scaleX = stageBounds.width / 1920;
  const scaleY = stageBounds.height / 1080;
  // The preview mirrors the image horizontally, not vertically.
  const cameraY = Math.min(
    1,
    Math.max(0, (sourceY - (1 - visibleHeight) / 2) / visibleHeight),
  );
  const screenY = cameraBounds.top + cameraY * cameraBounds.height;
  return {
    x: Math.min(1920, Math.max(0, (screenX - stageBounds.left) / scaleX)),
    y: Math.min(1080, Math.max(0, (screenY - stageBounds.top) / scaleY)),
  };
}

function detectHands() {
  if (!handLandmarker) return;
  if (
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
    video.currentTime !== lastVideoTime
  ) {
    lastVideoTime = video.currentTime;
    try {
      const detection = handLandmarker.detectForVideo(video, performance.now());
      const landmarks = detection.landmarks?.[0];
      if (landmarks) {
        if (!gameHasStarted) {
          if (isClosedFist(landmarks)) {
            if (fistHoldStartedAt === null) fistHoldStartedAt = performance.now();
            const heldFor = performance.now() - fistHoldStartedAt;
            const remaining = Math.max(0, (FIST_CONFIRMATION_MS - heldFor) / 1000);
            if (heldFor >= FIST_CONFIRMATION_MS) {
              gameHasStarted = true;
              status.textContent = "握拳確認完成，遊戲開始！";
              feedback.textContent = "左右移動手掌，跟著牛移動杵子。";
              resumeTeaAnimation();
              startGame();
            } else {
              status.textContent = "請保持握拳以確認開始";
              feedback.textContent = `確認中 ${remaining.toFixed(1)} 秒`;
            }
          } else {
            fistHoldStartedAt = null;
            status.textContent = "偵測到手掌，請握拳並保持 1.2 秒開始";
            feedback.textContent = "握拳確認後才會開始遊戲";
          }
          requestAnimationFrame(detectHands);
          return;
        }

        // Average wrist and palm-base landmarks to reduce fingertip jitter.
        const palmX =
          [0, 5, 9, 13, 17].reduce(
            (sum, index) => sum + landmarks[index].x,
            0,
          ) / 5;
        const palmY =
          [0, 5, 9, 13, 17].reduce(
            (sum, index) => sum + landmarks[index].y,
            0,
          ) / 5;
        const target = mapHandToStage(palmX, palmY);
        handX = handX === null ? target.x : handX * 0.72 + target.x * 0.28;
        handY = handY === null ? target.y : handY * 0.72 + target.y * 0.28;
        pestle.style.left = `${handX}px`;
        pestle.style.top = `${handY}px`;
        status.textContent = "已偵測手掌，左右移動控制杵子";
      } else {
        handX = null;
        handY = null;
        if (!gameHasStarted) {
          fistHoldStartedAt = null;
          status.textContent = "請將一隻手掌放進鏡頭畫面，再握拳確認開始";
          feedback.textContent = "等待握拳確認";
        } else {
          status.textContent = "請將一隻手掌放進鏡頭畫面";
        }
      }
    } catch (error) {
      status.textContent = `手部偵測失敗：${error.message}`;
      console.error("Hand tracking failed.", error);
    }
  }
  requestAnimationFrame(detectHands);
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("請使用 HTTPS 或 localhost 開啟，並允許鏡頭權限。");
  }
  await pauseTeaAnimation();
  status.textContent = "正在請求鏡頭權限…";
  cameraStream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: "user",
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  });
  video.srcObject = cameraStream;
  await video.play();

  status.textContent = "正在載入手部偵測…";
  const { FilesetResolver, HandLandmarker } = await import(VISION_MODULE_URL);
  const vision = await FilesetResolver.forVisionTasks(VISION_WASM_URL);
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: HAND_MODEL_URL },
    runningMode: "VIDEO",
    numHands: 1,
    minHandDetectionConfidence: 0.55,
    minHandPresenceConfidence: 0.55,
    minTrackingConfidence: 0.5,
  });
  status.textContent = "請握拳並保持 1.2 秒以開始遊戲";
  feedback.textContent = "確認期間牛和茶葉會保持不動";
  detectHands();
}

function cleanup() {
  cancelAnimationFrame(animationId);
  if (cameraStream)
    cameraStream.getTracks().forEach((cameraTrack) => cameraTrack.stop());
  handLandmarker?.close();
}

window.addEventListener("pagehide", cleanup);
renderScore();
startCamera().catch((error) => {
  status.textContent =
    error.name === "NotAllowedError"
      ? "鏡頭權限遭拒，請允許鏡頭後重新整理。"
      : `無法啟動鏡頭：${error.message}`;
  feedback.textContent = "請確認鏡頭權限後重新整理";
  console.error("Camera hand tracking could not start.", error);
});
