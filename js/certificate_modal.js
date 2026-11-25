document.addEventListener("DOMContentLoaded", () => {
  const openButton = document.getElementById("certificateOpen");
  const modal = document.getElementById("certificateModal");
  const closeButton = document.getElementById("certificateClose");
  function openModal() {
    modal.hidden = false;
    closeButton.focus();
  }

  function closeModal() {
    modal.hidden = true;
    openButton.focus();
  }

  openButton.addEventListener("click", openModal);
  closeButton.addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) closeModal();
  });
});
