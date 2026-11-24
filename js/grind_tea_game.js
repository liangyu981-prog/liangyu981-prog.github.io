(() => {
  const stage = document.getElementById("gameStage");
  const track = document.getElementById("track");
  const cow = document.getElementById("cow");
  const cowGuide = document.getElementById("cowGuide");
  const pestle = document.getElementById("pestle");
  const scoreDisplay = document.getElementById("score");
  const timerDisplay = document.getElementById("timer");
  const feedback = document.getElementById("feedback");

  if (
    !stage ||
    !track ||
    !cow ||
    !cowGuide ||
    !pestle ||
    !feedback
  ) {
    throw new Error("磨茶葉遊戲缺少必要的畫面元素。");
  }

  const durationSeconds = 15;
  const minScore = 5;
  const maxScore = 25;
  const initialCowSpeed = 400; // 牛剛開始的速度，單位為舞台像素／秒。
  const cowAcceleration = 80; // 每秒增加的速度。
  const maxCowSpeed = 1500; // 牛的最高速度。
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
  let gameStartedAt = 0;
  let running = true;
  let animationId = 0;
  let timerId = 0;
  let scoreId = 0;

  const renderScore = () => {
    if (scoreDisplay) scoreDisplay.textContent = `分數：${score}`;
  };

  const updateStagePointer = (event) => {
    const bounds = stage.getBoundingClientRect();
    const scaleX = bounds.width / 1920;
    const scaleY = bounds.height / 1080;
    const x = (event.clientX - bounds.left) / scaleX;
    const y = (event.clientY - bounds.top) / scaleY;
    playerX = x;
    pestle.style.transform = `translate3d(${x}px, ${y - 350}px, 0) translate(-50%, -50%)`;
  };

  const animateMarker = (now) => {
    if (!running) return;
    if (lastFrame) {
      const elapsed = Math.min((now - lastFrame) / 1000, 0.05);
      const maxX = Math.max(0, track.clientWidth - cow.clientWidth);
      const currentSpeed = Math.min(
        maxCowSpeed,
        initialCowSpeed + ((now - gameStartedAt) / 1000) * cowAcceleration,
      );
      markerX += direction * currentSpeed * elapsed;
      if (markerX >= maxX) {
        markerX = maxX;
        direction = -1;
        cow.style.transform = `translate3d(${markerX}px, 0, 0)`;
      } else if (markerX <= 0) {
        markerX = 0;
        direction = 1;
        cow.style.transform = `translate3d(${markerX}px, 0, 0) scaleX(-1)`;
      } else {
        cow.style.transform = `translate3d(${markerX}px, 0, 0)${direction === 1 ? " scaleX(-1)" : ""}`;
      }
      cowGuide.style.transform = `translate3d(${markerX + cow.clientWidth / 2 - 56}px, 0, 0) translateX(-50%)`;
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
    cowGuide.classList.toggle("is_following", onTarget);
    cowGuide.classList.toggle("is_missing", !onTarget);
    score = Math.max(minScore, Math.min(maxScore, score + (onTarget ? 1 : -1)));
    renderScore();
    feedback.textContent = onTarget
      ? "跟上了！繼續保持！"
      : "還沒跟上，繼續追上牛！";
  };

  const finishGame = () => {
    if (!running) return;
    running = false;
    window.cancelAnimationFrame(animationId);
    window.clearInterval(timerId);
    window.clearInterval(scoreId);
    if (timerDisplay) timerDisplay.textContent = "剩餘時間：0 秒";
    feedback.textContent = "遊戲結束";
    const previousTotal = Number(localStorage.getItem("totalScore") ?? "0");
    const currentTotal = Number.isFinite(previousTotal) ? previousTotal : 0;
    const newTotal = currentTotal + score;
    localStorage.setItem("level2Score", String(score));
    localStorage.setItem("totalScore", String(newTotal));
    console.log(`[Devel2] 本關得分 ${score} 分；累計總分 ${newTotal} 分`);
    window.location.href = "./1_3_2.html";
  };

  const startGame = () => {
    score = minScore;
    secondsLeft = durationSeconds;
    playerX = null;
    markerX = 0;
    direction = 1;
    lastFrame = 0;
    gameStartedAt = performance.now();
    running = true;
    renderScore();
    if (timerDisplay) timerDisplay.textContent = `剩餘時間：${secondsLeft} 秒`;
    feedback.textContent = "準備開始";
    cow.style.transform = "translate3d(0, 0, 0) scaleX(-1)";
    cowGuide.style.transform = `translate3d(${cow.clientWidth / 2 - 56}px, 0, 0) translateX(-50%)`;
    animationId = window.requestAnimationFrame(animateMarker);
    timerId = window.setInterval(() => {
      secondsLeft -= 1;
      if (timerDisplay) timerDisplay.textContent = `剩餘時間：${secondsLeft} 秒`;
      if (secondsLeft <= 0) finishGame();
    }, 1000);
    scoreId = window.setInterval(updateScore, 1000);
  };

  stage.addEventListener("pointermove", updateStagePointer);
  renderScore();
  startGame();
})();
