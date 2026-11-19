// 開頭結尾的設置
const mouseBtn = document.getElementById("mouseBtn");
const cameraBtn = document.querySelector(".camera_button");
const nextBtn = document.getElementById("nextBtn");

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
