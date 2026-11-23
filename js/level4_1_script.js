// 切雞肉描圖關卡：描出提示圖形後依照路徑相似度計分。
document.addEventListener("DOMContentLoaded", () => {
  const startButton = document.getElementById("startBtn");
  const endingPopup = document.querySelector(".popwidow5");
  const endingPopupOverlay = document.getElementById(
    "cutChickenEndingPopupOverlay",
  );

  if (endingPopup && endingPopupOverlay) {
    const correct_param = new URLSearchParams(window.location.search).get(
      "accuracy",
    );
    const query_accuracy = Number(correct_param);
    const saved_accuracy = Number(
      localStorage.getItem("cutChickenAccuracy") ?? "0",
    );
    const accuracy =
      correct_param !== null && Number.isFinite(query_accuracy)
        ? query_accuracy
        : Number.isFinite(saved_accuracy)
          ? saved_accuracy
          : 0;
    const result_type =
      accuracy <= 60 ? "bad" : accuracy < 80 ? "normal" : "good";
    const ending_assets = {
      bad: {
        background: "./img/4_1_end_popupwindow_bad.png",
        overlay: "./img/small_bad_endpop.GIF",
      },
      normal: {
        background: "./img/4_1_end_popupwindow_normal.png",
        overlay: "./img/small_normal_endpop.GIF",
      },
      good: {
        background: "./img/4_1_end_popupwindow_good.png",
        overlay: "./img/small_good_endpop.GIF",
      },
    }[result_type];

    endingPopup.style.backgroundImage = `url("${ending_assets.background}")`;
    endingPopupOverlay.src = ending_assets.overlay;
    console.log(
      `[切雞肉結尾] 準確度 ${accuracy}%，顯示 ${ending_assets.background}`,
    );
  }

  if (startButton) {
    startButton.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        startButton.disabled = true;
        localStorage.setItem("level4Score", "0");
        localStorage.setItem("cutChickenAccuracy", "0");
        window.setTimeout(() => {
          window.location.href = "./0_5_6.html";
        }, 200);
      },
      { once: true },
    );
  }

  const nextButton = document.getElementById("nextBtn");
  if (nextButton) {
    nextButton.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        nextButton.disabled = true;
        window.setTimeout(() => {
          window.location.href = "./0_6.html";
        }, 200);
      },
      { once: true },
    );
  }

  const canvas = document.getElementById("drawingCanvas");
  const guideCanvas = document.getElementById("guideCanvas");
  const instruction = document.getElementById("instruction");
  const result = document.getElementById("result");
  if (!canvas || !guideCanvas || !instruction || !result) return;

  const context = canvas.getContext("2d");
  const guideContext = guideCanvas.getContext("2d");
  const center = { x: 960, y: 490 };
  const radius = 250;
  // 每次進入關卡都生成輕微起伏，並以內插保持輪廓平順。
  const shapeVariation = Array.from(
    { length: 50 },
    () => Math.random() * 72 - 30,
  );
  const points = [];
  let totalPathLength = 0;
  let isDrawing = false;
  let hasStarted = false;
  let isFinished = false;
  let drawingTimeElapsed = false;
  let hasClosedPath = false;
  let drawingTimer;
  let promptTimer;
  let guideTimer;
  let guideFlashInterval;

  function getTargetRadius(angle) {
    const position =
      ((((angle / (Math.PI * 2)) % 1) + 1) % 1) * shapeVariation.length;
    const index = Math.floor(position);
    const fraction = position - index;
    const current = shapeVariation[index];
    const next = shapeVariation[(index + 1) % shapeVariation.length];
    const smoothFraction = fraction * fraction * (3 - 2 * fraction);
    return radius + current + (next - current) * smoothFraction;
  }

  // 在雞肉圖上畫出圓形參考痕跡。
  function drawGuide() {
    guideContext.save();
    guideContext.beginPath();
    for (let step = 0; step <= 360; step += 1) {
      const angle = (step / 360) * Math.PI * 2;
      const targetRadius = getTargetRadius(angle);
      const x = center.x + Math.cos(angle) * targetRadius;
      const y = center.y + Math.sin(angle) * targetRadius;
      if (step === 0) guideContext.moveTo(x, y);
      else guideContext.lineTo(x, y);
    }
    guideContext.setLineDash([18, 13]);
    guideContext.lineWidth = 10;
    guideContext.strokeStyle = "#ffffff";
    guideContext.shadowColor = "#b84100";
    guideContext.shadowBlur = 12;
    guideContext.stroke();
    guideContext.restore();
  }

  function getPoint(event) {
    const bounds = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * canvas.width,
      y: ((event.clientY - bounds.top) / bounds.height) * canvas.height,
    };
  }

  // 清除圓形參考線後重畫已留下的玩家筆跡。
  function redrawUserPath() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (points.length === 0) return;
    context.save();
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
    context.lineWidth = 12;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#b70600";
    context.stroke();
    context.restore();
  }

  function handleCanvasClick(event) {
    if (isFinished) return;
    event.preventDefault();
    const point = getPoint(event);

    if (isDrawing) {
      // 再次點擊時記錄最後位置並停止作畫。
      addDrawingPoint(point);
      isDrawing = false;
      hasClosedPath = false;
      checkPathClosure(point);
      if (drawingTimeElapsed && hasClosedPath) finishDrawing();
      return;
    }

    isDrawing = true;
    points.push(point);
    context.beginPath();
    context.moveTo(point.x, point.y);
    context.lineWidth = 12;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#b70600";

    if (!hasStarted) {
      hasStarted = true;
      // 圓形提示在開始作畫 1.5 秒後閃爍三次，再於 3 秒時消失。
      guideTimer = window.setTimeout(() => {
        let flashCount = 0;
        guideFlashInterval = window.setInterval(() => {
          guideCanvas.style.opacity =
            guideCanvas.style.opacity === "0" ? "1" : "0";
          flashCount += 1;
          if (flashCount === 6) {
            window.clearInterval(guideFlashInterval);
            guideCanvas.style.opacity = "0";
          }
        }, 250);
      }, 1500);
      // 至少作畫五秒；時間到收起提示，並檢查筆跡是否已經首尾相連。
      drawingTimer = window.setTimeout(() => {
        drawingTimeElapsed = true;
        if (hasClosedPath) finishDrawing();
      }, 100);
      promptTimer = window.setTimeout(
        () => instruction.classList.add("is_hidden"),
        8000,
      );
    }
  }

  function continueDrawing(event) {
    if (!isDrawing || isFinished) return;
    event.preventDefault();
    addDrawingPoint(getPoint(event));
  }

  function addDrawingPoint(point) {
    const previousPoint = points[points.length - 1];
    totalPathLength += Math.hypot(
      point.x - previousPoint.x,
      point.y - previousPoint.y,
    );
    points.push(point);
    context.lineTo(point.x, point.y);
    context.stroke();
    checkPathClosure(point);
  }

  function checkPathClosure(endpoint) {
    // 持續確認筆跡首尾是否緊密相連，並要求足夠長的筆跡。
    const startPoint = points[0];
    const distanceToStart = Math.hypot(
      endpoint.x - startPoint.x,
      endpoint.y - startPoint.y,
    );
    hasClosedPath =
      points.length >= 36 && totalPathLength >= 850 && distanceToStart <= 10;
    if (hasClosedPath && drawingTimeElapsed) finishDrawing();
  }

  function calculateSimilarity() {
    if (points.length < 2) return 0;

    // 每個角度取最近的筆跡距離，評估圓周覆蓋率與描線偏差。
    let errorTotal = 0;
    let matchedAngles = 0;
    let pointsNearGuide = 0;
    const angleBins = new Uint8Array(96);
    points.forEach((point) => {
      const dx = point.x - center.x;
      const dy = point.y - center.y;
      const angle = (Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2);
      const targetRadius = getTargetRadius(angle);
      if (Math.abs(Math.hypot(dx, dy) - targetRadius) <= 16) {
        angleBins[Math.floor((angle / (Math.PI * 2)) * angleBins.length)] = 1;
        pointsNearGuide += 1;
      }
    });
    matchedAngles =
      angleBins.reduce((sum, value) => sum + value, 0) / angleBins.length;
    const guidePrecision = pointsNearGuide / points.length;

    for (let index = 0; index < 144; index += 1) {
      const angle = (index / 144) * Math.PI * 2;
      const targetRadius = getTargetRadius(angle);
      const targetX = center.x + Math.cos(angle) * targetRadius;
      const targetY = center.y + Math.sin(angle) * targetRadius;
      let nearest = Infinity;
      points.forEach((point) => {
        nearest = Math.min(
          nearest,
          Math.hypot(point.x - targetX, point.y - targetY),
        );
      });
      errorTotal += Math.min(nearest, 45);
    }

    const averageError = errorTotal / 144;
    const pathAccuracy = Math.max(0, 1 - averageError / 45);
    const similarity = Math.max(
      0,
      Math.min(
        1,
        pathAccuracy * 0.6 + matchedAngles * 0.3 + guidePrecision * 0.1,
      ),
    );
    return similarity;
  }

  function finishDrawing() {
    if (isFinished) return;
    isFinished = true;
    isDrawing = false;
    window.clearTimeout(drawingTimer);
    window.clearTimeout(guideTimer);
    window.clearInterval(guideFlashInterval);
    const similarity = calculateSimilarity();
    const percentage = Math.round(similarity * 100);
    const score = Math.max(-5, Math.min(10, Math.round(similarity * 15 - 5)));
    result.textContent = `準確
    度 ${percentage}%`;
    result.classList.add("is_visible");
    localStorage.setItem("cutChickenScore", String(score));
    localStorage.setItem("cutChickenAccuracy", String(percentage));
    const levelScore =
      Number(localStorage.getItem("level4Score") || "0") + score;
    const totalScore = Number(localStorage.getItem("totalScore") || "0");
    localStorage.setItem("level4Score", String(levelScore));
    localStorage.setItem("totalScore", String(totalScore + score));
    window.setTimeout(() => {
      window.location.href = `./0_5_7.html?accuracy=${encodeURIComponent(percentage)}`;
    }, 3000);
  }

  drawGuide();
  canvas.addEventListener("pointerdown", handleCanvasClick);
  canvas.addEventListener("pointermove", continueDrawing);
});
