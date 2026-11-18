document.addEventListener("DOMContentLoaded", () => {
  const photoCanvas = document.getElementById("feedbackPhoto");
  const nameElement = document.getElementById("feedbackName");
  const scoreElement = document.getElementById("feedbackScore");
  const photoData = localStorage.getItem("playerPhoto");

  nameElement.textContent = localStorage.getItem("playerName") || "煎蛋高手";
  const totalScore = Number(localStorage.getItem("totalScore") || 0);
  scoreElement.textContent = `${Number.isFinite(totalScore) ? totalScore : 0} `;

  if (!photoData) {
    drawCrossedArms([224, 169, 137]);
    return;
  }
  const photo = new Image();
  photo.onload = () => {
    drawCrossedArms(sampleSkinTone(photo));
    const size = 240;
    const source = document.createElement("canvas");
    source.width = size;
    source.height = size;
    const sourceContext = source.getContext("2d", { willReadFrequently: true });
    const cropSize = Math.min(photo.naturalWidth, photo.naturalHeight);
    const cropX = (photo.naturalWidth - cropSize) / 2;
    const cropY = (photo.naturalHeight - cropSize) / 2;
    sourceContext.drawImage(
      photo,
      cropX,
      cropY,
      cropSize,
      cropSize,
      0,
      0,
      size,
      size,
    );

    const sourcePixels = sourceContext.getImageData(0, 0, size, size);
    const output = photoCanvas.getContext("2d");
    const result = output.createImageData(size, size);
    const center = (size - 1) / 2;
    const radius = center;
    const faceDrop = radius * 0.18;
    // Inverse spherical projection enlarges the center and compresses the rim.
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const dx = (x - center) / radius;
        const dy = (y - center) / radius;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 1) continue;
        const sphericalRadius = (2 / Math.PI) * Math.asin(distance);
        const sourceRadius = Math.pow(sphericalRadius, 1.3);
        const sourceX = Math.round(
          center + (dx / (distance || 1)) * sourceRadius * radius,
        );
        const sourceY = Math.max(
          0,
          Math.min(
            size - 1,
            Math.round(
              center +
                (dy / (distance || 1)) * sourceRadius * radius -
                faceDrop,
            ),
          ),
        );
        const sourceIndex = (sourceY * size + sourceX) * 4;
        const targetIndex = (y * size + x) * 4;
        result.data[targetIndex] = sourcePixels.data[sourceIndex];
        result.data[targetIndex + 1] = sourcePixels.data[sourceIndex + 1];
        result.data[targetIndex + 2] = sourcePixels.data[sourceIndex + 2];
        result.data[targetIndex + 3] = 255;
      }
    }
    output.putImageData(result, 0, 0);

    // Soft edge shading and a broad highlight make the portrait read as a sphere.
    const edgeShade = output.createRadialGradient(
      size * 0.39,
      size * 0.34,
      size * 0.08,
      center,
      center,
      size * 0.51,
    );
    edgeShade.addColorStop(0, "rgba(255,255,255,0.24)");
    edgeShade.addColorStop(0.58, "rgba(255,255,255,0)");
    edgeShade.addColorStop(0.82, "rgba(0,0,0,0.04)");
    edgeShade.addColorStop(1, "rgba(0,0,0,0.62)");
    output.fillStyle = edgeShade;
    output.fillRect(0, 0, size, size);
  };
  photo.src = photoData;

  function sampleSkinTone(portrait) {
    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = portrait.naturalWidth;
    sampleCanvas.height = portrait.naturalHeight;
    const sampleContext = sampleCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    sampleContext.drawImage(portrait, 0, 0);
    const x = Math.floor(portrait.naturalWidth * 0.35);
    const y = Math.floor(portrait.naturalHeight * 0.2);
    const width = Math.max(1, Math.floor(portrait.naturalWidth * 0.3));
    const height = Math.max(1, Math.floor(portrait.naturalHeight * 0.45));
    const pixels = sampleContext.getImageData(x, y, width, height).data;
    let red = 0;
    let green = 0;
    let blue = 0;
    let count = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const r = pixels[index];
      const g = pixels[index + 1];
      const b = pixels[index + 2];
      if (r > g && g > b && r - g < 75 && g - b > 8 && r > 70 && r < 245) {
        red += r;
        green += g;
        blue += b;
        count += 1;
      }
    }
    return count
      ? [
          Math.round(red / count),
          Math.round(green / count),
          Math.round(blue / count),
        ]
      : [224, 169, 137];
  }

  function drawCrossedArms(skin) {
    const canvas = document.getElementById("feedbackBody");
    const context = canvas.getContext("2d");
    const skinColor = `rgb(${skin[0]} ${skin[1]} ${skin[2]})`;
    const shadowColor = `rgb(${Math.max(0, skin[0] - 24)} ${Math.max(0, skin[1] - 24)} ${Math.max(0, skin[2] - 24)})`;

    // Replace the updated artwork's green torso area with the sampled skin tone.
    context.beginPath();
    context.moveTo(776, 456);
    context.lineTo(836, 475);
    context.lineTo(891, 463);
    context.lineTo(976, 455);
    context.lineTo(999, 468);
    context.lineTo(998, 514);
    context.lineTo(774, 517);
    context.closePath();
    context.fillStyle = skinColor;
    context.fill();
    context.strokeStyle = "#b70600";
    context.lineWidth = 7;
    context.lineJoin = "round";
    context.stroke();

    // Two bent forearms overlap across the torso to suggest a confident crossed-arm pose.
    context.beginPath();
    context.moveTo(790, 464);
    context.bezierCurveTo(817, 461, 842, 473, 872, 484);
    context.bezierCurveTo(904, 494, 944, 499, 978, 480);
    context.lineTo(986, 500);
    context.bezierCurveTo(956, 517, 919, 512, 886, 503);
    context.bezierCurveTo(851, 493, 823, 480, 789, 489);
    context.closePath();
    context.fillStyle = skinColor;
    context.fill();
    context.stroke();

    context.beginPath();
    context.moveTo(984, 462);
    context.bezierCurveTo(958, 461, 931, 475, 902, 486);
    context.bezierCurveTo(871, 498, 837, 505, 801, 486);
    context.lineTo(792, 505);
    context.bezierCurveTo(824, 521, 863, 515, 895, 504);
    context.bezierCurveTo(930, 492, 958, 479, 988, 488);
    context.closePath();
    context.fillStyle = shadowColor;
    context.fill();
    context.stroke();
  }
});
