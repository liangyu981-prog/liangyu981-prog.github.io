(() => {
  const active_key = "globalBgmActive";
  const position_key = "globalBgmPosition";
  const is_embedded = window.self !== window.top;
  const is_feedback_page = location.pathname.endsWith("/0_8_1.html");

  // 結果頁會先以 iframe 預載；背景音樂只由最上層頁面管理。
  if (is_embedded) return;
  if (is_feedback_page) {
    sessionStorage.removeItem(active_key);
    sessionStorage.removeItem(position_key);
    return;
  }

  const bgm = new Audio("./audio/BGM.mp3");
  bgm.preload = "auto";
  bgm.loop = true;
  bgm.volume = 0.5;
  const begin_button = document.getElementById("begin-button");

  let position_restored = false;
  let retry_timer = null;

  const save_position = () => {
    if (sessionStorage.getItem(active_key) === "1") {
      sessionStorage.setItem(position_key, String(bgm.currentTime));
    }
  };

  const stop_bgm = () => {
    sessionStorage.removeItem(active_key);
    sessionStorage.removeItem(position_key);
    window.clearInterval(retry_timer);
    retry_timer = null;
    bgm.pause();
    bgm.currentTime = 0;
  };

  const resume_bgm = () => {
    // 首頁只能由「開始營業」的使用者點擊啟動背景音樂。
    if (begin_button) return;
    if (sessionStorage.getItem(active_key) !== "1") return;
    if (bgm.readyState < 1) return;

    if (!position_restored) {
      bgm.currentTime = Number(sessionStorage.getItem(position_key) || 0);
      position_restored = true;
    }
    if (!bgm.paused) return;

    bgm.play().catch(() => {
      // Retry automatically after page load/focus/visibility changes; do not
      // require another click on every screen in the game.
    });
  };

  const ensure_retry = () => {
    if (retry_timer !== null) return;
    retry_timer = window.setInterval(() => {
      if (sessionStorage.getItem(active_key) !== "1") {
        window.clearInterval(retry_timer);
        retry_timer = null;
      } else if (!bgm.paused) {
        window.clearInterval(retry_timer);
        retry_timer = null;
      } else {
        resume_bgm();
      }
    }, 1000);
  };

  bgm.addEventListener("timeupdate", save_position);
  bgm.addEventListener("playing", () => {
    window.clearInterval(retry_timer);
    retry_timer = null;
  });
  bgm.addEventListener("pause", () => {
    if (sessionStorage.getItem(active_key) === "1" && !bgm.ended) {
      ensure_retry();
    }
  });
  window.addEventListener("pagehide", save_position);
  window.addEventListener("pageshow", resume_bgm);
  window.addEventListener("focus", resume_bgm);
  window.addEventListener("global-bgm-stop", stop_bgm);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) resume_bgm();
  });

  if (begin_button) {
    begin_button.addEventListener("click", () => {
      sessionStorage.setItem(active_key, "1");
      sessionStorage.setItem(position_key, "0");
      position_restored = true;
      bgm.currentTime = 0;
      bgm.play().catch(() => ensure_retry());
    });
  }

  if (sessionStorage.getItem(active_key) === "1" && !begin_button) {
    bgm.addEventListener("loadedmetadata", resume_bgm, { once: true });
    resume_bgm();
    ensure_retry();
  }
})();
