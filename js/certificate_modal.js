document.addEventListener("DOMContentLoaded", () => {
  const openButton = document.getElementById("certificateOpen");
  const modal = document.getElementById("certificateModal");
  const closeButton = document.getElementById("certificateClose");
  const certificateCard = document.getElementById("certificateCard");
  const certificateImage = document.getElementById("certificateResult");
  const certificateHat = document.getElementById("certificateHat");
  const certificateCharacterPhoto = document.getElementById(
    "certificateCharacterPhoto",
  );
  const certificateCharacterPhotoFrame = document.getElementById(
    "certificateCharacterPhotoFrame",
  );
  const certificateCharacterBase = document.getElementById(
    "certificateCharacterBase",
  );
  const certificatePlayerName = document.getElementById(
    "certificatePlayerName",
  );
  const message = document.getElementById("certificateMessage");
  const score = Number(localStorage.getItem("totalScore") || 0);
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  certificatePlayerName.textContent =
    localStorage.getItem("playerName") || "煎蛋高手";
  const selectedCharacter = sessionStorage.getItem("selectedCharacter");
  const playerPhoto =
    selectedCharacter === "camera" ? localStorage.getItem("playerPhoto") : null;
  const characterImages = {
    play1: "./img/certificate_play1.PNG",
    play2: "./img/certificate_play2.PNG",
    play3: "./img/certificate_play3.PNG",
    play4: "./img/certificate_play4.PNG",
  };
  if (characterImages[selectedCharacter]) {
    certificateCharacterBase.src = characterImages[selectedCharacter];
    certificateCharacterBase.classList.add("character_selected_art");
  }
  const portraitSource = playerPhoto;
  if (portraitSource) {
    if (playerPhoto) {
      certificateCharacterPhoto.addEventListener("load", applyFisheyeSphere, {
        once: true,
      });
    }
    certificateCharacterPhoto.src = portraitSource;
    certificateCharacterPhotoFrame.hidden = false;
  }

  function applyFisheyeSphere() {
    const size = 360;
    const source = document.createElement("canvas");
    source.width = size;
    source.height = size;
    const sourceContext = source.getContext("2d", { willReadFrequently: true });
    const cropSize = Math.min(
      certificateCharacterPhoto.naturalWidth,
      certificateCharacterPhoto.naturalHeight,
    );
    const cropX = (certificateCharacterPhoto.naturalWidth - cropSize) / 2;
    const cropY = (certificateCharacterPhoto.naturalHeight - cropSize) / 2;
    sourceContext.drawImage(
      certificateCharacterPhoto,
      cropX,
      cropY,
      cropSize,
      cropSize,
      0,
      0,
      size,
      size,
    );

    const sourcePixels = sourceContext.getImageData(0, 0, size, size);
    const output = document.createElement("canvas");
    output.width = size;
    output.height = size;
    const outputContext = output.getContext("2d");
    const result = outputContext.createImageData(size, size);
    const center = (size - 1) / 2;
    const radius = center;
    const faceDrop = radius * 0.18;

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const dx = (x - center) / radius;
        const dy = (y - center) / radius;
        const distance = Math.hypot(dx, dy);
        if (distance > 1) continue;

        const sphereRadius = (2 / Math.PI) * Math.asin(distance);
        const sourceRadius = Math.pow(sphereRadius, 1.3);
        const sampleX = center + (dx / (distance || 1)) * sourceRadius * radius;
        const sampleY =
          center + (dy / (distance || 1)) * sourceRadius * radius - faceDrop;
        const x0 = Math.floor(sampleX);
        const y0 = Math.floor(sampleY);
        const x1 = Math.min(size - 1, x0 + 1);
        const y1 = Math.min(size - 1, y0 + 1);
        const fx = sampleX - x0;
        const fy = sampleY - y0;
        const target = (y * size + x) * 4;

        for (let channel = 0; channel < 3; channel += 1) {
          const topLeft = sourcePixels.data[(y0 * size + x0) * 4 + channel];
          const topRight = sourcePixels.data[(y0 * size + x1) * 4 + channel];
          const bottomLeft = sourcePixels.data[(y1 * size + x0) * 4 + channel];
          const bottomRight = sourcePixels.data[(y1 * size + x1) * 4 + channel];
          const top = topLeft + (topRight - topLeft) * fx;
          const bottom = bottomLeft + (bottomRight - bottomLeft) * fx;
          result.data[target + channel] = top + (bottom - top) * fy;
        }
        result.data[target + 3] = 255;
      }
    }

    outputContext.putImageData(result, 0, 0);
    const edgeShade = outputContext.createRadialGradient(
      size * 0.39,
      size * 0.34,
      size * 0.08,
      center,
      center,
      size * 0.51,
    );
    edgeShade.addColorStop(0, "rgba(255,255,255,0.24)");
    edgeShade.addColorStop(0.58, "rgba(255,255,255,0)");
    edgeShade.addColorStop(0.82, "rgba(0,0,0,0.04)");
    edgeShade.addColorStop(1, "rgba(0,0,0,0.62)");
    outputContext.fillStyle = edgeShade;
    outputContext.fillRect(0, 0, size, size);

    try {
      certificateCharacterPhoto.src = output.toDataURL("image/png");
    } catch {
      // Keep the original portrait if the browser blocks canvas export.
    }
  }

  if (!reducedMotion) {
    certificateCard.addEventListener("pointermove", (event) => {
      if (event.pointerType !== "mouse") return;
      const bounds = certificateCard.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      certificateCard.style.setProperty("--certificate-tilt-x", `${-y * 8}deg`);
      certificateCard.style.setProperty("--certificate-tilt-y", `${x * 8}deg`);
      certificateCard.classList.add("is_tilting");

    });

    certificateCard.addEventListener("pointerleave", () => {
      certificateCard.style.setProperty("--certificate-tilt-x", "0deg");
      certificateCard.style.setProperty("--certificate-tilt-y", "0deg");
      certificateCard.classList.remove("is_tilting");
    });
  }

  if (score >= 80) {
    certificateImage.src = "./img/certificate_good.png";
    certificateImage.alt = "優秀證照";
    certificateHat.src = "./img/end_feedback_hat_good.png";
    certificateCard.classList.add("is_good");
    certificateCard.hidden = false;
  } else if (score >= 65) {
    certificateImage.src = "./img/certificate_normal.png";
    certificateImage.alt = "合格證照";
    certificateHat.src = "./img/end_feedback_hat_normal.png";
    certificateCard.classList.add("is_normal");
    certificateCard.hidden = false;
  } else if (score >= 30) {
    certificateImage.src = "./img/certificate_bad.png";
    certificateImage.alt = "待加強證照";
    certificateHat.src = "./img/end_feedback_hat_bad.png";
    certificateCard.classList.add("is_bad");
    certificateCard.hidden = false;
  } else {
    message.textContent = "重新鍛鍊廚藝再來吧";
    message.hidden = false;
  }

  certificateCard.addEventListener("pointerdown", async (event) => {
    if (!certificateCard.classList.contains("is_bad")) return;
    const bounds = certificateCard.getBoundingClientRect();
    const animation = document.createElement("img");
    animation.className = "certificate_throw_egg";
    animation.src = `./img/throw_egg.gif?play=${Date.now()}`;
    animation.alt = "";
    animation.style.width = `${20 + Math.random() * 25}%`;
    animation.style.left = `${((event.clientX - bounds.left) / bounds.width) * 100}%`;
    animation.style.top = `${((event.clientY - bounds.top) / bounds.height) * 100}%`;
    animation.addEventListener(
      "load",
      () => window.setTimeout(() => animation.remove(), 600),
      { once: true },
    );
    certificateCard.append(animation);
  });

  certificateCard.addEventListener("click", (event) => {
    if (
      event.detail === 0 ||
      !certificateCard.classList.contains("is_good")
    )
      return;
    const bounds = certificateCard.getBoundingClientRect();
    const burst = document.createElement("span");
    burst.className = "certificate_click_burst";
    burst.style.left = `${((event.clientX - bounds.left) / bounds.width) * 100}%`;
    burst.style.top = `${((event.clientY - bounds.top) / bounds.height) * 100}%`;
    burst.addEventListener("animationend", (animationEvent) => {
      if (animationEvent.target === burst) burst.remove();
    });
    certificateCard.append(burst);
  });

  function openModal() {
    modal.hidden = false;
    modal.classList.remove("is_open");
    requestAnimationFrame(() => modal.classList.add("is_open"));
    closeButton.focus();
  }

  function closeModal() {
    modal.hidden = true;
    modal.classList.remove("is_open");
    openButton.focus();
  }

  openButton.addEventListener("click", openModal);
  closeButton.addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) closeModal();
  });
});
