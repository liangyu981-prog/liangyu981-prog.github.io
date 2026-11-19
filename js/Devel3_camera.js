document.addEventListener("DOMContentLoaded", async () => {
  const stage = document.querySelector(".camera_mode");
  const video = document.getElementById("cameraVideo");
  const status = document.getElementById("cameraStatus");
  if (!stage || !(video instanceof HTMLVideoElement) || !status) return;

  let stream;
  let hand_landmarker;
  let animation_frame = 0;
  let last_detection_time = -Infinity;
  let open_frames = 0;
  let fist_frames = 0;
  let gesture_armed = false;
  let stop_triggered = false;

  const show_error = (error) => {
    console.error("[Devel3 camera] 鏡頭或手部偵測啟動失敗。", error);
    stage.classList.add("camera_unavailable");
    status.textContent =
      "鏡頭或手部偵測無法啟動；請確認鏡頭權限與網路連線，或按下停止按鈕遊玩。";
  };

  const stop_camera = () => {
    cancelAnimationFrame(animation_frame);
    if (hand_landmarker) hand_landmarker.close();
    if (stream) stream.getTracks().forEach((track) => track.stop());
  };

  const distance_from_wrist = (hand, landmark_index) => {
    const wrist = hand[0];
    const landmark = hand[landmark_index];
    return Math.hypot(landmark.x - wrist.x, landmark.y - wrist.y);
  };

  const count_extended_fingers = (hand) => {
    // 以指尖距離手腕是否明顯長於指節，辨識四根手指伸直；略過較容易誤判的拇指。
    const fingers = [
      { tip: 8, pip: 6 },
      { tip: 12, pip: 10 },
      { tip: 16, pip: 14 },
      { tip: 20, pip: 18 },
    ];
    return fingers.reduce((count, finger) => {
      const tip_distance = distance_from_wrist(hand, finger.tip);
      const pip_distance = distance_from_wrist(hand, finger.pip);
      return count + (tip_distance > pip_distance * 1.15 ? 1 : 0);
    }, 0);
  };

  window.addEventListener(
    "pagehide",
    () => {
      stop_camera();
    },
    { once: true },
  );
  stage.addEventListener("gamestopped", stop_camera, { once: true });

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

    status.textContent = "鏡頭已啟動，請先張開手掌，再握拳停止。";

    const detect_hand = (now) => {
      try {
        if (
          video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
          now - last_detection_time >= 33
        ) {
          last_detection_time = now;
          const result = hand_landmarker.detectForVideo(video, now);
          const hand = result.landmarks[0];
          if (hand) {
            const extended_fingers = count_extended_fingers(hand);
            if (extended_fingers >= 3) {
              open_frames += 1;
              fist_frames = 0;
              if (!gesture_armed && open_frames >= 3) {
                gesture_armed = true;
                status.textContent = "手掌已張開，握拳即可停止。";
              }
            } else if (extended_fingers <= 1) {
              open_frames = 0;
              if (gesture_armed) {
                fist_frames += 1;
                if (fist_frames >= 4 && !stop_triggered) {
                  stop_triggered = true;
                  status.textContent = "偵測到握拳，正在結算……";
                  stage.dispatchEvent(new Event("handfist"));
                }
              }
            } else {
              open_frames = 0;
              fist_frames = 0;
            }
          } else {
            open_frames = 0;
            fist_frames = 0;
          }
        }
      } catch (error) {
        stop_camera();
        show_error(error);
        return;
      }
      if (!stop_triggered) animation_frame = requestAnimationFrame(detect_hand);
    };

    animation_frame = requestAnimationFrame(detect_hand);
  } catch (error) {
    stop_camera();
    show_error(error);
  }
});
