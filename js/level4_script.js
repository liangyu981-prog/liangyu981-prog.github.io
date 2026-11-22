// Level 4 的開始按鈕與關卡導頁行為。
document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("startBtn");
  const nextBtn = document.getElementById("nextBtn");
  const start_sounds = [
    { audio: new Audio("./audio/clock.mp3"), key: "level4Clock" },
    { audio: new Audio("./audio/Gtimer_begin_ring.mp3"), key: "level4BeginRing" },
  ];
  start_sounds.forEach(({ audio }) => {
    audio.preload = "auto";
    audio.load();
  });

  if (startBtn) {
    startBtn.addEventListener("click", (e) => {
      // Prevent the default action so navigation can happen after the press feedback.
      e.preventDefault();

      const current_page = window.location.pathname.split("/").pop();
      if (current_page !== "0_5_7.html") {
        localStorage.setItem("level4Score", "0");
      }
      const save_start_sound_positions = () => {
        start_sounds.forEach(({ audio, key }) => {
          sessionStorage.setItem(`${key}Resume`, "1");
          sessionStorage.setItem(`${key}Time`, String(audio.currentTime));
        });
      };
      start_sounds.forEach(({ audio, key }) => {
        audio.currentTime = 0;
        sessionStorage.setItem(`${key}Resume`, "1");
        sessionStorage.setItem(`${key}Time`, "0");
        audio.play().catch((error) => {
          console.error("Failed to play Level 4 start sound:", error);
        });
        audio.addEventListener("timeupdate", save_start_sound_positions);
      });
      window.addEventListener("pagehide", save_start_sound_positions, {
        once: true,
      });

      const next_page =
        current_page === "0_5_5.html"
          ? "./0_5_6.html"
          : current_page === "0_5_7.html"
            ? "./0_6.html"
            : "./0_5_1.html";
      setTimeout(() => {
        window.location.href = next_page;
      }, 200);
    });
  }

  if (!startBtn && document.querySelector(".ans_button")) {
    start_sounds.forEach(({ audio, key }) => {
      if (sessionStorage.getItem(`${key}Resume`) !== "1") return;

      const resume_start_sound = async () => {
        audio.currentTime = Number(sessionStorage.getItem(`${key}Time`) || 0);
        try {
          await audio.play();
          sessionStorage.removeItem(`${key}Resume`);
          sessionStorage.removeItem(`${key}Time`);
        } catch {
          window.addEventListener("pointerdown", resume_start_sound, {
            once: true,
            capture: true,
          });
        }
      };
      resume_start_sound();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", (e) => {
      // 保留按鈕按下狀態的視覺回饋後，再前往 Level 2 開場。
      e.preventDefault();

      setTimeout(() => {
        window.location.href = "./0_5_5.html";
      }, 200);
    });
  }
});
document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".ans_button");
  const timer_intro = document.querySelector(".timer_intro");
  const game_timer = document.querySelector(".Gtimer");
  const clock_sound = new Audio("./audio/clock.mp3");
  clock_sound.preload = "auto";
  const count_down_sound = new Audio("./audio/count_down.mp3");
  count_down_sound.preload = "auto";
  count_down_sound.load();
  const answer_sounds = {
    correct: new Audio("./audio/correct_answer_sound.mp3"),
    wrong: new Audio("./audio/wrong_answer_sound.mp3"),
  };
  Object.values(answer_sounds).forEach((sound) => {
    sound.preload = "auto";
  });
  // GIF 計時器共 150 格，每格 30 毫秒，第一輪共 4500 毫秒。
  const timer_duration = 150 * 30;
  const transition_delay = 1000;
  let isAnswered = false; // 防止玩家連續狂點

  function lock_answers() {
    buttons.forEach((button) => {
      button.disabled = true;
    });
  }

  function start_timer() {
    if (isAnswered) return;
    const timer_image = game_timer.querySelector("img");

    if (!timer_image?.dataset.src) {
      console.error("遊戲計時器圖片來源不存在。");
      return;
    }

    timer_image.addEventListener(
      "load",
      () => {
        if (isAnswered) return;
        const play_count_down = async () => {
          if (count_down_sound.readyState < 1) {
            await new Promise((metadataReady) => {
              count_down_sound.addEventListener("loadedmetadata", metadataReady, {
                once: true,
              });
              count_down_sound.addEventListener("error", metadataReady, {
                once: true,
              });
            });
          }
          const duration = Number.isFinite(count_down_sound.duration)
            ? count_down_sound.duration
            : 11.064;
          count_down_sound.currentTime = Math.max(0, duration - 6);
          // 把 6 秒音效配合 4.5 秒倒數與 1 秒轉場播完，不更動畫面計時。
          count_down_sound.playbackRate =
            6000 / (timer_duration + transition_delay);
          count_down_sound.preservesPitch = true;
          count_down_sound.play().catch((error) => {
            console.error("Failed to play Level 4 countdown sound:", error);
          });
        };
        play_count_down();

        const current_path = window.location.pathname;
        if (
          current_path.endsWith("0_5_2.html") ||
          current_path.endsWith("0_5_3.html")
        ) {
          clock_sound.currentTime = 0;
          clock_sound.play().catch((error) => {
            console.error("Failed to play Level 4 clock sound:", error);
          });
        }
        game_timer.classList.add("visible");
        setTimeout(() => {
          if (isAnswered) return;
          game_timer.classList.remove("visible");
          isAnswered = true;
          lock_answers();
          answer_sounds.wrong.currentTime = 0;
          answer_sounds.wrong.play().catch((error) => {
            console.error("Failed to play unanswered question sound:", error);
          });
          setTimeout(go_to_next_question, transition_delay);
        }, timer_duration);
      },
      { once: true },
    );
    timer_image.addEventListener(
      "error",
      () => console.error("遊戲計時器圖片載入失敗。"),
      { once: true },
    );
    timer_image.src = timer_image.dataset.src;
  }

  function go_to_next_question() {
    const currentPath = window.location.pathname;

    if (currentPath.includes("0_5_1.html")) {
      window.location.href = "./0_5_2.html";
    } else if (currentPath.includes("0_5_2.html")) {
      window.location.href = "./0_5_3.html";
    } else if (currentPath.includes("0_5_3.html")) {
      window.location.href = "./0_5_4.html";
    }
  }

  if (game_timer && timer_intro) {
    timer_intro.addEventListener("animationend", start_timer, { once: true });
  } else if (game_timer) {
    start_timer();
  }

  buttons.forEach((button) => {
    button.addEventListener("click", (event) => {
      if (isAnswered) return;
      isAnswered = true;
      lock_answers();
      game_timer?.classList.remove("visible");

      // 1. 強制加上點擊時的樣式類別（確保點擊圖能順利顯示）
      button.classList.add("is_clicked");

      const resultType = button.getAttribute("data-answer");
      const answer_sound = answer_sounds[resultType];
      if (answer_sound) {
        answer_sound.currentTime = 0;
        answer_sound.play().catch((error) => {
          console.error(`Failed to play ${resultType} answer sound:`, error);
        });
      }
      const earnedScore = resultType === "correct" ? 6 : 0;
      const levelScore = Number(localStorage.getItem("level4Score") ?? "0") + earnedScore;
      const currentTotal = Number(localStorage.getItem("totalScore") ?? "0");
      const newTotal = currentTotal + earnedScore;
      localStorage.setItem("level4Score", String(levelScore));
      localStorage.setItem("totalScore", String(newTotal));

      console.log(
        `[Level 4] 本關得分 ${levelScore} 分（本題 +${earnedScore}），累計總分 ${newTotal} 分`,
      );

      setTimeout(go_to_next_question, transition_delay);
    }); // 這裡關閉 click 事件
  }); // 這裡關閉 forEach
}); // 這裡關閉 DOMContentLoaded
