// Level 5 的開始按鈕、計分判定與分數回饋行為。
document.addEventListener("DOMContentLoaded", () => {
  const start_button = document.getElementById("startBtn");
  const next_button = document.getElementById("nextBtn");
  const stop_button = document.getElementById("stopBtn");
  const frying_sound = new Audio("./audio/G_frying.mp3");
  frying_sound.preload = "auto";

  const ending_popup = document.querySelector(".popwidow6");
  const ending_popup_overlay = document.getElementById(
    "level5EndingPopupOverlay",
  );
  if (ending_popup && ending_popup_overlay) {
    const score_param = new URLSearchParams(window.location.search).get(
      "score",
    );
    const query_score = score_param === null ? NaN : Number(score_param);
    const session_score = Number(sessionStorage.getItem("level5EndingScore"));
    const saved_level_score = Number(localStorage.getItem("level5Score"));
    const valid_scores = [5, 10, 15];
    const level_score = [query_score, session_score, saved_level_score].find(
      (score) => valid_scores.includes(score),
    );
    // 色帶結算：上下橘色 5 分 bad、白色 10 分 normal、中央黃色 15 分 good。
    const ending_assets_by_score = {
      5: {
        result: "bad",
        background: "./img/5_end_popupwindow_bad.png",
        overlay: "./img/small_bad_endpop.GIF",
      },
      10: {
        result: "normal",
        background: "./img/5_end_popupwindow_normal.png",
        overlay: "./img/small_normal_endpop.GIF",
      },
      15: {
        result: "good",
        background: "./img/5_end_popupwindow_good.png",
        overlay: "./img/small_good_endpop.GIF",
      },
    };
    const ending_assets =
      ending_assets_by_score[level_score] ?? ending_assets_by_score[5];
    ending_popup.classList.remove("is_bad", "is_normal", "is_good");
    ending_popup.classList.add(`is_${ending_assets.result}`);
    ending_popup.style.backgroundImage = `url("${ending_assets.background}")`;
    ending_popup_overlay.src = ending_assets.overlay;
    console.log(
      `[Level 5 結尾] 本關 ${level_score} 分，底圖 ${ending_assets.background}，GIF ${ending_assets.overlay}`,
    );
  }

  function save_frying_sound_position() {
    if (frying_sound.paused) return;
    sessionStorage.setItem("level5FryingResume", "1");
    sessionStorage.setItem(
      "level5FryingTime",
      String(frying_sound.currentTime),
    );
  }

  function stop_frying_sound() {
    frying_sound.pause();
    frying_sound.currentTime = 0;
    sessionStorage.removeItem("level5FryingResume");
    sessionStorage.removeItem("level5FryingTime");
  }

  if (start_button) {
    start_button.addEventListener("click", (event) => {
      event.preventDefault();
      localStorage.setItem("level5Score", "0");
      sessionStorage.removeItem("level5EndingScore");
      frying_sound.currentTime = 0;
      sessionStorage.setItem("level5FryingResume", "1");
      sessionStorage.setItem("level5FryingTime", "0");
      frying_sound.play().catch((error) => {
        console.error("Failed to play Level 5 frying sound:", error);
      });
      frying_sound.addEventListener("timeupdate", save_frying_sound_position);
      window.addEventListener("pagehide", save_frying_sound_position, {
        once: true,
      });
      setTimeout(() => {
        window.location.href = "./0_6_1.html";
      }, 200);
    });
  }

  if (
    !start_button &&
    stop_button &&
    sessionStorage.getItem("level5FryingResume") === "1"
  ) {
    frying_sound.currentTime = Number(
      sessionStorage.getItem("level5FryingTime") || 0,
    );
    frying_sound.play().catch((error) => {
      console.error("Failed to resume Level 5 frying sound:", error);
    });
    frying_sound.addEventListener("timeupdate", save_frying_sound_position);
  }

  if (next_button) {
    next_button.addEventListener("click", (event) => {
      event.preventDefault();
      setTimeout(() => {
        window.location.href = "./0_7.html";
      }, 200);
    });
  }

  if (!stop_button) return;

  const pointer = document.getElementById("scorePointer");
  const zones = Array.from(document.querySelectorAll(".score_zone"));
  const feedback_container = document.getElementById("feedbackContainer");
  const feedback_images = {
    5: ["feedbackGif5", "feedbackGif5Top", "feedbackGif5Bottom"],
    10: ["feedbackGif10", "feedbackGif10Top", "feedbackGif10Bottom"],
    15: ["feedbackGif15", "feedbackGif15Top", "feedbackGif15Bottom"],
  };
  const feedback_images_by_id = new Map(
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
      console.error("指針未落在任何分數區域，請檢查計分條高度設定。");
      return;
    }

    const earned_score = Number(hit_zone.dataset.score);
    const active_feedback = feedback_images[earned_score];
    if (!active_feedback) {
      stop_button.disabled = false;
      pointer.classList.remove("is_stopped");
      is_stopped = false;
      console.error(`找不到 ${earned_score} 分的回饋設定。`);
      return;
    }

    const saved_total = Number(localStorage.getItem("totalScore") ?? "0");
    const current_total = Number.isFinite(saved_total) ? saved_total : 0;
    const new_total = current_total + earned_score;
    // 本關在此按鈕結算一次，結尾分數就是本次命中的色帶分數。
    const level_score = earned_score;
    localStorage.setItem("level5Score", String(level_score));
    sessionStorage.setItem("level5EndingScore", String(level_score));
    localStorage.setItem("totalScore", String(new_total));
    console.log(
      `[Level 5] 本關得分 ${level_score} 分（本次 +${earned_score}），累計總分 ${new_total} 分`,
    );

    feedback_images_by_id.forEach((image) => {
      image?.classList.remove("is_active");
    });
    active_feedback.forEach((id) => {
      feedback_images_by_id.get(id)?.classList.add("is_active");
    });
    document.body.classList.add("feedback_visible");
    feedback_container.classList.add("is_visible");
    feedback_container.setAttribute("aria-hidden", "false");

    setTimeout(() => {
      feedback_container.classList.remove("is_visible");
      feedback_container.setAttribute("aria-hidden", "true");
      document.body.classList.remove("feedback_visible");
      pointer.classList.remove("is_stopped");
      stop_button.disabled = false;
      is_stopped = false;
      stop_frying_sound();
    }, 2000);
    setTimeout(() => {
      window.location.href = `./0_6_2.html?score=${level_score}`;
    }, 2000);
  });
});
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
