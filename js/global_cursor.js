(() => {
  const cursor_style = document.createElement("style");
  cursor_style.textContent = `
    html body,
    html body * {
      cursor: url("./img/cursor_default.png") 25 40, auto !important;
    }

    html.cursor_active,
    html.cursor_active body,
    html.cursor_active body * {
      cursor: url("./img/cursor_click.png") 25 40, auto !important;
    }
  `;
  document.head.appendChild(cursor_style);

  const activate_cursor = () => {
    document.documentElement.classList.add("cursor_active");
  };
  const restore_cursor = () => {
    document.documentElement.classList.remove("cursor_active");
  };

  document.addEventListener("pointerdown", activate_cursor, true);
  window.addEventListener("pointerup", restore_cursor, true);
  window.addEventListener("pointercancel", restore_cursor, true);
  window.addEventListener("blur", restore_cursor);
})();
