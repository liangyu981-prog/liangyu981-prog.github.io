let animation = document.querySelector("#animation");
let animationBuffer = document.querySelector("#animation-buffer");
const beginButton = document.querySelector("#begin-button");
const beginButtonImage = beginButton.querySelector("img");
const beginButtonAudio = new Audio("./audio/dooropen.mp3");
beginButtonAudio.preload = "auto";
const menuAudio = new Audio("./audio/menu.mp3");
menuAudio.preload = "auto";
const doorOpenAnimation = "./img/door_open.gif";
const doorOpenDuration = 8790; // Total duration of one door_open.gif cycle at 0.9x speed.
const doorAnimation = "./img/door.gif";
const doorAnimationDuration = 1960;
const openingAnimation = "./img/door_animation.gif";
const parallaxIdleDuration = 10000;
const buttonRevealDelay = 2300;
const buttonPressDuration = 200;
const buttonBounceDuration = 450;
const buttonFeedbackDuration = buttonPressDuration + buttonBounceDuration;
const parallaxScene = document.querySelector("#parallax-scene");
const parallaxLayers = Array.from(
  document.querySelectorAll(".parallax-layer"),
);
const gameStage = document.querySelector(".game_stage");
let openingAnimationActive = true;
let parallaxIdleTimer;
let buttonRevealTimer = null;
let doorPlaybackTimer;
let startRequested = false;
let animationRequest = 0;
let parallaxActive = false;
let parallaxLoadPromise;
let pointerX = window.innerWidth / 2;
let pointerY = window.innerHeight / 2;

function showAnimation(source, onShown = () => {}, onError = () => {}) {
  const request = ++animationRequest;
  const nextAnimation = animationBuffer;
  const preload = new Image();
  preload.onload = () => {
    if (request !== animationRequest) return;
    nextAnimation.onload = () => {
      if (request !== animationRequest) return;
      nextAnimation.onload = null;
      nextAnimation.onerror = null;
      nextAnimation.dataset.animationSource = source;
      animation.classList.remove("is-active");
      nextAnimation.classList.add("is-active");
      [animation, animationBuffer] = [nextAnimation, animation];
      onShown();
    };
    nextAnimation.onerror = () => {
      if (request !== animationRequest) return;
      nextAnimation.onload = null;
      nextAnimation.onerror = null;
      console.error(`Failed to load animation: ${source}`);
      onError();
    };
    nextAnimation.removeAttribute("src");
    nextAnimation.src = source;
  };
  preload.onerror = () => {
    if (request !== animationRequest) return;
    console.error(`Failed to preload animation: ${source}`);
    onError();
  };
  preload.src = source;
}

function showBeginButton() {
  beginButton.hidden = false;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      beginButton.classList.add("is-visible");
    });
  });
}

function hideBeginButton() {
  beginButton.classList.remove("is-visible");
  beginButton.hidden = true;
}

function loadParallaxLayer(layer) {
  if (layer.complete && layer.naturalWidth > 0) {
    return Promise.resolve();
  }
  const source = layer.dataset.src;
  return new Promise((resolve, reject) => {
    layer.addEventListener("load", resolve, { once: true });
    layer.addEventListener(
      "error",
      () => reject(new Error(`Failed to load parallax layer: ${source}`)),
      { once: true },
    );
    layer.src = source;
  });
}

function preloadParallaxLayers() {
  if (!parallaxLoadPromise) {
    parallaxLoadPromise = Promise.all(
      parallaxLayers.map(loadParallaxLayer),
    ).catch((error) => {
      parallaxLoadPromise = null;
      throw error;
    });
  }
  return parallaxLoadPromise;
}

function updateParallax(event) {
  const bounds = gameStage.getBoundingClientRect();
  const x = Math.max(
    -1,
    Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2),
  );
  const y = Math.max(
    -1,
    Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2),
  );
  parallaxLayers.forEach((layer) => {
    const depth = Number(layer.dataset.depth);
    layer.style.setProperty("--parallax-x", `${-x * 32 * depth}px`);
    layer.style.setProperty("--parallax-y", `${-y * 24 * depth}px`);
  });
}

