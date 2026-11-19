document.addEventListener("DOMContentLoaded", async () => {
  const stage = document.querySelector(".camera_mode");
  const video = document.getElementById("cameraVideo");
  const status = document.getElementById("cameraStatus");
  if (!stage || !(video instanceof HTMLVideoElement) || !status) return;

  let stream;
  let hand_landmarker;
  let animation_frame = 0;
  let last_detection_time = -Infinity;
  let smoothed_x = null;
  let smoothed_y = null;

  const show_error = (error) => {
    console.error("[Devel4 camera] 鏡頭或手部偵測啟動失敗。", error);
    stage.classList.add("camera_unavailable");
    status.textContent =
      "鏡頭或手部偵測無法啟動；請確認鏡頭權限與網路連線，或直接拖曳瓶子遊玩。";
    stage.dispatchEvent(new Event("cameraerror"));
  };

  const stop_camera = () => {
    cancelAnimationFrame(animation_frame);
    if (hand_landmarker) hand_landmarker.close();
    if (stream) stream.getTracks().forEach((track) => track.stop());
  };

  window.addEventListener("pagehide", stop_camera, { once: true });

  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("此瀏覽器或連線環境不支援鏡頭存取。");
    }

    // 鏡頭影格只在瀏覽器本機辨識；模型與推論函式庫首次使用時由網路載入。
    const { FilesetResolver, HandLandmarker } = await import(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs"
    );
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
    video.srcObject = stream;
    await video.play();

    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
    );
    hand_landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      },
      runningMode: "VIDEO",
      numHands: 1,
    });

    status.textContent = "鏡頭已啟動，請將手放入畫面並上下左右移動。";
    stage.dispatchEvent(new Event("cameraready"));

    const detect_hand = (now) => {
      try {
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && now - last_detection_time >= 33) {
          last_detection_time = now;
          const result = hand_landmarker.detectForVideo(video, now);
          const hand = result.landmarks[0];
          if (hand) {
            const target_x = (1 - hand[9].x) * 1920;
            const target_y = hand[9].y * 1080;
            smoothed_x =
              smoothed_x === null ? target_x : smoothed_x * 0.7 + target_x * 0.3;
            smoothed_y =
              smoothed_y === null ? target_y : smoothed_y * 0.7 + target_y * 0.3;
            const bottle = document.getElementById("bottle");
            const bottle_width = bottle ? bottle.offsetWidth : 390;
            const bottle_height = bottle ? bottle.offsetHeight : 430;
            stage.dispatchEvent(
              new CustomEvent("bottlecontrolmove", {
                detail: {
                  x: smoothed_x - bottle_width / 2,
                  y: smoothed_y - bottle_height / 2,
                },
              }),
            );
          }
        }
      } catch (error) {
        stop_camera();
        show_error(error);
        return;
      }
      animation_frame = requestAnimationFrame(detect_hand);
    };

    animation_frame = requestAnimationFrame(detect_hand);
  } catch (error) {
    stop_camera();
    show_error(error);
  }
});
