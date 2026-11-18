// 將固定 1920×1080 舞台依視窗尺寸等比例縮放並置中。
document.addEventListener("DOMContentLoaded", () => {
  const stage = document.querySelector(".game_stage");
  if (!stage) return;

  const resizeStage = () => {
    const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.setProperty("--stage-scale", String(scale));
  };

  resizeStage();
  window.addEventListener("resize", resizeStage);
});
