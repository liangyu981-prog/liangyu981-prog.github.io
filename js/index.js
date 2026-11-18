let animation = document.querySelector("#animation");
let animationBuffer = document.querySelector("#animation-buffer");
const beginButton = document.querySelector("#begin-button");
const beginButtonImage = beginButton.querySelector("img");
const beginButtonAudio = new Audio("./audio/dooropen.mp3");
beginButtonAudio.preload = "auto";
const openingAnimation = "./img/begin_animation.gif";
const buttonAnimation = "./img/opening_animation.gif";
const buttonAnimationDuration = 7460;
const leverDropAnimation = "./img/door.gif";
const leverLoopAnimation = "./img/door_animation.gif";
const leverDropDuration = 1290;
const leverLoopIdleDuration = 5000;
const buttonDelay = 1500;
let sequenceRunning = false;
let leverLoopActive = false;
let leverLoopIdleTimer;
let startRequested = false;
let animationRequest = 0;

function showAnimation(source, onShown = () => {}, onError = () => {}) {
  const request = ++animationRequest;
  const playbackSource = `${source}?play=${request}`;
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
    nextAnimation.src = playbackSource;
  };
  preload.onerror = () => {
    if (request !== animationRequest) return;
    console.error(`Failed to preload animation: ${source}`);
    onError();
  };
  preload.src = playbackSource;
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

function scheduleLeverLoopIdleReturn() {
  clearTimeout(leverLoopIdleTimer);
  leverLoopIdleTimer = setTimeout(() => {
    hideBeginButton();
    leverLoopActive = false;
    sequenceRunning = false;
    showAnimation(openingAnimation);
  }, leverLoopIdleDuration);
}

function playLeverSequence() {
  if (sequenceRunning) return;
  sequenceRunning = true;
  const finishSequence = () => {
    hideBeginButton();
    leverLoopActive = false;
    clearTimeout(leverLoopIdleTimer);
    sequenceRunning = false;
    showAnimation(openingAnimation);
  };
  showAnimation(
    leverDropAnimation,
    () => {
      setTimeout(() => {
        showAnimation(
          leverLoopAnimation,
          () => {
            leverLoopActive = true;
            scheduleLeverLoopIdleReturn();
            setTimeout(() => {
              showBeginButton();
            }, buttonDelay);
          },
          finishSequence,
        );
      }, leverDropDuration);
    },
    finishSequence,
  );
}

window.addEventListener("pointermove", () => {
  if (leverLoopActive) {
    scheduleLeverLoopIdleReturn();
    return;
  }
  playLeverSequence();
});

beginButton.addEventListener("click", () => {
  if (startRequested) return;
  startRequested = true;
  beginButton.disabled = true;
  beginButtonImage.src = "./img/begin_button_active.png";
  beginButtonAudio.currentTime = 0;
  beginButtonAudio.play().catch((error) => {
    console.error("Failed to play begin button audio:", error);
  });
  hideBeginButton();
  clearTimeout(leverLoopIdleTimer);
  leverLoopActive = false;
  sequenceRunning = true;
  let navigationStarted = false;
  const navigateToNextPage = () => {
    if (navigationStarted) return;
    navigationStarted = true;
    window.location.href = "./0_1.html";
  };
  showAnimation(
    buttonAnimation,
    () => {
      document.body.style.setProperty(
        "--opening-drift-delay",
        `${buttonAnimationDuration - 3000}ms`,
      );
      document.body.classList.add("is-opening-animation");
      setTimeout(navigateToNextPage, buttonAnimationDuration);
    },
    navigateToNextPage,
  );
});
