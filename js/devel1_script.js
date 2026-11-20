// 開頭結尾的設置
const mouseBtn = document.getElementById("mouseBtn");
const cameraBtn = document.querySelector(".camera_button");
const nextBtn = document.getElementById("nextBtn");
const scoreDisplay = document.getElementById("score_display");
const scoreParam = new URLSearchParams(window.location.search).get("score");
const parsedScore = Number(scoreParam);
let score =
  scoreParam !== null && Number.isFinite(parsedScore) ? parsedScore : 0;

if (scoreDisplay) {
  scoreDisplay.textContent = `本次得分：0 分｜累計積分：${score} 分`;
}

function updateScore(button, correctButtonId) {
  const earnedPoints = button.id === correctButtonId ? 8 : 0;
  score += earnedPoints;

  if (scoreDisplay) {
    scoreDisplay.textContent = `本次得分：${earnedPoints} 分｜累計積分：${score} 分`;
  }
}

function scoreDestination(destination) {
  return `${destination}?score=${score}`;
}

let startQ1StopTransition = () => false;
let startQ2StopTransition = () => false;
let startQ3StopTransition = () => false;

if (mouseBtn) {
  mouseBtn.addEventListener("click", (e) => {
    // Prevent the default action so navigation can happen after the press feedback.
    e.preventDefault();
    setTimeout(() => {
      window.location.href = "1_2_1_1.html";
    }, 200);
  });
}

if (cameraBtn) {
  cameraBtn.addEventListener("click", (e) => {
    e.preventDefault();
    setTimeout(() => {
      window.location.href = "1_2_1_2.html";
    }, 200);
  });
}

// 接下一頁的自己改

document.querySelectorAll(".findtea_btn_Q1").forEach((button) => {
  button.addEventListener("click", () => {
    if (startQ1StopTransition()) {
      updateScore(button, "btn_up");
    }
  });
});

document.querySelectorAll(".findtea_btn_Q2").forEach((button) => {
  button.addEventListener("click", () => {
    if (startQ2StopTransition()) {
      updateScore(button, "btn_left");
    }
  });
});

document.querySelectorAll(".findtea_btn_Q3").forEach((button) => {
  button.addEventListener("click", () => {
    if (startQ3StopTransition()) {
      updateScore(button, "btn_down");
    }
  });
});
document.querySelectorAll(".next_button").forEach((button) => {
  button.addEventListener("click", () => {
    setTimeout(() => {
      window.location.href = scoreDestination("1_3.html");
    }, 170);
  });
});

function freezeBackgroundAfterPlayback(
  selector,
  destination,
  stopImage,
  holdDuration = 1000,
) {
  const background = document.querySelector(selector);
  if (!background) return () => false;

  const stopImageElement = stopImage ? new Image() : null;
  if (stopImageElement) {
    stopImageElement.src = stopImage;
  }

  let transitionStarted = false;
  const startTransition = () => {
    if (transitionStarted) return false;
    transitionStarted = true;

    const image = background.querySelector("img");
    if (stopImage) {
      stopImageElement.decode().then(() => {
        stopImageElement.alt = image.alt;
        background.replaceChild(stopImageElement, image);
        navigateAfterHold(destination, holdDuration);
      });
      return true;
    }

    const bounds = background.getBoundingClientRect();
    const imageBounds = image.getBoundingClientRect();
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bounds.width);
    canvas.height = Math.round(bounds.height);
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error(`Unable to freeze the animation for ${selector}.`);
    }
    context.drawImage(
      image,
      imageBounds.left - bounds.left,
      imageBounds.top - bounds.top,
      imageBounds.width,
      imageBounds.height,
    );
    background.style.backgroundImage = "none";
    background.appendChild(canvas);
    image.remove();
    navigateAfterHold(destination, holdDuration);
    return true;
  };

  setTimeout(startTransition, 2100);
  return startTransition;
}

function navigateAfterHold(destination, holdDuration) {
  setTimeout(() => {
    window.location.href = scoreDestination(destination);
  }, holdDuration);
}

startQ1StopTransition = freezeBackgroundAfterPlayback(
  ".devel1_Q1_bg",
  "1_2_2_1.html",
  null,
  800,
);
startQ2StopTransition = freezeBackgroundAfterPlayback(
  ".devel1_Q2_bg",
  "1_2_3_1.html",
  null,
  800,
);
startQ3StopTransition = freezeBackgroundAfterPlayback(
  ".devel1_Q3_bg",
  "1_2_4.html",
  null,
  800,
);
