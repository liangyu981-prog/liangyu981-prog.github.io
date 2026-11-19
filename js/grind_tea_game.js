(() => {
  const stage = document.getElementById("gameStage");
  const track = document.getElementById("track");
  const cow = document.getElementById("cow");
  const cowGuide = document.getElementById("cowGuide");
  const pestle = document.getElementById("pestle");
  const scoreDisplay = document.getElementById("score");
  const timerDisplay = document.getElementById("timer");
  const feedback = document.getElementById("feedback");
  const result = document.getElementById("result");
  const finalScore = document.getElementById("finalScore");
  const restart = document.getElementById("restart");

  if (
    !stage ||
    !track ||
    !cow ||
    !cowGuide ||
    !pestle ||
    !scoreDisplay ||
    !timerDisplay ||
    !feedback ||
    !result ||
    !finalScore ||
    !restart
  ) {
    throw new Error("磨茶葉遊戲缺少必要的畫面元素。");
  }

  const durationSeconds = 15;
  const minScore = 10;
  const maxScore = 25;
  // Keep the mouse position and target center in the same 1920px stage space.
  // A wider band makes the timing forgiving while still requiring the cursor
  // to stay near the moving cow.
  const followDistance = 140;
  let score = minScore;
  let secondsLeft = durationSeconds;
  let playerX = null;
  let markerX = 0;
  let direction = 1;
  let lastFrame = 0;
  let running = true;
  let animationId = 0;
  let timerId = 0;
  let scoreId = 0;

  const renderScore = () => {
    scoreDisplay.textContent = `分數：${score}`;
  };

  const updateStagePointer = (event) => {
    const bounds = stage.getBoundingClientRect();
    const scaleX = bounds.width / 1920;
    const scaleY = bounds.height / 1080;
    const x = (event.clientX - bounds.left) / scaleX;
    const y = (event.clientY - bounds.top) / scaleY;
    playerX = x;
    pestle.style.left = `${x}px`;
    pestle.style.top = `${y}px`;
  };

  const animateMarker = (now) => {
    if (!running) return;
    if (lastFrame) {
      const elapsed = Math.min((now - lastFrame) / 1000, 0.05);
      const maxX = Math.max(0, track.clientWidth - cow.clientWidth);
      markerX += direction * 430 * elapsed;
      if (markerX >= maxX) {
        markerX = maxX;
        direction = -1;
        cow.style.transform = "none";
      } else if (markerX <= 0) {
        markerX = 0;
        direction = 1;
        cow.style.transform = "scaleX(-1)";
      }
      cow.style.left = `${markerX}px`;
      cowGuide.style.left = `${markerX + cow.clientWidth / 2}px`;
    }
    lastFrame = now;
    animationId = window.requestAnimationFrame(animateMarker);
  };

  const updateScore = () => {
    if (!running) return;
    const trackBounds = track.getBoundingClientRect();
    const stageBounds = stage.getBoundingClientRect();
    const scaleX = stageBounds.width / 1920;
    const targetX =
      (trackBounds.left - stageBounds.left) / scaleX +
      markerX +
      cow.clientWidth / 2;
    const onTarget =
      playerX !== null && Math.abs(playerX - targetX) <= followDistance;
    score = Math.max(minScore, Math.min(maxScore, score + (onTarget ? 1 : -1)));
    renderScore();
    feedback.textContent = onTarget ? "跟上了！繼續保持！" : "沒有跟上，分數下降中！";
  };

  const finishGame = () => {
    if (!running) return;
    running = false;
    window.cancelAnimationFrame(animationId);
    window.clearInterval(timerId);
    window.clearInterval(scoreId);
    timerDisplay.textContent = "剩餘時間：0 秒";
    feedback.textContent = "遊戲結束";
    finalScore.textContent = `本次得分：${score} 分`;
    result.hidden = false;
    restart.focus();
  };

  const startGame = () => {
    score = minScore;
    secondsLeft = durationSeconds;
    playerX = null;
    markerX = 0;
    direction = 1;
    lastFrame = 0;
    running = true;
    result.hidden = true;
    renderScore();
    timerDisplay.textContent = `剩餘時間：${secondsLeft} 秒`;
    feedback.textContent = "準備開始";
    cow.style.left = "0px";
    cow.style.transform = "scaleX(-1)";
    cowGuide.style.left = `${cow.clientWidth / 2}px`;
    animationId = window.requestAnimationFrame(animateMarker);
    timerId = window.setInterval(() => {
      secondsLeft -= 1;
      timerDisplay.textContent = `剩餘時間：${secondsLeft} 秒`;
      if (secondsLeft <= 0) finishGame();
    }, 1000);
    scoreId = window.setInterval(updateScore, 1000);
  };

  stage.addEventListener("pointermove", updateStagePointer);
  restart.addEventListener("click", startGame);
  renderScore();
  startGame();
})();
