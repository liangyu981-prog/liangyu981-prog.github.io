document.addEventListener("DOMContentLoaded", () => {
  const nameElement = document.getElementById("feedbackName");
  const scoreElement = document.getElementById("feedbackScore");
  const totalScore = Number(localStorage.getItem("totalScore") || 0);

  nameElement.textContent = localStorage.getItem("playerName") || "煎蛋高手";
  scoreElement.textContent = `${Number.isFinite(totalScore) ? totalScore : 0} `;
  document.documentElement.dataset.feedbackReady = "true";
  window.dispatchEvent(new Event("feedback-ready"));
});
