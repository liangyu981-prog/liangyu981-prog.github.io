document.addEventListener("DOMContentLoaded", async () => {
  const feedbackPage = preloadFeedbackPage();
  const animation = document.querySelector(".end_animation");
  const animationUrl = "./img/end_animation_once.gif?v=4";

  const [cycleDuration] = await Promise.all([
    measureGifDuration(animationUrl),
    animation?.decode?.().catch(() => null),
  ]);

  window.setTimeout(async () => {
    const canShowPreloadedPage = await feedbackPage.ready;
    // Hold the final animation frame briefly, then reveal the already-loaded page.
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    if (!canShowPreloadedPage) {
      window.location.href = "./0_8_1.html";
      return;
    }

    feedbackPage.frame.inert = false;
    feedbackPage.frame.setAttribute("aria-hidden", "false");
    feedbackPage.frame.classList.add("is_active");
    feedbackPage.frame.contentDocument.documentElement.classList.remove(
      "preload-transition",
    );
    document.querySelector(".game_stage")?.setAttribute("hidden", "");
    window.history.replaceState(null, "", "./0_8_1.html");
    document.title = feedbackPage.frame.contentDocument.title;
  }, cycleDuration);
});

async function measureGifDuration(source) {
  try {
    const response = await fetch(source);
    if (!response.ok) throw new Error("Could not load ending animation");
    const bytes = new Uint8Array(await response.arrayBuffer());
    let duration = 0;
    for (let index = 0; index + 7 < bytes.length; index += 1) {
      if (
        bytes[index] === 0x21 &&
        bytes[index + 1] === 0xf9 &&
        bytes[index + 2] === 0x04
      ) {
        duration += (bytes[index + 4] | (bytes[index + 5] << 8)) * 10;
        index += 7;
      }
    }
    return duration > 0 ? duration : 12410;
  } catch {
    return 12410;
  }
}

function preloadFeedbackPage() {
  const frame = document.createElement("iframe");
  frame.className = "feedback_transition_frame";
  frame.title = "成果回饋單";
  frame.setAttribute("aria-hidden", "true");
  frame.inert = true;

  const ready = new Promise((resolve) => {
    const timeout = window.setTimeout(() => resolve(false), 10000);
    frame.addEventListener("load", async () => {
      try {
        const innerDocument = frame.contentDocument;
        if (innerDocument.documentElement.dataset.feedbackReady !== "true") {
          await new Promise((feedbackReady) => {
            innerDocument.defaultView.addEventListener(
              "feedback-ready",
              feedbackReady,
              { once: true },
            );
          });
        }
        await Promise.all(
          Array.from(innerDocument.images, (image) =>
            image.decode?.().catch(() => null),
          ),
        );
        await innerDocument.fonts?.ready;
        window.clearTimeout(timeout);
        resolve(true);
      } catch {
        window.clearTimeout(timeout);
        resolve(false);
      }
    }, { once: true });
    frame.addEventListener("error", () => {
      window.clearTimeout(timeout);
      resolve(false);
    }, { once: true });
  });

  frame.src = "./0_8_1.html?preload-transition=1";
  document.body.appendChild(frame);
  return { frame, ready };
}
