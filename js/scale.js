// 將固定 1920×1080 舞台依視窗尺寸等比例放大滿版（Cover）並置中
document.addEventListener("DOMContentLoaded", () => {
  const stage = document.querySelector(".game_stage");
  if (stage) {
    const resizeStage = () => {
      // 使用 Math.max 讓畫面等比例放大並 100% 填滿整個螢幕，內部元件座標維持原樣
      const scale = Math.max(window.innerWidth / 1920, window.innerHeight / 1080);
      stage.style.setProperty("--stage-scale", String(scale));
    };

    resizeStage();
    window.addEventListener("resize", resizeStage);
    window.addEventListener("orientationchange", () => {
      setTimeout(resizeStage, 100);
    });
  }

  const orientationQuery = window.matchMedia("(orientation: portrait)");
  const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
  const userAgent = navigator.userAgent || "";
  const isIPadDesktopMode = /Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1;
  const isTouchTablet =
    coarsePointerQuery.matches &&
    navigator.maxTouchPoints > 1 &&
    Math.min(window.screen.width, window.screen.height) <= 1400;
  const isPhoneOrTablet =
    /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(userAgent) ||
    isIPadDesktopMode ||
    isTouchTablet;

  const guard = document.createElement("div");
  guard.className = "orientation_guard";
  guard.setAttribute("role", "alertdialog");
  guard.setAttribute("aria-modal", "true");
  guard.setAttribute("aria-label", "請將螢幕畫面轉為橫向使用");
  guard.innerHTML = "<p>請將螢幕畫面轉為橫向使用</p>";
  guard.hidden = true;
  // 先同步套用遮罩必要版型，避免外部 CSS 載入時序延遲而漏顯示提示。
  guard.style.cssText =
    "position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;width:100vw;height:100vh;height:100dvh;pointer-events:auto;touch-action:none;";
  document.body.append(guard);

  const scaleScriptUrl = document.currentScript?.src || new URL("./js/scale.js", document.baseURI).href;
  const guardStyles = document.createElement("link");
  guardStyles.rel = "stylesheet";
  guardStyles.href = new URL("../css/portrait_guard.css", scaleScriptUrl).href;
  document.head.append(guardStyles);

  const originalStageInert = stage?.inert ?? false;
  function updateOrientationGuard() {
    const shouldBlock = isPhoneOrTablet && orientationQuery.matches;
    if (stage) stage.inert = originalStageInert || shouldBlock;
    guard.hidden = !shouldBlock;
  }

  function handleOrientationChange() {
    updateOrientationGuard();
    window.setTimeout(updateOrientationGuard, 100);
    window.setTimeout(updateOrientationGuard, 300);
  }

  window.addEventListener("resize", updateOrientationGuard);
  window.addEventListener("orientationchange", handleOrientationChange);
  if (typeof orientationQuery.addEventListener === "function") {
    orientationQuery.addEventListener("change", updateOrientationGuard);
  } else {
    orientationQuery.addListener(updateOrientationGuard);
  }
  updateOrientationGuard();
});
