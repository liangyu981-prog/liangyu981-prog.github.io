// 將固定 1920×1080 舞台依視窗尺寸等比例放大滿版（Cover）並置中
document.addEventListener("DOMContentLoaded", () => {
  const stage = document.querySelector(".game_stage");
  if (!stage) return;

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
});