function showParallaxScene() {
  animation.classList.remove("is-active");
  parallaxScene.hidden = false;
  parallaxActive = true;
  updateParallax({ clientX: pointerX, clientY: pointerY });
  if (beginButton.hidden && buttonRevealTimer === null) {
    buttonRevealTimer = setTimeout(() => {
      buttonRevealTimer = null;
      if (parallaxActive && !startRequested) {
        showBeginButton();
      }
    }, buttonRevealDelay);
  }
  scheduleOpeningAnimationAfterIdle();
}

function scheduleOpeningAnimationAfterIdle() {
  clearTimeout(parallaxIdleTimer);
  parallaxIdleTimer = setTimeout(() => {
    openingAnimationActive = true;
    parallaxActive = false;
    clearTimeout(buttonRevealTimer);
    buttonRevealTimer = null;
    hideBeginButton();
    clearTimeout(doorPlaybackTimer);
    showAnimation(openingAnimation, () => {
      parallaxScene.hidden = true;
    });
  }, parallaxIdleDuration);
}

function playLeverSequence() {
  if (startRequested) return;
  if (openingAnimationActive) {
    openingAnimationActive = false;
    showAnimation(doorAnimation, () => {
      parallaxActive = false;
      parallaxScene.hidden = true;
      const request = animationRequest;
      const startedAt = performance.now();
      preloadParallaxLayers()
        .then(() => {
          if (
            request !== animationRequest ||
            openingAnimationActive ||
            startRequested
          ) {
            return;
          }
          const remaining = Math.max(
            0,
            doorAnimationDuration - (performance.now() - startedAt),
          );
          doorPlaybackTimer = setTimeout(() => {
            if (
              request === animationRequest &&
              !openingAnimationActive &&
              !startRequested
            ) {
              showParallaxScene();
            }
          }, remaining);
        })
        .catch((error) => {
          console.error("Failed to load parallax scene:", error);
        });
    });
  }
  if (parallaxActive) {
    scheduleOpeningAnimationAfterIdle();
  }
}

window.addEventListener("pointermove", (event) => {
  pointerX = event.clientX;
  pointerY = event.clientY;
  playLeverSequence();
  if (parallaxActive) {
    updateParallax(event);
  }
});

beginButton.addEventListener("click", () => {
  if (startRequested) return;
  startRequested = true;
  const pressedAt = performance.now();
  beginButton.disabled = true;
  beginButtonImage.src = "./img/begin_button_active.png";
  window.setTimeout(() => {
    beginButtonImage.src = "./img/begin_button_default.png";
    beginButton.classList.add("is-bouncing");
    window.setTimeout(() => {
      beginButton.classList.remove("is-bouncing");
    }, buttonBounceDuration);
  }, buttonPressDuration);
  beginButtonAudio.currentTime = 0;
  beginButtonAudio.play().catch((error) => {
    console.error("Failed to play begin button audio:", error);
  });
  window.setTimeout(() => {
    menuAudio.currentTime = 0;
    menuAudio.play().catch((error) => {
      console.error("Failed to play menu audio:", error);
    });
  }, 3000);
  clearTimeout(buttonRevealTimer);
  buttonRevealTimer = null;
  clearTimeout(parallaxIdleTimer);
  clearTimeout(doorPlaybackTimer);
  openingAnimationActive = false;
  let navigationStarted = false;
  const navigateToNextPage = () => {
    if (navigationStarted) return;
    navigationStarted = true;
    window.location.href = "./0_1.html";
  };
  showAnimation(
    doorOpenAnimation,
    () => {
      setTimeout(
        hideBeginButton,
        Math.max(0, buttonFeedbackDuration - (performance.now() - pressedAt)),
      );
      parallaxActive = false;
      parallaxScene.hidden = true;
      document.body.style.setProperty(
        "--opening-drift-delay",
        `${doorOpenDuration - 1000}ms`,
      );
      document.body.classList.add("is-opening-animation");
      setTimeout(navigateToNextPage, doorOpenDuration);
    },
    navigateToNextPage,
  );
});
