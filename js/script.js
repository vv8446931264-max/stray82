/* script.js - simple customizer logic for Stray8 demo */

document.addEventListener("DOMContentLoaded", () => {
  // DOM refs
  const baseImg = document.getElementById("baseSneaker");
  const overlayImg = document.getElementById("overlaySneaker");
  const swatches = document.querySelectorAll(".swatch");
  const uploadInput = document.getElementById("uploadInput");
  const uploadName = document.getElementById("uploadName");
  const presets = document.querySelectorAll(".preset");
  const downloadBtn = document.getElementById("downloadBtn");
  const clearBtn = document.getElementById("clearOverlay");
  const message = document.getElementById("message");
  const exportCanvas = document.getElementById("exportCanvas");

  // utility: set overlay src and show/hide
  function setOverlay(src) {
    if (!src) {
      overlayImg.src = "";
      overlayImg.classList.add("hidden");
      return;
    }
    overlayImg.onload = () => {
      overlayImg.classList.remove("hidden");
      message.textContent = "";
    };
    overlayImg.onerror = () => {
      message.textContent = "Failed to load design image.";
      overlayImg.classList.add("hidden");
    };
    overlayImg.src = src;
  }

  // swatch click -> change base
  swatches.forEach(s => {
    s.addEventListener("click", () => {
      swatches.forEach(x => x.classList.remove("active"));
      s.classList.add("active");
      const src = s.getAttribute("data-src");
      baseImg.src = src;
    });
  });

  // upload handling
  uploadInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) {
      uploadName.textContent = "No file chosen";
      return;
    }
    if (!file.type.startsWith("image/")) {
      message.textContent = "Please choose an image file (png/jpg).";
      return;
    }
    uploadName.textContent = file.name;
    const url = URL.createObjectURL(file);
    setOverlay(url);
  });

  // presets
  presets.forEach(p => {
    p.addEventListener("click", () => {
      const src = p.getAttribute("data-src");
      setOverlay(src);
    });
  });

  // clear
  clearBtn.addEventListener("click", () => {
    setOverlay("");
    uploadInput.value = "";
    uploadName.textContent = "No file chosen";
  });

  // download - compose base + overlay on canvas and download PNG
  downloadBtn.addEventListener("click", async () => {
    message.textContent = "Preparing image…";
    try {
      // use natural dimensions for crisp result
      await ensureLoaded(baseImg);
      const w = baseImg.naturalWidth || baseImg.width;
      const h = baseImg.naturalHeight || baseImg.height;

      exportCanvas.width = w;
      exportCanvas.height = h;
      const ctx = exportCanvas.getContext("2d");

      // draw white background (optional)
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);

      // draw base
      ctx.drawImage(baseImg, 0, 0, w, h);

      // draw overlay if exists
      if (overlayImg.src && !overlayImg.classList.contains("hidden")) {
        await ensureLoaded(overlayImg);
        // overlay matching base size, center it
        ctx.drawImage(overlayImg, 0, 0, w, h);
      }

      // create blob and download
      exportCanvas.toBlob((blob) => {
        if (!blob) {
          message.textContent = "Failed to create image.";
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "stray8-mockup.png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        message.textContent = "Download started.";
      }, "image/png");
    } catch (err) {
      console.error(err);
      message.textContent = "Error preparing image.";
    }
  });

  // helper: ensure image is loaded
  function ensureLoaded(img) {
    return new Promise((resolve, reject) => {
      if (!img.src) return resolve();
      if (img.complete && img.naturalWidth !== 0) return resolve();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Image failed to load: " + img.src));
    });
  }

  // footer year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // basic mobile nav toggle
  const mobileToggle = document.getElementById("mobileToggle");
  const nav = document.querySelector(".nav");
  if (mobileToggle && nav) {
    mobileToggle.addEventListener("click", () => {
      if (nav.style.display === "block") nav.style.display = "";
      else nav.style.display = "block";
    });
  }
});
