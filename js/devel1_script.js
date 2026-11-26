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

function restartGifAnimation(image, source = image.getAttribute("src")) {
  if (!source) return false;
  const animationUrl = new URL(source, window.location.href);
  animationUrl.searchParams.set("restart", String(Date.now()));
  image.src = animationUrl.href;
  return true;
}

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

const activeQuestion = [
  {
    selector: ".findtea_btn_Q1",
    correctId: "btn_left",
    points: 8,
    nextPage: "1_2_2_1.html",
  },
  {
    selector: ".findtea_btn_Q2",
    correctId: "btn_right",
    points: 8,
    nextPage: "1_2_3_1.html",
  },
  {
    selector: ".findtea_btn_Q3",
    correctId: "btn_right",
    points: 9,
    nextPage: "1_2_4.html",
  },
].find((question) => document.querySelector(question.selector));

if (activeQuestion) {
  const timerGif = document.querySelector(".timer_intro_gif");
  const timerIntro = document.querySelector(".timer_intro");
  const gameTimer = document.querySelector(".Gtimer");
  const questionTimerGif = document.querySelector(".question_timer_gif");
  const questionButtons = Array.from(
    document.querySelectorAll(activeQuestion.selector),
  );
  const durationMs = 3000; // 計時器 GIF 顯示後完整倒數 3 秒。
  let questionFinished = false;
  let countdownInterval = null;
  let countdownStarted = false;
  let preludeStarted = false;
  let introStillFrame = null;
  let endAt = 0;
  let firstQuestionStarting = false;
  let frozenQuestionBackground = null;
  let questionBackgroundImage = null;
  let questionBackgroundImageSource = null;

  const freezeQuestionBackground = async () => {
    const image = document.querySelector(".devel1_Q1_bg img");
    if (!image || frozenQuestionBackground) return;

    try {
      await image.decode();
    } catch (error) {
      console.warn("Could not freeze the Question 1 background GIF.", error);
      return;
    }

    if (questionFinished || !image.isConnected) return;
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    if (!width || !height) {
      console.error("The Question 1 background GIF has no decoded frame.");
      return;
    }

    const frame = document.createElement("canvas");
    frame.className = "question_background_frame";
    frame.width = width;
    frame.height = height;
    const context = frame.getContext("2d");
    if (!context) {
      console.error("Could not create a canvas to freeze the Question 1 background.");
      return;
    }

    const imageStyle = window.getComputedStyle(image);
    Object.assign(frame.style, {
      position: imageStyle.position,
      top: imageStyle.top,
      left: imageStyle.left,
      width: imageStyle.width,
      height: imageStyle.height,
      transform: imageStyle.transform,
      objectFit: imageStyle.objectFit,
      pointerEvents: "none",
    });
    context.drawImage(image, 0, 0);
    questionBackgroundImage = image;
    questionBackgroundImageSource = image.getAttribute("src") || image.src;
    image.replaceWith(frame);
    frozenQuestionBackground = frame;
  };

  const questionBackgroundFreeze = freezeQuestionBackground();
  const resumeQuestionBackground = () => {
    if (
      !frozenQuestionBackground ||
      !questionBackgroundImage ||
      !questionBackgroundImageSource
    ) {
      return;
    }

    restartGifAnimation(questionBackgroundImage, questionBackgroundImageSource);
    frozenQuestionBackground.replaceWith(questionBackgroundImage);
    frozenQuestionBackground = null;
  };

  const stopCountdown = () => {
    questionFinished = true;
    window.clearInterval(countdownInterval);
  };
  const goToNextQuestion = (answerButton = null) => {
    if (questionFinished) return;
    stopCountdown();
    if (answerButton) {
      updateScore(
        answerButton,
        activeQuestion.correctId,
        activeQuestion.points,
      );
    }
    questionButtons.forEach((button) => {
      button.disabled = true;
    });
    window.location.href = scoreDestination(activeQuestion.nextPage);
  };
  const updateCountdown = () => {
    const remaining = Math.max(
      0,
      Math.ceil((endAt - performance.now()) / 1000),
    );
    if (remaining === 0) goToNextQuestion();
  };
  const startCountdown = () => {
    if (questionFinished || countdownStarted) return;
    countdownStarted = true;
    endAt = performance.now() + durationMs;
    countdownInterval = window.setInterval(updateCountdown, 50);
    updateCountdown();
  };
  const startPreludeShake = () => {
    if (preludeStarted || questionFinished) return;
    preludeStarted = true;
    timerIntro?.classList.add("is_ready");
  };
  const showSideTimer = () => {
    if (questionFinished || !gameTimer) return;
    // 大時鐘使用靜態畫格；側邊小時鐘使用原始 GIF，正常持續轉動。
    if (questionTimerGif) {
      gameTimer.appendChild(questionTimerGif);
    } else if (introStillFrame) {
      gameTimer.appendChild(introStillFrame);
    } else if (timerGif) {
      gameTimer.appendChild(timerGif);
    }
    gameTimer.classList.add("visible");
  };
  const restartVisibleTimer = () => {
    if (!questionTimerGif) {
      startCountdown();
      return;
    }
    if (!questionTimerGif.getAttribute("src")) {
      console.error("The question timer GIF has no source.");
      startCountdown();
      return;
    }

    questionTimerGif.addEventListener("load", startCountdown, { once: true });
    questionTimerGif.addEventListener(
      "error",
      () => {
        console.error("Could not load the question timer GIF.");
        startCountdown();
      },
      { once: true },
    );
    restartGifAnimation(questionTimerGif);
  };
  questionButtons.forEach((button) => {
    button.addEventListener(
      "click",
      () => goToNextQuestion(button),
      { once: true },
    );
  });
  if (timerIntro) {
    timerIntro.addEventListener("animationend", (event) => {
      if (event.animationName !== "timerIntroShake") return;
      showSideTimer();
      resumeQuestionBackground();
      restartVisibleTimer();
    });
  }
  if (timerGif && timerIntro) {
    const startFirstQuestion = async () => {
      if (firstQuestionStarting || questionFinished) return;
      firstQuestionStarting = true;
      await questionBackgroundFreeze;
      if (questionFinished) return;

      // 在開始搖晃前擷取 GIF 畫格，避免 GIF 動畫在計時期間循環重播。
      if (!introStillFrame && timerGif.complete && timerGif.naturalWidth > 0) {
        const stillFrame = document.createElement("canvas");
        stillFrame.className = "question_timer_frame";
        stillFrame.width = timerGif.naturalWidth;
        stillFrame.height = timerGif.naturalHeight;
        const context = stillFrame.getContext("2d");
        if (context) {
          context.drawImage(timerGif, 0, 0);
          introStillFrame = stillFrame;
          timerGif.replaceWith(stillFrame);
        }
      }
      startPreludeShake();
    };
    timerGif.addEventListener("load", startFirstQuestion, { once: true });
    timerGif.addEventListener("error", startFirstQuestion, { once: true });
    if (timerGif.complete) startFirstQuestion();
  } else if (gameTimer && questionTimerGif) {
    // 第二、三題只顯示小時鐘，不播放大時鐘前導。
    showSideTimer();
    restartVisibleTimer();
  } else {
    startCountdown();
  }
}

