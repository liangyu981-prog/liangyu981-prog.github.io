const VISION_MODULE_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/vision_bundle.mjs";
const VISION_WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm";
const HAND_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

const stage = document.getElementById("gameStage");
const video = document.getElementById("cameraFeed");
const status = document.getElementById("cameraStatus");
const track = document.getElementById("track");
const cow = document.getElementById("cow");
const cowGuide = document.getElementById("cowGuide");
const pestle = document.getElementById("pestle");
const scoreDisplay = document.getElementById("score");
const timerDisplay = document.getElementById("timer");
const feedback = document.getElementById("feedback");
const result = document.getElementById("result");
const finalScore = document.getElementById("finalScore");
const restart = document.getElementById("restart");

const durationSeconds = 15;
const minScore = 10;
const maxScore = 25;
const followDistance = 150;
let score = minScore;
let secondsLeft = durationSeconds;
let handX = null;
let handY = null;
let markerX = 0;
let direction = 1;
let lastFrame = 0;
let lastVideoTime = -1;
let running = false;
let handLandmarker;
let cameraStream;
let animationId;
let timerId;
let scoreId;

function renderScore() {
  scoreDisplay.textContent = `分數：${score}`;
}

function animateMarker(now) {
  if (!running) return;
  if (lastFrame) {
    const elapsed = Math.min((now - lastFrame) / 1000, 0.05);
    const maxX = Math.max(0, track.clientWidth - cow.clientWidth);
    markerX += direction * 430 * elapsed;
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
  const targetX = (trackBounds.left - stageBounds.left) / scaleX + markerX + cow.clientWidth / 2;
  const onTarget = handX !== null && Math.abs(handX - targetX) <= followDistance;
  score = Math.max(minScore, Math.min(maxScore, score + (onTarget ? 1 : -1)));
  renderScore();
  feedback.textContent = handX === null
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
  timerDisplay.textContent = "時間到！";
  feedback.textContent = "遊戲結束";
  finalScore.textContent = `你的分數：${score} 分`;
  result.hidden = false;
  restart.focus();
}

function startGame() {
  score = minScore;
  secondsLeft = durationSeconds;
  handX = null;
  handY = null;
  markerX = 0;
  direction = 1;
  lastFrame = 0;
  running = true;
  result.hidden = true;
  renderScore();
  timerDisplay.textContent = `剩餘時間：${secondsLeft} 秒`;
  cow.style.left = "0px";
  cow.style.transform = "scaleX(-1)";
  cowGuide.style.left = `${cow.clientWidth / 2}px`;
  animationId = requestAnimationFrame(animateMarker);
  timerId = setInterval(() => {
    secondsLeft -= 1;
    timerDisplay.textContent = `剩餘時間：${secondsLeft} 秒`;
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
  const cameraX = Math.min(1, Math.max(0, (1 - sourceX - (1 - visibleWidth) / 2) / visibleWidth));
  const screenX = cameraBounds.left + cameraX * cameraBounds.width;
  const stageBounds = stage.getBoundingClientRect();
  const scaleX = stageBounds.width / 1920;
  const scaleY = stageBounds.height / 1080;
  // The preview mirrors the image horizontally, not vertically.
  const cameraY = Math.min(1, Math.max(0, (sourceY - (1 - visibleHeight) / 2) / visibleHeight));
  const screenY = cameraBounds.top + cameraY * cameraBounds.height;
  return {
    x: Math.min(1920, Math.max(0, (screenX - stageBounds.left) / scaleX)),
    y: Math.min(1080, Math.max(0, (screenY - stageBounds.top) / scaleY)),
  };
}

function detectHands() {
  if (!handLandmarker) return;
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    try {
      const detection = handLandmarker.detectForVideo(video, performance.now());
      const landmarks = detection.landmarks?.[0];
      if (landmarks) {
        // Average wrist and palm-base landmarks to reduce fingertip jitter.
        const palmX = [0, 5, 9, 13, 17].reduce((sum, index) => sum + landmarks[index].x, 0) / 5;
        const palmY = [0, 5, 9, 13, 17].reduce((sum, index) => sum + landmarks[index].y, 0) / 5;
        const target = mapHandToStage(palmX, palmY);
        handX = handX === null ? target.x : handX * 0.72 + target.x * 0.28;
        handY = handY === null ? target.y : handY * 0.72 + target.y * 0.28;
        pestle.style.left = `${handX}px`;
        pestle.style.top = `${handY}px`;
        status.textContent = "已偵測手掌，左右移動控制杵子";
      } else {
        handX = null;
        handY = null;
        status.textContent = "請將一隻手掌放進鏡頭畫面";
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
  status.textContent = "正在請求鏡頭權限…";
  cameraStream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
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
  status.textContent = "請將一隻手掌放進鏡頭畫面";
  startGame();
  detectHands();
}

function cleanup() {
  cancelAnimationFrame(animationId);
  if (cameraStream) cameraStream.getTracks().forEach((cameraTrack) => cameraTrack.stop());
  handLandmarker?.close();
}

restart.addEventListener("click", startGame);
window.addEventListener("pagehide", cleanup);
renderScore();
startCamera().catch((error) => {
  status.textContent = error.name === "NotAllowedError"
    ? "鏡頭權限遭拒，請允許鏡頭後重新整理。"
    : `無法啟動鏡頭：${error.message}`;
  feedback.textContent = "請確認鏡頭權限後重新整理";
  console.error("Camera hand tracking could not start.", error);
});
