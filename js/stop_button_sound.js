document.querySelectorAll(".stop_button").forEach((button) => {
  const stop_sound = new Audio("./audio/stop_button.mp3");
  stop_sound.preload = "auto";

  button.addEventListener("click", () => {
    stop_sound.currentTime = 0;
    stop_sound.play().catch((error) => {
      console.error("Failed to play stop button sound:", error);
    });
  });
});
