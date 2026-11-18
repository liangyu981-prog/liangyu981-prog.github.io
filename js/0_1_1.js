const menuArt = document.querySelector(".menu-art");
const transitionImage = document.querySelector(".menu-transition");
const turnButtons = document.querySelectorAll(".turn-button");
const turnButtonDefault = "./img/turn_button_default.png";
const turnButtonActive = "./img/turn_button_active.png";
// 兩個翻頁按鈕共用同一個翻頁音效
const turnSound = new Audio("./audio/turn_page.mp3");
const transitionAnimations = {
  left: "./img/DtoK_left_animation.gif",
  right: "./img/DtoK_right_animation.gif",
};
const transitionDuration = 1500;
let transitionRequest = 0;
let transitionTimer;
let transitionRunning = false;

function updateTurnButtons() {
  turnButtons.forEach((button) => {
    button.disabled = transitionRunning;
  });
}

function finishTransition(request) {
  if (request !== transitionRequest) return;
  window.location.href = "./0_1.html";
}

function failTransition(request, animation) {
  if (request !== transitionRequest) return;
  console.error(`Failed to load menu transition: ${animation}`);
  clearTimeout(transitionTimer);
  transitionImage.onload = null;
  transitionImage.onerror = null;
  transitionImage.removeAttribute("src");
  menuArt.classList.remove("is-transitioning");
  transitionRunning = false;
  updateTurnButtons();
}

function playTransition(animation) {
  const request = ++transitionRequest;
  const playbackSource = `${animation}?play=${request}`;
  const preload = new Image();

  preload.onload = () => {
    if (request !== transitionRequest) return;
    transitionImage.onload = () => {
      if (request !== transitionRequest) return;
      transitionTimer = setTimeout(
        () => finishTransition(request),
        transitionDuration,
      );
    };
    transitionImage.onerror = () => failTransition(request, animation);
    transitionImage.src = playbackSource;
    menuArt.classList.add("is-transitioning");
  };
  preload.onerror = () => failTransition(request, animation);
  preload.src = playbackSource;
}

turnButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (transitionRunning || button.disabled) return;
    turnSound.currentTime = 0;
    turnSound.play();
    transitionRunning = true;
    updateTurnButtons();

    const image = button.querySelector("img");
    const direction = button.classList.contains("turn-button-right")
      ? "right"
      : "left";
    image.src = turnButtonActive;

    setTimeout(() => {
      image.src = turnButtonDefault;
      playTransition(transitionAnimations[direction]);
    }, 100);
  });
});
