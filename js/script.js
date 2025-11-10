/* script.js - STRAY8 static site logic
   - Direct unsigned Cloudinary uploads
   - Posts mockup request to Formspree (or any webhook)
   - Saves recent uploaded images to localStorage for UGC preview
*/

/* >>> CONFIG - Replace these with your own values <<< */
const CLOUDINARY_CLOUD_NAME = "YOUR_CLOUD_NAME";
const CLOUDINARY_UPLOAD_PRESET = "YOUR_UNSIGNED_PRESET";
const FORMSPREE_ENDPOINT = "https://formspree.io/f/YOUR_FORM_ID"; // or your webhook

/* ---------- Demo product data (replace images in /images/) ---------- */
const PRODUCTS = [
  { id: 1, name: "Blue Moon — Handpaint", priceFrom: 12800, customizeFrom: 2999, img: "/images/bluemoon.jpg" },
  { id: 2, name: "Shadow Samurai", priceFrom: 13999, customizeFrom: 2999, img: "/images/shadow.jpg" },
  { id: 3, name: "Homer Cash", priceFrom: 9999, customizeFrom: 2499, img: "/images/homer.jpg" },
  { id: 4, name: "Rihanna Tee", priceFrom: 1999, customizeFrom: 999, img: "/images/rihanna.jpg" },
];

/* ---------- Helper: render products on page ---------- */
function renderProducts() {
  const grid = document.getElementById("productGrid");
  grid.innerHTML = "";
  PRODUCTS.forEach(p => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="${p.img}" alt="${p.name}" style="width:100%;height:220px;object-fit:cover;border-radius:8px" />
      <div style="margin-top:10px"><strong>${p.name}</strong></div>
      <div class="muted" style="margin-top:6px">From ₹${p.priceFrom.toLocaleString()} · Customize from ₹${p.customizeFrom.toLocaleString()}</div>
      <div style="margin-top:10px;display:flex;gap:8px">
        <button class="btn-primary btn-cta" data-id="${p.id}">Customize</button>
        <button class="btn-ghost">Quick View</button>
      </div>
    `;
    grid.appendChild(card);
  });

  // attach listeners to customize buttons
  document.querySelectorAll(".btn-cta").forEach(btn => {
    btn.addEventListener("click", () => openCreateModal());
  });
}

/* ---------- Modal controls ---------- */
const openBtns = [ document.getElementById("openCreateBtn"), document.getElementById("openCreateCta") ];
const modal = document.getElementById("createModal");
const closeModalBtn = document.getElementById("closeModal");
const fileInput = document.getElementById("fileInput");
const previewWrap = document.getElementById("previewWrap");
const previewImg = document.getElementById("previewImg");
const statusEl = document.getElementById("status");
const resetBtn = document.getElementById("resetBtn");

function openCreateModal(){ modal.classList.remove("hidden"); statusEl.textContent = ""; }
function closeCreateModal(){ modal.classList.add("hidden"); clearForm(); }
openBtns.forEach(b => { if(b) b.addEventListener("click", openCreateModal); });
if (closeModalBtn) closeModalBtn.addEventListener("click", closeCreateModal);
if (resetBtn) resetBtn.addEventListener("click", clearForm);

/* ---------- Preview uploaded file ---------- */
fileInput.addEventListener("change", e => {
  const f = e.target.files[0];
  if (!f) return;
  if (f.size > 20 * 1024 * 1024) {
    statusEl.textContent = "File too large (max 20MB).";
    fileInput.value = "";
    return;
  }
  const url = URL.createObjectURL(f);
  previewImg.src = url;
  previewWrap.classList.remove("hidden");
  statusEl.textContent = "";
});

/* ---------- Upload to Cloudinary (unsigned preset) ---------- */
async function uploadToCloudinary(file) {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) throw new Error("Cloudinary config not set.");
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  // optional: fd.append('folder','stray8/uploads');
  const res = await fetch(url, { method: "POST", body: fd });
  if (!res.ok) throw new Error("Upload failed");
  return res.json(); // contains secure_url, public_id etc.
}

/* ---------- Send mockup request to Formspree (or webhook) ---------- */
async function sendMockupRequest(imageUrl, email, phone) {
  if (!FORMSPREE_ENDPOINT) {
    console.warn("No Formspree endpoint configured; mockup request not sent.");
    return { ok: true };
  }
  const payload = { imageUrl, email, phone, timestamp: new Date().toISOString() };
  const res = await fetch(FORMSPREE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return res;
}

/* ---------- Form submit handler ---------- */
document.getElementById("uploadForm").addEventListener("submit", async function(e){
  e.preventDefault();
  statusEl.textContent = "";
  const file = fileInput.files[0];
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const ip = document.getElementById("ipCheckbox").checked;

  if (!file) { statusEl.textContent = "Please upload a file."; return; }
  if (!email) { statusEl.textContent = "Please enter your email."; return; }
  if (!ip) { statusEl.textContent = "Please confirm rights to the artwork."; return; }

  try {
    statusEl.textContent = "Uploading to Cloudinary…";
    const cloudData = await uploadToCloudinary(file);
    const imageUrl = cloudData.secure_url || cloudData.url;
    statusEl.textContent = "Sending mockup request…";
    await sendMockupRequest(imageUrl, email, phone);

    // Save to recent uploads (localStorage)
    addRecentUpload(imageUrl);
    renderRecentUploads();

    statusEl.textContent = "";
    alert("Mockup request received. We'll email you within 24 hours.");
    closeCreateModal();
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Upload failed: " + (err.message || err);
  }
});

/* ---------- Recent uploads (simple localStorage UGC) ---------- */
function getRecentUploads() {
  try {
    return JSON.parse(localStorage.getItem("stray8_uploads") || "[]");
  } catch { return []; }
}
function addRecentUpload(url) {
  const list = getRecentUploads();
  list.unshift({ url, t: Date.now() });
  if (list.length > 12) list.pop();
  localStorage.setItem("stray8_uploads", JSON.stringify(list));
}
function renderRecentUploads() {
  const container = document.getElementById("recentUploads");
  container.innerHTML = "";
  const list = getRecentUploads();
  if (list.length === 0) {
    container.innerHTML = '<div class="muted">No uploads yet — your uploaded mockups will appear here.</div>';
    return;
  }
  list.forEach(item => {
    const img = document.createElement("img");
    img.src = item.url;
    img.alt = "Uploaded design";
    container.appendChild(img);
  });
}

/* ---------- utilities ---------- */
function clearForm(){
  document.getElementById("uploadForm").reset();
  previewWrap.classList.add("hidden");
  previewImg.src = "";
  statusEl.textContent = "";
}

/* ---------- init on load ---------- */
document.getElementById("year").textContent = new Date().getFullYear();
renderProducts();
renderRecentUploads();
