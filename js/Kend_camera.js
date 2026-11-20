document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("cameraModal");
  const video = document.getElementById("cameraVideo");
  const canvas = document.getElementById("photoCanvas");
  const frame = document.querySelector(".camera_frame");
  const guide = document.querySelector(".face_guide");
  const shutter = document.getElementById("shutterButton");
  const countdown = document.getElementById("countdown");
  const status = document.getElementById("cameraStatus");
  const nameForm = document.getElementById("nameForm");
  const nameInput = document.getElementById("playerName");
  const signInSound = new Audio("./audio/sign_in.mp3");
  signInSound.preload = "auto";
  const cameraSound = new Audio("./audio/canmera_sound.mp3");
  cameraSound.preload = "auto";

  if (
    !modal ||
    !video ||
    !canvas ||
    !frame ||
    !guide ||
    !shutter ||
    !countdown ||
    !status ||
    !nameForm ||
    !nameInput
  )
    return;

  let cameraStream;
  let faceDetector;
  let gestureRecognizer;
  let loadingDetectors;
  let detectionFrame = 0;
  let lastVideoTime = -1;
  let lastDetectionAt = 0;
  let centeredFrames = 0;
  let victoryFrames = 0;
  let faceIsAligned = false;
  let autoCaptureStarted = false;
  let captureInProgress = false;
  let capturedPhoto = false;

  document.querySelectorAll(".make-link").forEach((makeLink) => {
    makeLink.addEventListener("click", (event) => {
      event.preventDefault();
      localStorage.setItem("cameraReturnHref", makeLink.href);
      openCamera();
    });
  });

  async function openCamera() {
    if (cameraStream || modal.hidden === false) return;
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    shutter.disabled = true;

    if (!navigator.mediaDevices?.getUserMedia) {
      status.textContent = "此瀏覽器無法使用鏡頭，請改用支援相機的瀏覽器。";
      return;
    }

    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 840 },
        },
      });
      video.srcObject = cameraStream;
      await video.play();
      status.textContent = "正在載入臉部偵測…";
      await loadDetectors();
    } catch (error) {
      status.textContent =
        error.name === "NotAllowedError"
          ? "需要允許使用鏡頭，才能拍照。"
          : "無法啟動鏡頭，請確認裝置有可用的相機。";
    }
  }

  async function loadDetectors() {
    if (loadingDetectors) return loadingDetectors;
    loadingDetectors = (async () => {
      try {
        const { FilesetResolver, FaceDetector, GestureRecognizer } =
          await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/+esm");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
        );
        faceDetector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          minDetectionConfidence: 0.55,
        });

        try {
          gestureRecognizer = await GestureRecognizer.createFromOptions(
            vision,
            {
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
            },
          );
        } catch (error) {
          console.error("Gesture recognition could not be loaded:", error);
          status.textContent = "手勢偵測載入失敗，仍可使用拍照鍵";
        }

        if (!gestureRecognizer) shutter.disabled = false;
        detectionLoop();
      } catch (error) {
        console.error("Face detection could not be loaded:", error);
        guide.classList.remove("is_aligned");
        status.textContent = "臉部偵測載入失敗，可直接手動拍照";
        shutter.disabled = false;
      }
    })();
    return loadingDetectors;
  }

  function detectionLoop() {
    if (!faceDetector || video.hidden || !video.srcObject || capturedPhoto)
      return;

    const now = performance.now();
    if (
      video.readyState >= 2 &&
      video.currentTime !== lastVideoTime &&
      now - lastDetectionAt >= 100
    ) {
      lastVideoTime = video.currentTime;
      lastDetectionAt = now;
      try {
        const detections = faceDetector.detectForVideo(video, now).detections;
        updateFacePosition(detections[0]?.boundingBox);
        if (gestureRecognizer) {
          const result = gestureRecognizer.recognizeForVideo(video, now);
          updateVictoryGesture(result.gestures);
        }
      } catch (error) {
        console.error("Camera detection failed:", error);
        status.textContent = "偵測暫時無法使用，可直接手動拍照";
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
      status.textContent = "臉呢？";
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
    const mirroredCenterX = video.videoWidth - (box.originX + box.width / 2);
    const unzoomedX = mirroredCenterX * scale - cropX;
    const unzoomedY = (box.originY + box.height / 2) * scale - cropY;
    const centerX = (unzoomedX - previewWidth / 2) * zoom + previewWidth / 2;
    const centerY = (unzoomedY - previewHeight / 2) * zoom + previewHeight / 2;
    const distanceFromCenter = Math.hypot(
      centerX - previewWidth / 2,
      centerY - previewHeight / 2,
    );
    const faceWidth = box.width * scale * zoom;
    const faceIsLargeEnough = faceWidth >= previewWidth * 0.2;
    const faceFitsGuide = faceWidth <= previewWidth * 0.7;
    const isCentered =
      distanceFromCenter <= previewWidth * 0.16 &&
      faceIsLargeEnough &&
      faceFitsGuide;

    centeredFrames = isCentered ? centeredFrames + 1 : 0;
    const ready = centeredFrames >= 3;
    faceIsAligned = ready;
    guide.classList.toggle("is_aligned", ready);
    shutter.disabled = gestureRecognizer ? !ready : false;

    if (victoryFrames >= 3) {
      status.textContent = ready
        ? "偵測到比耶，三秒後自動拍照！"
        : "偵測到比耶，請先把臉對準圓框";
    } else {
      status.textContent = ready
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

  shutter.addEventListener("click", async () => {
    if (shutter.disabled || !video.videoWidth || captureInProgress) return;
    captureInProgress = true;
    shutter.disabled = true;
    status.textContent = "準備拍照…";
    countdown.hidden = false;
    for (let number = 3; number > 0; number -= 1) {
      countdown.textContent = String(number);
      await new Promise((resolve) => window.setTimeout(resolve, 1000));
    }

    countdown.textContent = "📸";
    cameraSound.currentTime = 0;
    cameraSound.play().catch((error) => {
      console.error("Failed to play camera shutter sound:", error);
    });
    const zoom =
      Number.parseFloat(
        getComputedStyle(video).getPropertyValue("--camera-zoom"),
      ) || 1;
    const cropSize = Math.min(video.videoWidth, video.videoHeight) / zoom;
    const cropX = (video.videoWidth - cropSize) / 2;
    const cropY = (video.videoHeight - cropSize) / 2;
    canvas.width = 1024;
    canvas.height = 1024;
    const context = canvas.getContext("2d");
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(
      video,
      cropX,
      cropY,
      cropSize,
      cropSize,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    capturedPhoto = true;
    cancelAnimationFrame(detectionFrame);
    faceDetector?.close();
    gestureRecognizer?.close();
    video.hidden = true;
    canvas.hidden = false;
    countdown.hidden = true;
    status.textContent = "拍攝完成";
    nameForm.hidden = false;
    nameInput.focus();
  });

  nameForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const playerName = nameInput.value.trim();
    if (playerName === "黃偉綸") {
      window.alert("這個名字不是你能使用的，請重新輸入！");
      nameInput.focus();
      nameInput.select();
      return;
    }
    if (playerName === "周新婷") {
      window.alert("你觸犯了零食大總統的權威，請重新輸入！");
      nameInput.focus();
      nameInput.select();
      return;
    }
    if (playerName === "張良瑀") {
      window.alert("你在干擾我的生活，請重新輸入！");
      nameInput.focus();
      nameInput.select();
      return;
    }
    if (playerName === "陳湘穎") {
      window.alert("你叉叉，請重新輸入！");
      nameInput.focus();
      nameInput.select();
      return;
    }
    if (playerName === "林昱萱") {
      window.alert("你黑眼豆豆，請重新輸入！");
      nameInput.focus();
      nameInput.select();
      return;
    }
    if (playerName === "聶永真") {
      window.alert("耳耳耳，耳耳耳耳耳！");
      nameInput.focus();
      nameInput.select();
      return;
    }

    localStorage.setItem("playerName", playerName);
    localStorage.setItem("playerPhoto", canvas.toDataURL("image/jpeg", 0.88));
    const nextPage = localStorage.getItem("cameraReturnHref") || "./0_8_1.html";
    localStorage.removeItem("cameraReturnHref");

    nameForm.querySelector('button[type="submit"]').disabled = true;
    cameraStream?.getTracks().forEach((track) => track.stop());
    cameraStream = null;

    let navigationStarted = false;
    const continueToNextPage = () => {
      if (navigationStarted) return;
      navigationStarted = true;
      window.location.href = nextPage;
    };
    const soundTimeout = window.setTimeout(continueToNextPage, 2500);
    signInSound.addEventListener(
      "ended",
      () => {
        window.clearTimeout(soundTimeout);
        continueToNextPage();
      },
      { once: true },
    );
    signInSound.currentTime = 0;
    signInSound.play().catch(() => {
      window.clearTimeout(soundTimeout);
      continueToNextPage();
    });
  });

  window.addEventListener("pagehide", () => {
    cameraStream?.getTracks().forEach((track) => track.stop());
    faceDetector?.close();
    gestureRecognizer?.close();
  });
});