// 鏡頭模式只同步顯示計時器，不介入 camera_game.js 的辨識、計分或跳頁流程。
if (!activeQuestion && document.querySelector(".camera_game_background")) {
  const timerIntro = document.querySelector(".timer_intro");
  const timerGif = document.querySelector(".timer_intro_gif");
  const gameTimer = document.querySelector(".Gtimer");
  const questionTimerGif = document.querySelector(".question_timer_gif");

  if (timerIntro && timerGif && gameTimer) {
    let introStillFrame = null;
    const startCameraTimerIntro = () => {
      if (!introStillFrame && timerGif.complete && timerGif.naturalWidth > 0) {
        const stillFrame = document.createElement("canvas");
        stillFrame.className = "question_timer_frame";
        stillFrame.width = timerGif.naturalWidth;
        stillFrame.height = timerGif.naturalHeight;
        const context = stillFrame.getContext("2d");
        if (context) {
          context.drawImage(timerGif, 0, 0);
          introStillFrame = stillFrame;
          timerGif.replaceWith(stillFrame);
        }
      }
      timerIntro.classList.add("is_ready");
    };
    timerIntro.addEventListener("animationend", (event) => {
      if (event.animationName !== "timerIntroShake") return;
      if (questionTimerGif) {
        gameTimer.appendChild(questionTimerGif);
        if (!restartGifAnimation(questionTimerGif)) {
          console.error("The question timer GIF has no source.");
        }
      } else if (introStillFrame) {
        gameTimer.appendChild(introStillFrame);
      }
      gameTimer.classList.add("visible");
    });
    timerGif.addEventListener("load", startCameraTimerIntro, { once: true });
    timerGif.addEventListener("error", startCameraTimerIntro, { once: true });
    if (timerGif.complete) startCameraTimerIntro();
  } else if (gameTimer && questionTimerGif) {
    gameTimer.classList.add("visible");
  }
}

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
