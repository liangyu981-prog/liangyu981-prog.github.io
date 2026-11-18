document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("cameraModal");
  const stage = document.querySelector(".game_stage");
  const endingAnimation = document.querySelector(".end_animation");
  const video = document.getElementById("cameraVideo");
  const canvas = document.getElementById("photoCanvas");
  const shutter = document.getElementById("shutterButton");
  const countdown = document.getElementById("countdown");
  const status = document.getElementById("cameraStatus");
  const nameForm = document.getElementById("nameForm");
  const nameInput = document.getElementById("playerName");
  if (
    !modal ||
    !video ||
    !canvas ||
    !shutter ||
    !countdown ||
    !status ||
    !nameForm ||
    !nameInput
  )
    return;
  let cameraStream;

  // The GIF loops forever, so measure one full cycle from its frame delays and
  // stop showing it at the end of its first complete pass.
  const getGifCycleDuration = async () => {
    try {
      const response = await fetch("./img/end_animation.gif");
      if (!response.ok) throw new Error("GIF unavailable");
      const bytes = new Uint8Array(await response.arrayBuffer());
      let duration = 0;
      for (let index = 0; index + 7 < bytes.length; index += 1) {
        if (
          bytes[index] === 0x21 &&
          bytes[index + 1] === 0xf9 &&
          bytes[index + 2] === 0x04
        ) {
          duration += (bytes[index + 4] | (bytes[index + 5] << 8)) * 10;
          index += 7;
        }
      }
      return duration || 12690;
    } catch {
      return 12690;
    }
  };

  const openCamera = async () => {
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
      window.cameraVideoReady = true;
      window.dispatchEvent(new Event("camera-video-ready"));
    } catch (error) {
      status.textContent =
        error.name === "NotAllowedError"
          ? "需要允許使用鏡頭，才能拍照。"
          : "無法啟動鏡頭，請確認裝置有可用的相機。";
    }
  };

  if (endingAnimation) {
    const animationStartedAt = performance.now();
    getGifCycleDuration().then((duration) =>
      window.setTimeout(
        () => {
          endingAnimation.hidden = true;
          stage?.classList.add("animation-ended");
          openCamera();
        },
        Math.max(0, duration - (performance.now() - animationStartedAt)),
      ),
    );
  } else {
    document.querySelectorAll(".make-link").forEach((makeLink) => {
      makeLink.addEventListener("click", (event) => {
        event.preventDefault();
        localStorage.setItem("cameraReturnHref", makeLink.href);
        openCamera();
      });
    });
  }

  shutter.addEventListener("click", async () => {
    if (shutter.disabled || !video.videoWidth) return;
    shutter.disabled = true;
    status.textContent = "準備拍照…";
    countdown.hidden = false;
    for (let number = 3; number > 0; number -= 1) {
      countdown.textContent = String(number);
      await new Promise((resolve) => window.setTimeout(resolve, 1000));
    }
    countdown.textContent = "📸";
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
    window.dispatchEvent(new Event("camera-photo-taken"));
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
    localStorage.setItem("playerName", playerName);
    // Keep the captured image available for the next screen in this browser session.
    localStorage.setItem("playerPhoto", canvas.toDataURL("image/jpeg", 0.88));
    const nextPage = localStorage.getItem("cameraReturnHref") || "./0_8_1.html";
    localStorage.removeItem("cameraReturnHref");
    window.location.href = nextPage;
  });

  window.addEventListener("pagehide", () => {
    cameraStream?.getTracks().forEach((track) => track.stop());
  });
});
