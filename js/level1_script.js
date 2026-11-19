// Level 1 的開始、重置分數與關卡導頁行為。
document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("startBtn");
  const nextBtn = document.getElementById("nextBtn");
  const startButtonClock = new Audio("./audio/clock.mp3");
  const startButtonRing = new Audio("./audio/Gtimer_begin_ring.mp3");
  startButtonClock.preload = "auto";
  startButtonRing.preload = "auto";
  startButtonClock.load();
  startButtonRing.load();

  if (startBtn) {
    startBtn.addEventListener("click", (e) => {
      // Prevent the default action so navigation can happen after the press feedback.
      e.preventDefault();
      sessionStorage.setItem("startButtonClockResume", "1");
      sessionStorage.setItem("startButtonClockTime", "0");
      sessionStorage.setItem("startButtonRingResume", "1");
      sessionStorage.setItem("startButtonRingTime", "0");
      startButtonClock.currentTime = 0;
      startButtonClock.play().catch((error) => {
        console.error("Failed to play start button clock:", error);
      });
      startButtonRing.currentTime = 0;
      startButtonRing.play().catch((error) => {
        console.error("Failed to play start button ring:", error);
      });
      const savePlaybackPosition = () => {
        sessionStorage.setItem(
          "startButtonClockTime",
          String(startButtonClock.currentTime),
        );
        sessionStorage.setItem(
          "startButtonRingTime",
          String(startButtonRing.currentTime),
        );
      };
      startButtonClock.addEventListener("timeupdate", savePlaybackPosition);
      startButtonRing.addEventListener("timeupdate", savePlaybackPosition);
      window.addEventListener("pagehide", savePlaybackPosition, { once: true });

      // Level 1 是新遊戲起點，從 0 分開始並記錄本關刷新時要恢復的起始分數。
      localStorage.setItem("level1ScoreBase", "0");
      localStorage.setItem("totalScore", "0");
      [
        "level1Score",
        "level2Score",
        "level3Score",
        "level4Score",
        "level5Score",
        "level6Score",
      ].forEach((key) => {
        localStorage.removeItem(key);
      });
      console.log("[計分] 新遊戲開始，累計總分：0 分");

      setTimeout(() => {
        window.location.href = "./0_2_1.html";
      }, 200);
    });
  }

  if (!startBtn && sessionStorage.getItem("startButtonClockResume") === "1") {
    const resumeClock = async () => {
      startButtonClock.currentTime = Number(
        sessionStorage.getItem("startButtonClockTime") || 0,
      );
      try {
        await startButtonClock.play();
        sessionStorage.removeItem("startButtonClockResume");
        sessionStorage.removeItem("startButtonClockTime");
      } catch (error) {
        console.warn(
          "Waiting for a user gesture to resume clock audio:",
          error,
        );
        ["pointerdown", "touchstart", "click", "keydown"].forEach(
          (eventName) => {
            window.addEventListener(eventName, resumeClock, {
              once: true,
              capture: true,
            });
          },
        );
      }
    };
    resumeClock();
  }

  if (!startBtn && sessionStorage.getItem("startButtonRingResume") === "1") {
    const resumeRing = async () => {
      startButtonRing.currentTime = Number(
        sessionStorage.getItem("startButtonRingTime") || 0,
      );
      try {
        await startButtonRing.play();
        sessionStorage.removeItem("startButtonRingResume");
        sessionStorage.removeItem("startButtonRingTime");
      } catch (error) {
        console.warn("Waiting for a user gesture to resume begin ring:", error);
        ["pointerdown", "touchstart", "click", "keydown"].forEach(
          (eventName) => {
            window.addEventListener(eventName, resumeRing, {
              once: true,
              capture: true,
            });
          },
        );
      }
    };
    resumeRing();
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", (e) => {
      // 保留按鈕按下狀態的視覺回饋後，再前往 Level 2 開場。
      e.preventDefault();

      setTimeout(() => {
        window.location.href = "./0_3.html";
      }, 200);
    });
  }
});
//0.2.1
document.addEventListener("DOMContentLoaded", () => {
  const timer_intro = document.querySelector(".timer_intro");
  const game_timer = document.querySelector(".Gtimer");
  const ending_countdown = new Audio("./audio/count_down.mp3");
  const ending_countdown_duration = 5;
  ending_countdown.preload = "auto";
  ending_countdown.load();
  let ending_countdown_playback = null;
  let ending_countdown_timer = null;

  const go_to_next_page = () => {
    window.location.href = "./0_2_2.html";
  };

  if (timer_intro && game_timer) {
    timer_intro.addEventListener(
      "animationend",
      () => {
        setTimeout(() => {
          game_timer.classList.add("visible");
          start_game_loop();
        }, 1000);
      },
      { once: true },
    );
  }

  // 每次進入或重新整理 Level 1 都回到本關起始分，丟棄尚未完成的本關分數。
  const saved_level_base = Number(localStorage.getItem("level1ScoreBase"));
  let current_score = Number.isFinite(saved_level_base) ? saved_level_base : 0;
  const score_display = document.getElementById("scoreDisplay");

  function update_score_display() {
    if (score_display) score_display.textContent = `分數：${current_score}`;
  }

  localStorage.setItem("totalScore", current_score);
  update_score_display();

  // 每波設定雞的種類、出現位置與持續時間
  const wave_config = [
    {
      duration: 4000,
      chickens: [{ type: 1, holes: [1, 2, , 3, 4, 6, 7, 8, 9] }],
    },
    {
      duration: 4000,
      chickens: [
        { type: 1, holes: [2, 3] },
        { type: 2, holes: [1, 5, 9] },
      ],
    },
    {
      duration: 4000,
      chickens: [{ type: 3, holes: [1, 3, 5, 7, 9] }],
    },
    {
      duration: 4000,
      chickens: [
        { type: 1, holes: [1, 4, 8] },
        { type: 2, holes: [5] },
        { type: 3, holes: [2, 6] },
      ],
    },
  ];

  // 雞種計分：type 1 金雞 +1、type 2 普通雞 +3、type 3 壞雞 -1。
  const score_by_type = { 1: 1, 2: 3, 3: -1 };
  const chicken_sounds = {
    1: new Audio("./audio/catch_chicken.mp3"),
    2: new Audio("./audio/goldG.mp3"),
    3: new Audio("./audio/hurt_sound.mp3"),
  };
  Object.values(chicken_sounds).forEach((sound) => {
    sound.preload = "auto";
  });
  let current_wave_index = 0;

  // 清空所有洞口的雞
  function clear_all_holes() {
    for (let i = 1; i <= 9; i++) {
      const hole = document.getElementById(`hole_${i}`);
      if (hole) hole.innerHTML = "";
    }
  }

  function shuffle(items) {
    for (let i = items.length - 1; i > 0; i--) {
      const random_index = Math.floor(Math.random() * (i + 1));
      [items[i], items[random_index]] = [items[random_index], items[i]];
    }
    return items;
  }

  // 產生一波雞
  function spawn_wave(wave_data) {
    clear_all_holes();

    const chickens_to_spawn = [];
    wave_data.chickens.forEach(({ type, holes }) => {
      holes.forEach((hole_index) => {
        chickens_to_spawn.push({ type, hole_index });
      });
    });

    shuffle(chickens_to_spawn).forEach(({ type, hole_index }, index) => {
      setTimeout(() => {
        const hole = document.getElementById(`hole_${hole_index}`);
        if (!hole) return;

        const chicken = document.createElement("div");
        chicken.classList.add("chicken", `chicken_type_${type}`);
        chicken.dataset.type = type;
        chicken.dataset.is_clicked = "false";

        chicken.addEventListener("click", () => {
          if (chicken.dataset.is_clicked === "true") return;

          chicken.dataset.is_clicked = "true";
          chicken.classList.add("clicked");
          const chicken_sound = chicken_sounds[type];
          chicken_sound.currentTime = 0;
          chicken_sound.play().catch((error) => {
            console.error(`Failed to play chicken type ${type} sound:`, error);
          });
          current_score += score_by_type[type];
          localStorage.setItem("totalScore", current_score);
          localStorage.setItem("level1Score", String(current_score));
          update_score_display();
          console.log(
            `[Level 1] 本關目前 ${current_score} 分，累計總分 ${current_score} 分`,
          );

          setTimeout(() => {
            chicken.remove();
          }, 1000);
        });

        hole.appendChild(chicken);
      }, index * 250);
    });
  }

  // 啟動 16 秒的四波遊戲流程
  function start_game_loop() {
    if (current_wave_index < wave_config.length) {
      const current_wave = wave_config[current_wave_index];
      if (current_wave_index === wave_config.length - 2) {
        // 在最後 5 秒播放 count_down 尾段，並於音效結束時切換頁面。
        ending_countdown_playback = new Promise((resolve) => {
          ending_countdown_timer = window.setTimeout(
            async () => {
              if (ending_countdown.readyState < 1) {
                await Promise.race([
                  new Promise((metadataReady) => {
                    ending_countdown.addEventListener(
                      "loadedmetadata",
                      metadataReady,
                      {
                        once: true,
                      },
                    );
                    ending_countdown.addEventListener("error", metadataReady, {
                      once: true,
                    });
                  }),
                  new Promise((timeout) => window.setTimeout(timeout, 2000)),
                ]);
              }
              const duration = Number.isFinite(ending_countdown.duration)
                ? ending_countdown.duration
                : 11.064;
              try {
                ending_countdown.currentTime = Math.max(
                  0,
                  duration - ending_countdown_duration,
                );
                ending_countdown.addEventListener("ended", go_to_next_page, {
                  once: true,
                });
                await ending_countdown.play();
                resolve(true);
              } catch (error) {
                console.error("Failed to play ending countdown:", error);
                resolve(false);
              }
            },
            Math.max(
              0,
              wave_config
                .slice(current_wave_index)
                .reduce((total, wave) => total + wave.duration, 0) +
                170 -
                ending_countdown_duration * 1000,
            ),
          );
        });
      }
      spawn_wave(current_wave);

      current_wave_index++;

      // 目前波次結束後自動清理
      setTimeout(start_game_loop, current_wave.duration);
    } else {
      // 本關結算時將累計總分限制在 5 到 20 分，並保存供後續關卡接續。
      clear_all_holes();
      current_score = Math.min(20, Math.max(5, current_score));
      localStorage.setItem("totalScore", current_score);
      localStorage.setItem("level1Score", String(current_score));
      update_score_display();
      console.log(
        `[Level 1 結算] 本關得分 ${current_score} 分，累計總分 ${current_score} 分`,
      );

      // 等倒數音效播完再切頁；播放失敗時保留原本 170 毫秒的轉場。
      if (ending_countdown_timer !== null) {
        Promise.resolve(ending_countdown_playback).then((didPlay) => {
          if (!didPlay) window.setTimeout(go_to_next_page, 170);
        });
      } else {
        window.setTimeout(go_to_next_page, 170);
      }
    }
  }

  // 前導動畫結束並等待 1 秒後，顯示計時器並開始遊戲
});
