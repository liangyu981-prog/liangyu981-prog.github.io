document.addEventListener("DOMContentLoaded", async () => {
  const animationStartedAt = performance.now();
  const feedbackReady = preloadFeedbackPage();
  let cycleDuration = 12410;

  try {
    const response = await fetch("./img/end_animation_once.gif?v=3");
    if (response.ok) {
      const bytes = new Uint8Array(await response.arrayBuffer());
      let measuredDuration = 0;
      for (let index = 0; index + 7 < bytes.length; index += 1) {
        if (
          bytes[index] === 0x21 &&
          bytes[index + 1] === 0xf9 &&
          bytes[index + 2] === 0x04
        ) {
          measuredDuration += (bytes[index + 4] | (bytes[index + 5] << 8)) * 10;
          index += 7;
        }
      }
      if (measuredDuration > 0) cycleDuration = measuredDuration;
    }
  } catch {
    // Keep the measured 12.41 second duration if the GIF cannot be fetched.
  }

  const remainingTime = Math.max(
    0,
    cycleDuration - (performance.now() - animationStartedAt),
  );
  window.setTimeout(async () => {
    await feedbackReady;
    // Keep the final GIF frame visible briefly while the decoded feedback page is ready.
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    window.location.href = "./0_8_1.html";
  }, remainingTime);
});

function preloadFeedbackPage() {
  const files = [
    "./0_8_1.html",
    "./css/Kend_feedback.css",
    "./js/Kend_feedback.js",
  ];
  const fetchPageFiles = Promise.all(
    files.map((file) => fetch(file, { cache: "force-cache" }).catch(() => null)),
  );
  const images = [
    "./img/end_feedback.png",
    "./img/end_feedback_pic.png",
    "./img/end_feedback_hat.png",
    "./img/end_feedback_decoration.png",
  ];
  const decodeImages = Promise.all(
    images.map((source) => {
      const image = new Image();
      image.src = source;
      return image.decode?.().catch(() => null) ?? new Promise((resolve) => {
        image.onload = resolve;
        image.onerror = resolve;
      });
    }),
  );
  const preload = Promise.all([fetchPageFiles, decodeImages]);
  const timeout = new Promise((resolve) => window.setTimeout(resolve, 4000));
  return Promise.race([preload, timeout]);
}
