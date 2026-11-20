// Level 2 的關卡導頁、計分判定與分數回饋行為。
document.addEventListener("DOMContentLoaded", () => {
  const start_button = document.getElementById("mouseBtn");
  const camera_button = document.getElementById("cameraBtn");
  const stop_button = document.getElementById("stopBtn");

  if (start_button) {
    start_button.addEventListener("click", (event) => {
      event.preventDefault();
      window.location.href = "1_4_1_1.html";
    });
  }

  if (camera_button) {
    camera_button.addEventListener("click", (event) => {
      event.preventDefault();
      window.location.href = "1_4_1_2.html";
    });
  }

  const pointer = document.getElementById("scorePointer");
  const zones = Array.from(document.querySelectorAll(".score_zone"));
  const game_background = document.getElementById("Devel3Background");
  const game_stage = document.querySelector(".game_stage");
  const feedback_pairs = Array.from(
    document.querySelectorAll(".feedback_pair"),
  );
  const score_backgrounds = {
    5: { image: "./img/bad_tea.gif", duration: 9200 },
    10: { image: "./img/normal_tea.gif", duration: 7820 },
    25: { image: "./img/good_tea.gif", duration: 9000 },
  };
  const camera_mode = game_stage?.classList.contains("camera_mode") ?? false;
  let is_stopped = false;

  const saved_total = Number(localStorage.getItem("totalScore") ?? "0");
  const total_before_level = Number.isFinite(saved_total) ? saved_total : 0;
  console.log(`[Devel3] 遊戲開始，接續累計總分 ${total_before_level} 分`);

  const settle_game = () => {
    if (is_stopped || !pointer || !game_background || !game_stage) return false;
    is_stopped = true;
    if (stop_button) stop_button.disabled = true;
    pointer.classList.add("is_stopped");

    const pointer_rect = pointer.getBoundingClientRect();
    // 指針沿垂直方向移動，使用指針中心的 Y 座標命中分數區。
    const pointer_position = pointer_rect.top + pointer_rect.height / 2;
    const hit_zone = zones.find((zone, index) => {
      const zone_rect = zone.getBoundingClientRect();
      const is_last_zone = index === zones.length - 1;
      return (
        pointer_position >= zone_rect.top &&
        (pointer_position < zone_rect.bottom ||
          (is_last_zone && pointer_position <= zone_rect.bottom))
      );
    });

    if (!hit_zone) {
      if (stop_button) stop_button.disabled = false;
      pointer.classList.remove("is_stopped");
      is_stopped = false;
      console.error("指針尖端未落在任何分數區域，請檢查長條寬度設定。");
      return false;
    }

    const earned_score = Number(hit_zone.dataset.score);
    const result = score_backgrounds[earned_score];
    const feedback_pair = feedback_pairs.find(
      (pair) => Number(pair.dataset.score) === earned_score,
    );
    if (!result || !feedback_pair) {
      console.error(`找不到 ${earned_score} 分對應的回饋設定。`);
      is_stopped = false;
      return false;
    }

    const current_saved_total = Number(localStorage.getItem("totalScore") ?? "0");
    const current_total = Number.isFinite(current_saved_total) ? current_saved_total : 0;
    const level_score = Number(localStorage.getItem("level3Score") ?? "0") + earned_score;
    const new_score = current_total + earned_score;
    localStorage.setItem("level3Score", String(level_score));
    localStorage.setItem("totalScore", String(new_score));
    console.log(`[Devel3] 本關累計 ${level_score} 分（本次 +${earned_score}）；遊戲總分 ${new_score} 分`);

    if (stop_button) stop_button.setAttribute("aria-label", `已獲得 ${earned_score} 分`);
    game_background.style.backgroundImage = `url("${result.image}")`;
    feedback_pair.classList.add("is_active");
    if (camera_mode) {
      game_stage.classList.add("camera_finished");
      game_stage.dispatchEvent(new Event("gamestopped"));
    }

    // 2 秒後只隱藏綜藝回饋與分數箭頭；茶 GIF 繼續播放到完整片長。
    window.setTimeout(() => {
      game_stage.classList.add("is_transitioning");
    }, 2000);

    window.setTimeout(() => {
      window.location.href = "1_5.html";
    }, result.duration);

    return true;
  };

  if (stop_button) {
    stop_button.addEventListener("click", (event) => {
      event.preventDefault();
      settle_game();
    });
  }

  if (camera_mode && game_stage) {
    game_stage.addEventListener("handfist", settle_game);
  }
});
//過場動畫//
document.addEventListener("DOMContentLoaded", () => {
  const bg_container = document.getElementById("bgContainer");
  const prev_bg = document.getElementById("prevBg");
  const ending_gif = document.getElementById("endingGif");
  if (!bg_container || !ending_gif) return;

  const part1_duration = 500; // 第一段 GIF 長度（毫秒）
  const part2_duration = 2150; // 第二段 GIF 長度（毫秒）

  // 第一段播完後，切換至第二段 GIF
  setTimeout(() => {
    // 1. 換成第二段透明 GIF
    ending_gif.src = "./img/level2_end_animation_2.GIF";

    // 2. 移除/隱藏上一段延伸過來的底層動畫（第二段不要）
    if (prev_bg) {
      prev_bg.style.display = "none";
    }
    bg_container.style.backgroundImage = "none";
    bg_container.style.backgroundColor = "#e57b0b"; // 若要全透明可寫 "transparent"

    // 3. 第二段播完後跳轉至下一頁
    setTimeout(() => {
      window.location.href = "1_5.html";
    }, part2_duration);
  }, part1_duration);
});
