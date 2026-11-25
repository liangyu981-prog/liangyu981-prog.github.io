// 開頭結尾的設置
const mouseBtn = document.getElementById("mouseBtn");
const cameraBtn = document.querySelector(".camera_button");
const introButton = document.getElementById("gameIntroButton");
const introPages = Array.from(document.querySelectorAll(".game_intro_page"));
const introPrev = document.getElementById("gameIntroPrev");
const introNext = document.getElementById("gameIntroNext");
const introOverlay = document.getElementById("gameIntroOverlay");
const introConfirm = document.getElementById("gameIntroConfirm");
if (introButton && introPages.length && introPrev && introNext && introOverlay && introConfirm) {
  let introPageIndex = 0;
  const showIntroPage = (index) => {
    introPageIndex = (index + introPages.length) % introPages.length;
    introPages.forEach((page, pageIndex) => {
      page.hidden = pageIndex !== introPageIndex;
    });
  };
  const closeIntro = () => {
    introOverlay.hidden = true;
    introButton.setAttribute("aria-expanded", "false");
    introButton.focus();
  };
  introButton.setAttribute("aria-expanded", "false");
  introButton.addEventListener("click", () => {
    showIntroPage(0);
    introOverlay.hidden = false;
    introButton.setAttribute("aria-expanded", "true");
  });
  introPrev.addEventListener("click", () => showIntroPage(introPageIndex - 1));
  introNext.addEventListener("click", () => showIntroPage(introPageIndex + 1));
  introConfirm.addEventListener("click", closeIntro);
  introOverlay.addEventListener("click", (event) => {
    if (event.target === introOverlay) closeIntro();
  });
  document.addEventListener("keydown", (event) => {
    if (introOverlay.hidden) return;
    if (event.key === "ArrowLeft") showIntroPage(introPageIndex - 1);
    if (event.key === "ArrowRight") showIntroPage(introPageIndex + 1);
    if (event.key === "Escape") closeIntro();
  });
  [introButton, introConfirm].forEach((button) => {
    button.addEventListener("pointerdown", () => button.classList.add("is-active"));
    ["pointerup", "pointercancel", "pointerleave", "blur"].forEach((eventName) => {
      button.addEventListener(eventName, () => button.classList.remove("is-active"));
    });
  });
}
const nextBtn = document.getElementById("nextBtn");
const scoreDisplay = document.getElementById("score_display");
const scoreParam = new URLSearchParams(window.location.search).get("score");
const parsedScore = Number(scoreParam);
let score =
  scoreParam !== null && Number.isFinite(parsedScore) ? parsedScore : 0;
const correctParam = new URLSearchParams(window.location.search).get("correct");
const parsedCorrectCount = Number(correctParam);
let correctAnswers =
  correctParam !== null && Number.isFinite(parsedCorrectCount)
    ? parsedCorrectCount
    : Number(localStorage.getItem("level1CorrectCount") ?? "0");

const endingPopup = document.querySelector(".popend");
const endingPopupOverlay = document.getElementById("endingPopupOverlay");
if (endingPopup && endingPopupOverlay) {
  const correctCount = Number.isFinite(correctAnswers)
    ? correctAnswers
    : score >= 25
      ? 3
      : score >= 16
        ? 2
        : 0;
  const endingResult = correctCount >= 3 ? "good" : correctCount >= 2 ? "normal" : "bad";
  endingPopup.style.backgroundImage = `url("./img/7_end_popupwindow_${endingResult}.png")`;
  endingPopupOverlay.src = `./img/small_${endingResult}_endpop.GIF`;
}

// 第一關是整段遊戲的起點；後續題目透過網址參數接續本關分數。
if (document.querySelector(".devel1_bg") && document.querySelector(".modal_container")) {
  localStorage.setItem("totalScore", "0");
  localStorage.setItem("level1Score", "0");
  localStorage.setItem("level1CorrectCount", "0");
  correctAnswers = 0;
  console.log("[Devel1] 新遊戲開始，累計總分 0 分");
}

if (scoreDisplay) {
  scoreDisplay.textContent = `本次得分：0 分｜累計積分：${score} 分`;
}

function updateScore(button, correctButtonId, maxPoints) {
  const earnedPoints = button.id === correctButtonId ? maxPoints : 0;
  if (earnedPoints > 0) correctAnswers += 1;
  score += earnedPoints;
  localStorage.setItem("level1Score", String(score));
  localStorage.setItem("totalScore", String(score));
  localStorage.setItem("level1CorrectCount", String(correctAnswers));
  console.log(
    `[Devel1] 本題得分 ${earnedPoints} 分；第一關累計 ${score} 分；遊戲總分 ${score} 分`,
  );

  if (scoreDisplay) {
    scoreDisplay.textContent = `本次得分：${earnedPoints} 分｜累計積分：${score} 分`;
  }
}

function scoreDestination(destination) {
  const separator = destination.includes("?") ? "&" : "?";
  return `${destination}${separator}score=${score}&correct=${correctAnswers}`;
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
      updateScore(button, "btn_up", 8);
    }
  });
});

document.querySelectorAll(".findtea_btn_Q2").forEach((button) => {
  button.addEventListener("click", () => {
    if (startQ2StopTransition()) {
      updateScore(button, "btn_left", 8);
    }
  });
});

document.querySelectorAll(".findtea_btn_Q3").forEach((button) => {
  button.addEventListener("click", () => {
    if (startQ3StopTransition()) {
      updateScore(button, "btn_down", 9);
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
