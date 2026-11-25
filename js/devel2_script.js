// 開頭結尾的設置
const mouseBtn = document.getElementById("mouseBtn");
const cameraBtn = document.querySelector(".camera_button");
const nextBtn = document.getElementById("nextBtn");
const introButton = document.getElementById("gameIntroButton");
const introPages = Array.from(document.querySelectorAll(".game_intro_page"));
const introPrev = document.getElementById("gameIntroPrev");
const introNext = document.getElementById("gameIntroNext");
const introOverlay = document.getElementById("gameIntroOverlay");
const introConfirm = document.getElementById("gameIntroConfirm");
if (
  introButton &&
  introPages.length &&
  introPrev &&
  introNext &&
  introOverlay &&
  introConfirm
) {
  let introPageIndex = 0;
  const showIntroPage = (index) => {
    introPageIndex = (index + introPages.length) % introPages.length;
    introPages.forEach((page, pageIndex) => {
      page.hidden = pageIndex !== introPageIndex;
    });
  };
  const closeIntro = () => {
    introOverlay.hidden = true;
    introButton.setAttribute("aria-expanded", "false");
    introButton.focus();
  };
  introButton.setAttribute("aria-expanded", "false");
  introButton.addEventListener("click", () => {
    showIntroPage(0);
    introOverlay.hidden = false;
    introButton.setAttribute("aria-expanded", "true");
  });
  introPrev.addEventListener("click", () => showIntroPage(introPageIndex - 1));
  introNext.addEventListener("click", () => showIntroPage(introPageIndex + 1));
  introConfirm.addEventListener("click", closeIntro);
  introOverlay.addEventListener("click", (event) => {
    if (event.target === introOverlay) closeIntro();
  });
  document.addEventListener("keydown", (event) => {
    if (introOverlay.hidden) return;
    if (event.key === "ArrowLeft") showIntroPage(introPageIndex - 1);
    if (event.key === "ArrowRight") showIntroPage(introPageIndex + 1);
    if (event.key === "Escape") closeIntro();
  });
  [introButton, introConfirm].forEach((button) => {
    button.addEventListener("pointerdown", () =>
      button.classList.add("is-active"),
    );
    ["pointerup", "pointercancel", "pointerleave", "blur"].forEach(
      (eventName) => {
        button.addEventListener(eventName, () =>
          button.classList.remove("is-active"),
        );
      },
    );
  });
}
if (mouseBtn) {
  mouseBtn.addEventListener("click", (e) => {
    // Prevent the default action so navigation can happen after the press feedback.
    e.preventDefault();
    setTimeout(() => {
      window.location.href = "1_3_1_1.html";
    }, 200);
  });
}
if (cameraBtn) {
  cameraBtn.addEventListener("click", (e) => {
    e.preventDefault();
    setTimeout(() => {
      window.location.href = "1_3_1_2.html";
    }, 200);
  });
}
// 加下一頁的自己改
if (nextBtn) {
  nextBtn.addEventListener("click", (e) => {
    // 保留按鈕按下狀態的視覺回饋後，再前往 Level 2 開場。
    e.preventDefault();
    setTimeout(() => {
      window.location.href = "1_4.html";
    }, 200);
  });
}
// 接下一頁的自己改
