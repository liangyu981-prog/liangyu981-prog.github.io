document.addEventListener("DOMContentLoaded", () => {
  const startButton = document.getElementById("startBtn");
  const nextButton = document.getElementById("nextBtn");

  if (startButton) {
    startButton.addEventListener("click", (event) => {
      event.preventDefault();
      localStorage.setItem("level6Score", "0");
      window.setTimeout(() => {
        window.location.href = "./0_7_1.html";
      }, 200);
    });
  }

  if (nextButton) {
    nextButton.addEventListener("click", (event) => {
      event.preventDefault();
      window.setTimeout(() => {
        window.location.href = "./0_8_0.html";
      }, 200);
    });
  }

  const stage = document.querySelector(".game_stage");
  if (stage?.classList.contains("level6_transition")) {
    const getDurationMs = (property) => {
      const value = window
        .getComputedStyle(stage)
        .getPropertyValue(property)
        .trim();
      const duration = Number.parseFloat(value) || 0;
      return value.endsWith("ms") ? duration : duration * 1000;
    };
    const flash = stage.querySelector(".transition_flash");
    const finishShineSound = new Audio("./audio/egg_pancake_finish_shine.mp3");
    finishShineSound.preload = "auto";
    flash.addEventListener("animationstart", (event) => {
      if (event.animationName !== "transitionWhiteFlash") return;
      finishShineSound.currentTime = 0;
      finishShineSound.play().catch((error) => {
        console.error("Failed to play Level 6 finish shine sound:", error);
      });
    }, { once: true });
    window.setTimeout(
      () => {
        stage.querySelector(".transition_fini").classList.add("is_visible");
      },
      getDurationMs("--level6-end-hold") +
        getDurationMs("--level6-flash-duration") / 2,
    );
    flash.addEventListener(
      "animationend",
      (event) => {
        if (event.animationName !== "transitionWhiteFlash") return;
        flash.hidden = true;
        stage.querySelector(".transition_decorations").classList.add("is_visible");
        window.setTimeout(() => {
          window.location.href = "./0_7_3.html";
        }, getDurationMs("--level6-fini-hold"));
      },
      { once: true },
    );
    return;
  }
  if (!stage?.querySelector(".item_selector")) return;

  const assemblyStartedAt = performance.now();
  const pickSound = new Audio("./audio/pick.mp3");
  const putSound = new Audio("./audio/put.mp3");
  [pickSound, putSound].forEach((sound) => {
    sound.preload = "auto";
  });

  const itemSettings = {
    g: {
      icon: { left: 1485, top: 99, width: 194, height: 211 },
      artwork: { left: 821, top: 309, width: 207, height: 376 },
    },
    cake: {
      icon: { left: 1474, top: 445, width: 202, height: 138 },
      artwork: { left: 361, top: 178, width: 991, height: 689 },
    },
    egg: {
      icon: { left: 1472, top: 766, width: 195, height: 148 },
      artwork: { left: 523, top: 255, width: 682, height: 504 },
    },
  };

  let activeDrag = null;
  let completedCount = 0;

  const getAssemblyTransform = () => {
    const styles = window.getComputedStyle(stage);
    return {
      x: Number.parseFloat(styles.getPropertyValue("--assembly-x")) || 0,
      y: Number.parseFloat(styles.getPropertyValue("--assembly-y")) || 0,
      scale:
        Number.parseFloat(styles.getPropertyValue("--assembly-scale")) || 1,
    };
  };

  const getStagePoint = (event) => {
    const bounds = stage.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * 1920,
      y: ((event.clientY - bounds.top) / bounds.height) * 1080,
    };
  };

  const movePreview = (point) => {
    if (!activeDrag) return;
    activeDrag.preview.style.left = `${point.x - activeDrag.grabX}px`;
    activeDrag.preview.style.top = `${point.y - activeDrag.grabY}px`;
  };

  const cancelDrag = () => {
    if (!activeDrag) return;
    activeDrag.preview.remove();
    activeDrag.menuImage.hidden = false;
    activeDrag = null;
  };

  stage.querySelectorAll(".item_selector").forEach((selector) => {
    selector.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || selector.disabled || activeDrag) return;
      event.preventDefault();

      pickSound.currentTime = 0;
      pickSound.play().catch((error) => {
        console.error("Failed to play item pickup sound:", error);
      });

      const item = selector.dataset.item;
      const settings = itemSettings[item];
      const assembly = getAssemblyTransform();
      const point = getStagePoint(event);
      const grabRatioX = Math.min(
        1,
        Math.max(0, (point.x - settings.icon.left) / settings.icon.width),
      );
      const grabRatioY = Math.min(
        1,
        Math.max(0, (point.y - settings.icon.top) / settings.icon.height),
      );
      const preview = document.createElement("div");
      preview.className = "drag_preview";
      preview.setAttribute("aria-hidden", "true");
      preview.style.width = `${settings.artwork.width * assembly.scale}px`;
      preview.style.height = `${settings.artwork.height * assembly.scale}px`;
      preview.style.backgroundImage = `url("./img/big_${item}.PNG")`;
      preview.style.backgroundSize = `${1920 * assembly.scale}px ${1080 * assembly.scale}px`;
      preview.style.backgroundPosition = `-${settings.artwork.left * assembly.scale}px -${settings.artwork.top * assembly.scale}px`;

      const menuImage = stage.querySelector(`[data-menu-item="${item}"]`);
      menuImage.hidden = true;
      stage.appendChild(preview);
      activeDrag = {
        item,
        selector,
        menuImage,
        preview,
        artwork: settings.artwork,
        assembly,
        grabX: grabRatioX * settings.artwork.width * assembly.scale,
        grabY: grabRatioY * settings.artwork.height * assembly.scale,
      };
      movePreview(point);
    });
  });

  document.addEventListener("pointermove", (event) => {
    if (!activeDrag) return;
    movePreview(getStagePoint(event));
  });

  document.addEventListener("pointerup", (event) => {
    if (!activeDrag) return;

    const drag = activeDrag;
    activeDrag = null;
    const point = getStagePoint(event);
    const centerX =
      point.x - drag.grabX + (drag.artwork.width * drag.assembly.scale) / 2;
    const centerY =
      point.y - drag.grabY + (drag.artwork.height * drag.assembly.scale) / 2;
    const targetCenterX =
      (drag.artwork.left + drag.artwork.width / 2) * drag.assembly.scale +
      drag.assembly.x;
    const targetCenterY =
      (drag.artwork.top + drag.artwork.height / 2) * drag.assembly.scale +
      drag.assembly.y;
    const isCorrectPosition =
      Math.abs(centerX - targetCenterX) <=
        drag.artwork.width * drag.assembly.scale * 0.12 &&
      Math.abs(centerY - targetCenterY) <=
        drag.artwork.height * drag.assembly.scale * 0.12;

    drag.preview.remove();

    if (!isCorrectPosition) {
      drag.menuImage.hidden = false;
      return;
    }

    putSound.currentTime = 0;
    putSound.play().catch((error) => {
      console.error("Failed to play item placement sound:", error);
    });

    drag.menuImage.hidden = false;
    drag.selector.disabled = true;
    stage.querySelector(`[data-placed="${drag.item}"]`).hidden = false;
    stage.querySelector(`.placement_ok_${drag.item}`).hidden = false;

    const targetLine = stage.querySelector(`[data-target="${drag.item}"]`);
    targetLine.classList.add("is_fading");
    window.setTimeout(() => {
      targetLine.hidden = true;
    }, 500);

    completedCount += 1;
    if (completedCount === Object.keys(itemSettings).length) {
      const elapsedSeconds = (performance.now() - assemblyStartedAt) / 1000;
      // 門檻依序判斷：10 秒內 17 分、10–15 秒 10 分、15–20 秒 5 分，超過 20 秒 0 分。
      const earnedScore =
        elapsedSeconds <= 10
          ? 17
          : elapsedSeconds <= 15
            ? 10
            : elapsedSeconds <= 20
              ? 5
              : 0;
      const savedTotal = Number(localStorage.getItem("totalScore") ?? "0");
      const currentTotal = Number.isFinite(savedTotal) ? savedTotal : 0;
      const newTotal = currentTotal + earnedScore;
      localStorage.setItem("level6Score", String(earnedScore));
      localStorage.setItem("totalScore", String(newTotal));
      console.log(
        `[Level 6] 本關得分 ${earnedScore} 分（組裝耗時 ${elapsedSeconds.toFixed(2)} 秒），累計總分 ${newTotal} 分`,
      );
      window.setTimeout(() => {
        window.location.href = "./0_7_2.html";
      }, 1000);
    }
  });

  document.addEventListener("pointercancel", cancelDrag);
});
