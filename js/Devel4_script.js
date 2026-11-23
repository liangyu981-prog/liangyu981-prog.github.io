// Level 4 開場頁的開始導頁。
document.addEventListener("DOMContentLoaded", () => {
  const start_button = document.getElementById("mouseBtn");
  const camera_button = document.getElementById("cameraBtn");
  const next_button = document.getElementById("nextBtn");

  start_button?.addEventListener("click", () => {
    window.location.href = "1_5_1_1.html";
  });

  camera_button?.addEventListener("click", () => {
    window.location.href = "1_5_1_2.html";
  });

  next_button?.addEventListener("click", (event) => {
    event.preventDefault();
    next_button.disabled = true;
    window.setTimeout(() => {
      window.location.href = "./1_5_1.html";
    }, 200);
  });

});
document.addEventListener("DOMContentLoaded", () => {
  /*
   * 可調整設定：舞台座標以 1920×1080 為準。
   * teats 的 x/y 是奶頭中心與牛奶起始高度；修改這裡即可微調四條落下路徑。
   * 每波的 duration、count、milk 清單及順序、interval 都在 waves 中設定。
   * xPositions 可填 teats 的索引，也可直接填舞台 X 座標；本設定使用奶頭索引。
   */
  const CONFIG = {
    stage: { width: 1920, height: 1080 },
    totalDuration: 15000,
    scoreStorageKey: "level4MilkScore",
    totalScoreStorageKey: "totalScore",
    maxScore: 25,
    milk: {
      "+3": { src: "./img/3point_milk 1.png", points: 3 },
      "+1": { src: "./img/1point_milk 1.png", points: 1 },
      "-1": { src: "./img/-1point_milk 1.png", points: -1 },
    },
    teats: [
      { x: 555, y: 445 }, // 奶頭 1：修改 x/y 微調掉落起點
      { x: 835, y: 455 }, // 奶頭 2
      { x: 1155, y: 465 }, // 奶頭 3
      { x: 1450, y: 450 }, // 奶頭 4
    ],
    // 牛奶進入杯口後再往下約 35px 才消失。
    bottle: { startX: 765, startY: 650, width: 390, height: 430, catchLine: 90 },
    drop: { width: 200, height: 300, speed: 430 },
    waves: [
      {
        duration: 3000,
        count: 8,
        milk: ["+1"],
        xPositions: [0, 1, 2, 3],
        interval: 3000 / 8,
      },
      {
        duration: 3000,
        count: 5,
        milk: ["+3"],
        xPositions: [0, 1, 2, 3],
        interval: 3000 / 5,
      },
      {
        duration: 3000,
        count: 10,
        milk: ["-1"],
        xPositions: [0, 1, 2, 3],
        interval: 3000 / 10,
      },
      {
        duration: 3000,
        count: 6,
        milk: ["-1", "+3", "+1"],
        xPositions: [0, 1, 2, 3],
        interval: 3000 / 6,
      },
      {
        duration: 3000,
        count: 8,
        milk: ["+3", "+1"],
        xPositions: [0, 1, 2, 3],
        interval: 3000 / 8,
      },
    ],
  };

  const stage = document.querySelector(".game_stage");
  const milk_layer = document.getElementById("milkLayer");
  const bottle = document.getElementById("bottle");
  const teat_markers = document.getElementById("teatMarkers");
  if (!stage || !milk_layer || !bottle || !teat_markers) return;
  const camera_mode = stage.classList.contains("camera_mode");

  // 以絕對定位建立四個不可見奶頭錨點；座標直接對應 CONFIG.teats。
  CONFIG.teats.forEach(({ x, y }) => {
    const anchor = document.createElement("span");
    anchor.className = "teat_anchor";
    anchor.style.left = `${x}px`;
    anchor.style.top = `${y}px`;
    teat_markers.append(anchor);
  });

  const timers = new Set();
  const drops = new Set();
  let score = 0;
  let total_score_before_level = 0;
  let ended = false;
  let game_started = false;
  let bottle_x = CONFIG.bottle.startX;
  let bottle_y = CONFIG.bottle.startY;
  let drag_offset_x = 0;
  let drag_offset_y = 0;
  let active_pointer_id = null;

  const set_bottle_position = (x, y) => {
    // 不限制在舞台範圍內；拖曳到畫布外的部分由舞台 overflow 裁切。
    bottle_x = x;
    bottle_y = y;
    bottle.style.left = `${bottle_x}px`;
    bottle.style.top = `${bottle_y}px`;
  };

  const persist_score = () => {
    try {
      sessionStorage.setItem(CONFIG.scoreStorageKey, String(score));
      localStorage.setItem(
        CONFIG.totalScoreStorageKey,
        String(total_score_before_level + score),
      );
    } catch (error) {
      // 私密瀏覽等環境可能停用儲存；本局仍以記憶體變數正常計分。
    }
    console.log(`[Devel4] 本關分數：${score}；第 3、4 關累計：${total_score_before_level + score}`);
  };

  const stage_point = (event) => {
    const rect = stage.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * CONFIG.stage.width,
      y: ((event.clientY - rect.top) / rect.height) * CONFIG.stage.height,
    };
  };

  bottle.addEventListener("pointerdown", (event) => {
    if (ended) return;
    event.preventDefault();
    const point = stage_point(event);
    drag_offset_x = point.x - bottle_x;
    drag_offset_y = point.y - bottle_y;
    active_pointer_id = event.pointerId;
    bottle.setPointerCapture(event.pointerId);
  });

  bottle.addEventListener("pointermove", (event) => {
    if (event.pointerId !== active_pointer_id || ended) return;
    const point = stage_point(event);
    set_bottle_position(point.x - drag_offset_x, point.y - drag_offset_y);
  });

  const release_pointer = (event) => {
    if (event.pointerId === active_pointer_id) active_pointer_id = null;
  };
  bottle.addEventListener("pointerup", release_pointer);
  bottle.addEventListener("pointercancel", release_pointer);

  stage.addEventListener("bottlecontrolmove", (event) => {
    const x = event.detail && event.detail.x;
    const y = event.detail && event.detail.y;
    if (!camera_mode || ended || !Number.isFinite(x) || !Number.isFinite(y)) return;
    set_bottle_position(x, y);
  });

  const choose = (items) => items[Math.floor(Math.random() * items.length)];

  const overlaps_bottle_top = (drop) => {
    // 瓶口在裁切容器頂部，左右稍微內縮以符合實際瓶口範圍。
    const bottle_opening_left = bottle_x + 25;
    const bottle_opening_right = bottle_x + CONFIG.bottle.width - 25;
    const drop_left = drop.offsetLeft;
    const drop_right = drop_left + drop.offsetWidth;
    return drop_right >= bottle_opening_left && drop_left <= bottle_opening_right;
  };

  const create_drop = (wave) => {
    if (ended) return;
    const milk_type = choose(wave.milk);
    const source = CONFIG.milk[milk_type];
    const catch_line =
      CONFIG.bottle.catchLine + (milk_type === "+3" || milk_type === "-1" ? 70 : 0);
    const position = choose(wave.xPositions);
    const x =
      Number.isInteger(position) &&
      position >= 0 &&
      position < CONFIG.teats.length
        ? CONFIG.teats[position].x
        : position;
    const start_y =
      Number.isInteger(position) &&
      position >= 0 &&
      position < CONFIG.teats.length
        ? CONFIG.teats[position].y
        : 450;
    const drop_width = milk_type === "+1" ? CONFIG.drop.width / 2 : CONFIG.drop.width;
    const drop = document.createElement("img");
    drop.className = milk_type === "+1" ? "milk_drop milk_drop--small" : "milk_drop";
    drop.src = source.src;
    drop.alt = "";
    drop.draggable = false;
    drop.dataset.points = String(source.points);
    drop.dataset.x = String(x - drop_width / 2);
    drop.dataset.y = String(start_y);
    drop.style.left = `${x - drop_width / 2}px`;
    drop.style.top = `${start_y}px`;
    milk_layer.append(drop);
    drops.add(drop);

    const started_at = performance.now();
    // 牛奶底部進入杯口並抵達判定線時判定是否接到。
    let previous_gap = start_y + drop.offsetHeight - (bottle_y + catch_line);
    let has_passed_catch_line = previous_gap >= 0;
    const animate = (now) => {
      if (ended || !drop.isConnected) return;
      const y = start_y + ((now - started_at) / 1000) * CONFIG.drop.speed;
      drop.style.top = `${y}px`;
      const current_gap = y + drop.offsetHeight - (bottle_y + catch_line);
      if (!has_passed_catch_line && previous_gap < 0 && current_gap >= 0) {
        has_passed_catch_line = true;
        // 牛奶底部越過杯內判定線時接到才計分並消失；錯過就繼續落下。
        if (overlaps_bottle_top(drop)) {
          score = Math.min(
            CONFIG.maxScore,
            Math.max(0, score + Number(drop.dataset.points)),
          );
          persist_score();
          drops.delete(drop);
          drop.remove();
          return;
        }
      }
      previous_gap = current_gap;
      // 沒接到的牛奶會繼續落，直到整顆移出 1920×1080 舞台。
      if (y > CONFIG.stage.height) {
        drops.delete(drop);
        drop.remove();
        return;
      }
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  };

  const clear_game = () => {
    ended = true;
    timers.forEach((timer) => clearTimeout(timer));
    timers.clear();
    drops.forEach((drop) => drop.remove());
    drops.clear();
    milk_layer.replaceChildren();
  };

  const finish_game = () => {
    if (ended) return;
    clear_game();
    const total = Number(localStorage.getItem(CONFIG.totalScoreStorageKey) ?? "0");
    console.log(`[Devel4] 本關結束，得分 ${score} 分；最終累計總分 ${Number.isFinite(total) ? total : 0} 分`);
    window.location.href = "./1_5_1.html";
  };

  const start_game = () => {
    if (game_started || ended) return;
    game_started = true;
    try {
      const saved_total = Number(localStorage.getItem(CONFIG.totalScoreStorageKey) ?? "0");
      total_score_before_level = Number.isFinite(saved_total) ? saved_total : 0;
    } catch (error) {
      total_score_before_level = 0;
    }
    persist_score();

    let wave_start = 0;
    CONFIG.waves.forEach((wave) => {
      for (let index = 0; index < wave.count; index += 1) {
        const timer = window.setTimeout(
          () => create_drop(wave),
          wave_start + index * wave.interval,
        );
        timers.add(timer);
      }
      wave_start += wave.duration;
    });

    const finish_timer = window.setTimeout(finish_game, CONFIG.totalDuration);
    timers.add(finish_timer);
  };

  set_bottle_position(bottle_x, bottle_y);
  if (camera_mode) {
    stage.addEventListener("cameraready", start_game, { once: true });
    stage.addEventListener("cameraerror", start_game, { once: true });
  } else {
    start_game();
  }
});
