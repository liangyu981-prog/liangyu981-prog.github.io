const MEDIA_PIPE_MODULE_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/vision_bundle.mjs";
const MEDIA_PIPE_WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm";
const FACE_LANDMARKER_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const SCORE_STORAGE_PARAM = "score";
const DIRECTION_NAMES = { up: "上", down: "下", left: "左", right: "右" };

const video = document.getElementById("camera_preview");
const statusMessage = document.getElementById("camera_status");
const scoreDisplay = document.getElementById("score_display");
const background = document.querySelector(".camera_game_background");
const stopBackgroundImage = new Image();
const correctDirection = background.dataset.correctDirection;
const nextPage = background.dataset.nextPage;
const scoreParam = new URLSearchParams(window.location.search).get(SCORE_STORAGE_PARAM);
const parsedScore = Number(scoreParam);
let score = scoreParam !== null && Number.isFinite(parsedScore) ? parsedScore : 0;
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

stopBackgroundImage.src = background.dataset.stopImage;

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

function completeWithDirection(direction) {
  if (transitionStarted) {
    return;
  }
  transitionStarted = true;

  const earnedPoints = direction === correctDirection ? 8 : 0;
  score += earnedPoints;
  if (scoreDisplay) {
    scoreDisplay.textContent = `本次得分：${earnedPoints} 分｜累計積分：${score} 分`;
  }

  closeFaceLandmarker();
  statusMessage.textContent = `偵測到頭部向${DIRECTION_NAMES[direction]}。`;

  stopBackgroundImage
    .decode()
    .then(() => {
      const currentImage = background.querySelector("img");
      stopBackgroundImage.alt = currentImage.alt;
      background.replaceChild(stopBackgroundImage, currentImage);

      setTimeout(() => {
        stopCamera();
        window.location.href = `${nextPage}?${SCORE_STORAGE_PARAM}=${score}`;
      }, 2000);
    })
    .catch(showError);
}

function processFrame() {
  if (transitionStarted || !faceLandmarker) {
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
      statusMessage.textContent = neutralPose
        ? "未偵測到人臉，請回到鏡頭畫面中央。"
        : "請將臉放在鏡頭畫面中央，並正面看鏡頭校準。";
    } else {
      const pose = getHeadPose(landmarks);
      if (!pose) {
        candidateDirection = undefined;
        candidateFrames = 0;
      } else if (!neutralPose) {
        if (calibrationStartedAt === undefined) {
          calibrationStartedAt = performance.now();
        }
        calibrationSamples.push(pose);

        if (performance.now() - calibrationStartedAt >= 1000 && calibrationSamples.length >= 10) {
          neutralPose = averagePose(calibrationSamples);
          statusMessage.textContent = "校準完成，請向上、下、左或右轉頭。";
        } else {
          statusMessage.textContent = "請正面看鏡頭，保持不動。";
        }
      } else {
        const direction = classifyDirection(pose);
        if (!direction) {
          candidateDirection = undefined;
          candidateFrames = 0;
          statusMessage.textContent = "請向上、下、左或右轉頭。";
        } else if (direction === candidateDirection) {
          candidateFrames += 1;
          if (candidateFrames >= 5) {
            completeWithDirection(direction);
          }
        } else {
          candidateDirection = direction;
          candidateFrames = 1;
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
