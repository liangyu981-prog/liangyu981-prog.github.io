(() => {
  const modal = document.getElementById("cameraModal");
  const panel = modal?.querySelector(".camera_panel");
  const card = document.getElementById("characterCard");
  const frame = document.getElementById("cameraFrame");
  let carouselWindow = document.getElementById("carouselWindow");
  let previewPrev = document.getElementById("previewPrev");
  let previewNext = document.getElementById("previewNext");
  const shutter = document.getElementById("shutterButton");
  const title = document.getElementById("modalTitle");
  const arrows = [...document.querySelectorAll(".selector-arrow")];
  if (
    !modal ||
    !panel ||
    !card ||
    !frame ||
    !carouselWindow ||
    !previewPrev ||
    !previewNext ||
    !shutter
  )
    return;

  const options = [
    { id: "play1", image: "./img/play1.gif" },
    { id: "play2", image: "./img/play2.PNG" },
    { id: "play3", image: "./img/play3.PNG" },
    { id: "play4", image: "./img/play4.PNG" },
    { id: "camera", image: "" },
  ];
  const gameHref = location.pathname.endsWith("0_1_1.html")
    ? "./1_2.html"
    : "./0_2.html";
  const turnSound = new Audio("./audio/turn_page.mp3");
  let index = 0;
  let transitioning = false;
  let transitionTimer;
  const preloadedImages = new Map();

  function slideDurationMs() {
    const value = getComputedStyle(document.querySelector(".selector-stage"))
      .getPropertyValue("--carousel-slide-duration")
      .trim();
    const amount = Number.parseFloat(value) || 350;
    return value.endsWith("s") && !value.endsWith("ms")
      ? amount * 1000
      : amount;
  }

  function imageMarkup(option) {
    return option.image
      ? `<span class="card-art"><img src="${option.image}" alt="" decoding="async" fetchpriority="high"></span>`
      : "";
  }

  function preloadImage(option) {
    if (!option.image || preloadedImages.has(option.image)) return;
    const visibleImage = [...document.images].find(
      (image) => image.getAttribute("src") === option.image,
    );
    if (visibleImage) {
      preloadedImages.set(option.image, visibleImage);
      if (typeof visibleImage.decode === "function") {
        visibleImage.decode().catch(() => {});
      }
      return;
    }
    const image = new Image();
    image.decoding = "async";
    image.src = option.image;
    if (typeof image.decode === "function") image.decode().catch(() => {});
    preloadedImages.set(option.image, image);
  }

  function scheduleBackgroundPreload() {
    const preloadRemaining = () => {
      options.forEach((option) => preloadImage(option));
    };
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(preloadRemaining, { timeout: 1800 });
    } else {
      window.setTimeout(preloadRemaining, 300);
    }
  }

  function updatePreviews() {
    renderPreview(
      "previewPrev",
      options[(index - 1 + options.length) % options.length],
      "previous",
    );
    renderPreview("previewNext", options[(index + 1) % options.length], "next");
  }

  function renderPreview(id, option, direction) {
    const preview = document.getElementById(id);
    if (!preview) return;
    if (preview.dataset.id === option.id) return;
    preview.className = `character-card-preview preview-${direction} character-card-${option.id}`;
    preview.dataset.id = option.id;
    preview.innerHTML = imageMarkup(option);
  }

  function render(startCamera = true) {
    const option = options[index];
    const cameraMode = option.id === "camera";
    card.className = `character-card character-card-${option.id}`;
    card.setAttribute("aria-label", cameraMode ? "相機預覽" : "目前角色");
    card.innerHTML = imageMarkup(option);
    card.style.transform = "translateX(0)";
    card.style.zIndex = "";
    frame.style.transform = "translateX(0)";
    frame.style.zIndex = "";
    card.hidden = cameraMode;
    frame.hidden = !cameraMode;
    title.textContent = cameraMode ? "▼一位蛋餅大師的誕生...▼" : "▼選擇角色▼";
    if (!cameraMode) shutter.disabled = false;
    updatePreviews();
    if (cameraMode) {
      sessionStorage.setItem("selectedCharacter", "camera");
      if (startCamera && !modal.hidden)
        window.dispatchEvent(new Event("start-selected-camera"));
    } else {
      window.dispatchEvent(new Event("pause-selected-camera"));
    }
  }

  function moveContainerTo(
    container,
    targetCenterX,
    targetWidth,
    targetHeight,
  ) {
    const rect = container.getBoundingClientRect();
    const scale = Math.min(
      targetWidth / container.offsetWidth,
      targetHeight / container.offsetHeight,
    );
    container.style.transform = `translate3d(${targetCenterX - (rect.left + rect.width / 2)}px, 0, 0) scale3d(${scale}, ${scale}, 1)`;
  }

  function transitionTo(nextIndex, direction, arrow) {
    if (transitioning || panel.classList.contains("is-name-entry")) return;
    transitioning = true;
    arrows.forEach((button) => {
      button.disabled = true;
    });
    shutter.disabled = true;

    const targetIndex = (nextIndex + options.length) % options.length;
    const newOption = options[targetIndex];
    const newIsCamera = newOption.id === "camera";
    const movingLeft = direction > 0;
    const incomingPreview = movingLeft ? previewNext : previewPrev;
    const outgoingPreview = movingLeft ? previewPrev : previewNext;
    const arrowImage = arrow.querySelector("img");
    turnSound.currentTime = 0;
    turnSound.play().catch(() => {});
    arrowImage.src = "./img/turn_button_active.png";

    const stageRect = document
      .querySelector(".selector-stage")
      .getBoundingClientRect();
    const windowRect = carouselWindow.getBoundingClientRect();
    const centerX = windowRect.left + windowRect.width / 2;
    const sidePreview = movingLeft ? previewPrev : previewNext;
    const sideRect = sidePreview.getBoundingClientRect();
    const sideCenterX = sideRect.left + sideRect.width / 2;
    const previewWidth = sideRect.width;
    const previewHeight = sideRect.height;
    const windowWidth = carouselWindow.offsetWidth;
    const windowHeight = carouselWindow.offsetHeight;

    incomingPreview.style.zIndex = "4";
    if (newIsCamera) window.dispatchEvent(new Event("start-selected-camera"));

    let finished = false;
    const transitionTargets = [
      carouselWindow,
      incomingPreview,
      outgoingPreview,
    ];
    const movingContainers = new Set(transitionTargets);
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(transitionTimer);
      transitionTargets.forEach((container) => {
        container.removeEventListener("transitionend", onTransitionEnd);
      });
      const oldWindow = carouselWindow;
      const promotedPreview = incomingPreview;
      const remainingPreview = outgoingPreview;
      const oldOption = options[index];
      const nextPreviewPrev = movingLeft ? oldWindow : remainingPreview;
      const nextPreviewNext = movingLeft ? remainingPreview : oldWindow;
      index = targetIndex;
      arrowImage.src = "./img/turn_button_default.png";
      const containers = [oldWindow, promotedPreview, remainingPreview];
      containers.forEach((container) => {
        container.style.transition = "none";
        container.style.transform = "";
        container.style.zIndex = "";
      });

      promotedPreview.innerHTML = "";
      promotedPreview.append(card, frame);
      oldWindow.id = movingLeft ? "previewPrev" : "previewNext";
      oldWindow.className = `character-card-preview ${movingLeft ? "preview-previous" : "preview-next"} character-card-${oldOption.id}`;
      remainingPreview.id = movingLeft ? "previewNext" : "previewPrev";
      remainingPreview.className = `character-card-preview ${movingLeft ? "preview-next" : "preview-previous"}`;
      promotedPreview.id = "carouselWindow";
      promotedPreview.className = "carousel-window";
      carouselWindow = promotedPreview;
      previewPrev = nextPreviewPrev;
      previewNext = nextPreviewNext;

      render(false);
      transitioning = false;
      void carouselWindow.offsetWidth;
      requestAnimationFrame(() => {
        containers.forEach((container) => {
          container.style.transition = "";
        });
      });
      arrows.forEach((button) => {
        button.disabled = false;
      });
    };
    const onTransitionEnd = (event) => {
      if (event.propertyName !== "transform") return;
      movingContainers.delete(event.target);
      if (movingContainers.size === 0) finish();
    };
    movingContainers.forEach((container) => {
      container.addEventListener("transitionend", onTransitionEnd);
    });
    // Wait for a full paint at the starting positions before applying the targets.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (finished) return;
        moveContainerTo(
          carouselWindow,
          sideCenterX,
          previewWidth,
          previewHeight,
        );
        moveContainerTo(incomingPreview, centerX, windowWidth, windowHeight);

        const outgoingRect = outgoingPreview.getBoundingClientRect();
        const exitCenterX = movingLeft
          ? stageRect.left - outgoingRect.width
          : stageRect.right + outgoingRect.width;
        moveContainerTo(
          outgoingPreview,
          exitCenterX,
          outgoingRect.width,
          outgoingRect.height,
        );
        // transitionend is the normal completion signal. Keep only a generous
        // watchdog for browsers that omit it; it must never cut off the slide.
        transitionTimer = window.setTimeout(
          finish,
          Math.max(slideDurationMs() * 2 + 500, 1500),
        );
      });
    });
  }

  document
    .getElementById("selectorPrev")
    ?.addEventListener("click", (event) => {
      transitionTo(index - 1, -1, event.currentTarget);
    });
  document
    .getElementById("selectorNext")
    ?.addEventListener("click", (event) => {
      transitionTo(index + 1, 1, event.currentTarget);
    });

  shutter.addEventListener("click", () => {
    if (transitioning || panel.classList.contains("is-name-entry")) return;
    const selected = options[index];
    if (selected.id === "camera") return; // Kend_camera.js handles the shutter.
    sessionStorage.setItem("selectedCharacter", selected.id);
    localStorage.setItem("cameraReturnHref", gameHref);
    window.dispatchEvent(new Event("start-character-name-entry"));
  });

  document.querySelectorAll(".make-link").forEach((link) =>
    link.addEventListener("click", (event) => {
      event.preventDefault();
      localStorage.setItem("cameraReturnHref", link.href);
      modal.hidden = false;
      modal.setAttribute("aria-hidden", "false");
      index = 0;
      render(false);
    }),
  );

  window.addEventListener("character-name-entry", () => {
    panel.classList.add("is-name-entry");
    arrows.forEach((button) => {
      button.disabled = true;
    });
    shutter.hidden = true;
  });
  window.addEventListener("start-character-name-entry", () => {
    panel.classList.add("is-name-entry");
    arrows.forEach((button) => {
      button.disabled = true;
    });
    shutter.hidden = true;
  });

  render(false);
  scheduleBackgroundPreload();
})();
