// Level 3 的關卡導頁、計分判定與分數回饋行為。
document.addEventListener("DOMContentLoaded", () => {
  const next_button = document.getElementById("nextBtn");
  const start_button = document.getElementById("startBtn");
  const stop_button = document.getElementById("stopBtn");
  const game_intro_button = document.getElementById("gameIntroButton");
  const game_intro_overlay = document.getElementById("gameIntroOverlay");
  const game_intro_confirm = document.getElementById("gameIntroConfirm");
  const jane_dan_sound = new Audio("./audio/janeDan.mp3");
  jane_dan_sound.preload = "auto";
  // 修改音檔開頭裁切秒數：調整此數值；0.8 代表跳過前 0.8 秒。
  const jane_dan_start_offset_seconds = 0.8;

  if (game_intro_button && game_intro_overlay && game_intro_confirm) {
    const close_game_intro = () => {
      game_intro_overlay.hidden = true;
      game_intro_button.setAttribute("aria-expanded", "false");
      game_intro_button.focus();
    };

    game_intro_button.setAttribute("aria-expanded", "false");
    game_intro_button.addEventListener("click", () => {
      game_intro_overlay.hidden = false;
      game_intro_button.setAttribute("aria-expanded", "true");
      game_intro_confirm.focus();
    });
    game_intro_confirm.addEventListener("click", close_game_intro);
    game_intro_overlay.addEventListener("click", (event) => {
      if (event.target === game_intro_overlay) close_game_intro();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !game_intro_overlay.hidden) {
        close_game_intro();
      }
    });
  }

  const ending_popup = document.querySelector(".popwidow4");
  const ending_popup_overlay = document.getElementById("endingPopupOverlay");
  if (ending_popup && ending_popup_overlay) {
    // 精確分數對照表：其他分數預設使用 bad 結尾。
    const ending_popup_assets_by_score = {
      15: {
        background: "./img/3_end_popupwindow_good.png",
        overlay: "./img/small_good_endpop.GIF",
      },
      10: {
        background: "./img/3_end_popupwindow_normal.png",
        overlay: "./img/small_normal_endpop.GIF",
      },
      5: {
        background: "./img/3_end_popupwindow_bad.png",
        overlay: "./img/small_bad_endpop.GIF",
      },
      0: {
        background: "./img/3_end_popupwindow_bad.png",
        overlay: "./img/small_bad_endpop.GIF",
      },
    };
    const score_param = new URLSearchParams(window.location.search).get(
      "score",
    );
    const query_score = Number(score_param);
    const saved_level_score = Number(
      localStorage.getItem("level3Score") ?? "0",
    );
    const level_score =
      score_param !== null && Number.isFinite(query_score)
        ? query_score
        : Number.isFinite(saved_level_score)
          ? saved_level_score
          : 0;
    const ending_assets =
      ending_popup_assets_by_score[level_score] ??
      ending_popup_assets_by_score[0];

    ending_popup.style.backgroundImage = `url("${ending_assets.background}")`;
    ending_popup_overlay.src = ending_assets.overlay;
    console.log(
      `[Level 3 結尾] 本關 ${level_score} 分，顯示 ${ending_assets.background}`,
    );
  }

  if (next_button) {
    next_button.addEventListener("click", (event) => {
      event.preventDefault();
      setTimeout(() => {
        window.location.href = "./0_5.html";
      }, 200);
    });
  }

  if (start_button) {
    start_button.addEventListener("click", (event) => {
      event.preventDefault();
      localStorage.setItem("level3Score", "0");
      sessionStorage.setItem("playJaneDanAtLevel3Start", "1");
      setTimeout(() => {
        window.location.href = "./0_4_1.html";
      }, 200);
    });
  }

  if (
    !start_button &&
    stop_button &&
    sessionStorage.getItem("playJaneDanAtLevel3Start") === "1"
  ) {
    const play_jane_dan = () => {
      if (jane_dan_sound.readyState < 1) {
        jane_dan_sound.addEventListener("loadedmetadata", play_jane_dan, {
          once: true,
        });
        return;
      }

      jane_dan_sound.currentTime = jane_dan_start_offset_seconds;
      jane_dan_sound
        .play()
        .then(() => {
          sessionStorage.removeItem("playJaneDanAtLevel3Start");
        })
        .catch(() => {
          window.addEventListener("pointerdown", play_jane_dan, {
            once: true,
            capture: true,
          });
        });
    };
    play_jane_dan();
  }

  if (!stop_button) return;

  const pointer = document.getElementById("scorePointer");
  const zones = Array.from(document.querySelectorAll(".score_zone"));
  const feedback_container = document.getElementById("feedbackContainer");
  const feedback_images = {
    0: ["feedbackGif0", "feedbackGif0Top"],
    5: ["feedbackGif5", "feedbackGif5Top", "feedbackGif5Bottom"],
    10: ["feedbackGif10", "feedbackGif10Top"],
    15: ["feedbackGif15", "feedbackGif15Top", "feedbackGif15Bottom"],
  };
  const feedback_images_by_id = Object.fromEntries(
    Object.values(feedback_images)
      .flat()
      .map((id) => [id, document.getElementById(id)]),
  );
  let is_stopped = false;

  stop_button.addEventListener("click", (event) => {
    event.preventDefault();
    if (is_stopped || !pointer || !feedback_container) return;
    is_stopped = true;
    stop_button.disabled = true;
    pointer.classList.add("is_stopped");

    const pointer_rect = pointer.getBoundingClientRect();
    // 取得指標尖端的垂直中心位置（或最前端位置）
    const pointer_tip_y = pointer_rect.top + pointer_rect.height / 2;

    const hit_zone = zones.find((zone, index) => {
      const zone_rect = zone.getBoundingClientRect();
      const is_last_zone = index === zones.length - 1;
      return (
        pointer_tip_y >= zone_rect.top &&
        (pointer_tip_y < zone_rect.bottom ||
          (is_last_zone && pointer_tip_y <= zone_rect.bottom))
      );
    });

    if (!hit_zone) {
      stop_button.disabled = false;
      pointer.classList.remove("is_stopped");
      is_stopped = false;
      console.error("指針尖端未落在任何分數區域，請檢查長條寬度設定。");
      return;
    }

    const earned_score = Number(hit_zone.dataset.score);
    const level_score =
      Number(localStorage.getItem("level3Score") ?? "0") + earned_score;
    const saved_total = Number(localStorage.getItem("totalScore") ?? "0");
    const current_total = Number.isFinite(saved_total) ? saved_total : 0;
    const new_score = current_total + earned_score;
    localStorage.setItem("level3Score", String(level_score));
    localStorage.setItem("totalScore", String(new_score));
    console.log(
      `[Level 3] 本關得分 ${level_score} 分（本次 +${earned_score}），累計總分 ${new_score} 分`,
    );

    Object.values(feedback_images_by_id).forEach((image) => {
      image?.classList.remove("is_active");
    });
    feedback_images[earned_score]?.forEach((id) => {
      feedback_images_by_id[id]?.classList.add("is_active");
    });
    document.body.classList.add("feedback_visible");
    feedback_container.classList.add("is_visible");
    feedback_container.setAttribute("aria-hidden", "false");

    setTimeout(() => {
      feedback_container.classList.remove("is_visible");
      feedback_container.setAttribute("aria-hidden", "true");
      document.body.classList.remove("feedback_visible");
    }, 2000);
    setTimeout(() => {
      window.location.href = `./0_4_2.html?score=${encodeURIComponent(earned_score)}`;
    }, 2000);
  });
  //過場動畫//
});
