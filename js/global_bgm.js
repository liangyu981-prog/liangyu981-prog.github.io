(() => {
  const active_key = "globalBgmActive";
  const position_key = "globalBgmPosition";
  const bgm = new Audio("./audio/BGM.mp3");
  bgm.preload = "auto";
  bgm.loop = true;
  bgm.volume = 0.5;

  // 換頁前保存播放位置，下一頁從同一位置接續全站 BGM。
  const save_position = () => {
    if (sessionStorage.getItem(active_key) === "1") {
      sessionStorage.setItem(position_key, String(bgm.currentTime));
    }
  };

  bgm.addEventListener("timeupdate", save_position);
  window.addEventListener("pagehide", save_position);

  const begin_button = document.getElementById("begin-button");
  if (begin_button) {
    begin_button.addEventListener("click", () => {
      // 只有按下首頁「開始營業」後，才啟動並在後續頁面持續播放。
      sessionStorage.setItem(active_key, "1");
      sessionStorage.setItem(position_key, "0");
      bgm.currentTime = 0;
      bgm.play().catch((error) => {
        console.error("Failed to start global background music:", error);
      });
    });
  }

  if (sessionStorage.getItem(active_key) === "1" && !begin_button) {
    const resume_bgm = () => {
      if (bgm.readyState < 1) {
        bgm.addEventListener("loadedmetadata", resume_bgm, { once: true });
        return;
      }

      bgm.currentTime = Number(sessionStorage.getItem(position_key) || 0);
      bgm.play().catch(() => {
        ["pointerdown", "touchstart", "click", "keydown"].forEach(
          (event_name) => {
            window.addEventListener(event_name, resume_bgm, {
              once: true,
              capture: true,
            });
          },
        );
      });
    };

    resume_bgm();
  }
})();
