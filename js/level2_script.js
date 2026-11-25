// Level 2 的關卡導頁、計分判定與分數回饋行為。
document.addEventListener("DOMContentLoaded", () => {
  const next_button = document.getElementById("nextBtn");
  const start_button = document.getElementById("startBtn");
  const stop_button = document.getElementById("stopBtn");
  const game_intro_button = document.getElementById("gameIntroButton");
  const game_intro_overlay = document.getElementById("gameIntroOverlay");
  const game_intro_confirm = document.getElementById("gameIntroConfirm");

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

  if (next_button) {
    next_button.addEventListener("click", (event) => {
      event.preventDefault();
      setTimeout(() => {
        window.location.href = "./0_3.html";
      }, 200);
    });
  }

  if (start_button) {
    start_button.addEventListener("click", (event) => {
      event.preventDefault();
      localStorage.setItem("level2Score", "0");
      setTimeout(() => {
        window.location.href = "./0_3_1.html";
      }, 200);
    });
  }

  if (!stop_button) return;

  const pointer = document.getElementById("scorePointer");
  const zones = Array.from(document.querySelectorAll(".score_zone"));
  const feedback_container = document.getElementById("feedbackContainer");
  const feedback_gifs = {
    0: document.getElementById("feedbackGif0"),
    5: document.getElementById("feedbackGif5"),
    10: document.getElementById("feedbackGif10"),
    15: document.getElementById("feedbackGif15"),
  };
  const feedback_score = document.getElementById("feedbackScore");
  // 修改音效延遲時間：調整此數值（毫秒）；2000 代表 2 秒，與切頁時間相同。
  const stop_sound_delay_ms = 2000;
  let is_stopped = false;

  stop_button.addEventListener("click", (event) => {
    event.preventDefault();
    if (is_stopped || !pointer || !feedback_container) return;
    is_stopped = true;
    stop_button.disabled = true;
    pointer.classList.add("is_stopped");

    const pointer_rect = pointer.getBoundingClientRect();
    const pointer_tip_x = pointer_rect.left + pointer_rect.width / 2;
    const hit_zone = zones.find((zone, index) => {
      const zone_rect = zone.getBoundingClientRect();
      const is_last_zone = index === zones.length - 1;
      return (
        pointer_tip_x >= zone_rect.left &&
        (pointer_tip_x < zone_rect.right ||
          (is_last_zone && pointer_tip_x <= zone_rect.right))
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
      Number(localStorage.getItem("level2Score") ?? "0") + earned_score;
    const saved_total = Number(localStorage.getItem("totalScore") ?? "0");
    const current_total = Number.isFinite(saved_total) ? saved_total : 0;
    const new_score = current_total + earned_score;
    localStorage.setItem("level2Score", String(level_score));
    localStorage.setItem("totalScore", String(new_score));
    console.log(
      `[Level 2] 本關得分 ${level_score} 分（本次 +${earned_score}），累計總分 ${new_score} 分`,
    );

    if (feedback_score) {
      Object.values(feedback_gifs).forEach((image) => {
        image?.classList.remove("is_active");
      });
      feedback_gifs[earned_score]?.classList.add("is_active");
      // feedback_score.textContent = `獲得 ${earned_score} 分`;
    }
    feedback_container.classList.add("is_visible");
    feedback_container.setAttribute("aria-hidden", "false");

    sessionStorage.setItem(
      "level2EggCrackPlayAt",
      String(Date.now() + stop_sound_delay_ms),
    );
    window.setTimeout(() => {
      feedback_container.classList.remove("is_visible");
      feedback_container.setAttribute("aria-hidden", "true");
    }, 2000);
    window.setTimeout(() => {
      window.location.href = "./0_3_2.html";
    }, 2000);
  });
});
//過場動畫//
document.addEventListener("DOMContentLoaded", () => {
  const bg_container = document.getElementById("bgContainer");
  const prev_bg = document.getElementById("prevBg");
  const ending_gif = document.getElementById("endingGif");
  const ending_frame = document.getElementById("endingFrame");
  if (!bg_container || !ending_gif || !ending_frame) return;

  const sound_play_at = Number(sessionStorage.getItem("level2EggCrackPlayAt"));
  if (Number.isFinite(sound_play_at) && sound_play_at > 0) {
    const sound_age = Date.now() - sound_play_at;
    if (sound_age <= 10000) {
      const egg_crack_sound = new Audio("./audio/egg_crack.mp3");
      egg_crack_sound.preload = "auto";
      egg_crack_sound.load();
      // 修改音檔開頭跳過時間：調整此數值（秒）；0.8 代表跳過前 0.8 秒。
      const egg_crack_start_offset_seconds = 0.8;
      const play_egg_crack = () => {
        if (egg_crack_sound.readyState < 1) {
          egg_crack_sound.addEventListener("loadedmetadata", play_egg_crack, {
            once: true,
          });
          return;
        }

        egg_crack_sound.currentTime = egg_crack_start_offset_seconds;
        egg_crack_sound
          .play()
          .then(() => {
            sessionStorage.removeItem("level2EggCrackPlayAt");
          })
          .catch(() => {
            window.addEventListener("pointerdown", play_egg_crack, {
              once: true,
              capture: true,
            });
          });
      };
      const remaining_delay = Math.max(0, sound_play_at - Date.now());
      if (remaining_delay === 0) {
        play_egg_crack();
      } else {
        window.setTimeout(play_egg_crack, remaining_delay);
      }
    } else {
      sessionStorage.removeItem("level2EggCrackPlayAt");
    }
  }

  const part1_duration = 500; // 第一段 GIF 長度（毫秒）
  const part2_duration = 2150; // 第二段 GIF 長度（毫秒）

  // 第一段播完後，切換至第二段 GIF
  setTimeout(() => {
    // 1. 換成第二段透明 GIF
    ending_gif.src = "./img/level2_end_animation_2.GIF";
    ending_frame.style.backgroundImage = 'url("./img/fried_egg_bg.PNG")';

    // 2. 移除/隱藏上一段延伸過來的底層動畫（第二段不要）
    if (prev_bg) {
      prev_bg.style.display = "none";
    }
    bg_container.style.backgroundImage = "none";
    bg_container.style.backgroundColor = "#e57b0b"; // 若要全透明可寫 "transparent"

    // 3. 第二段播完後跳轉至下一頁
    setTimeout(() => {
      window.location.href = "./0_4.html";
    }, part2_duration);
  }, part1_duration);
});
const game_intro_button = document.getElementById("gameIntroButton");
const game_intro_overlay = document.getElementById("gameIntroOverlay");
const game_intro_confirm = document.getElementById("gameIntroConfirm");

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
