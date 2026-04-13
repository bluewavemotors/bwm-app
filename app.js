const API_URL = "https://script.google.com/macros/s/AKfycbwwE7Vh-aojmNafegOxlHAZhbqbBW9YRZI6LpjE3oAxPb70zRfKvci3CyxfkafGLF75/exec";

let carsData = [];
let imageSelectionState = {}; // { carId: Set<imageIndex> }

// ─── PRICE ────────────────────────────────────────────────────────────────────
// Handles: plain numbers, "29.75 lakh", "29.75 l", "1.15 crore", "1.15 cr"
function parsePrice(price) {
  if (!price) return 0;
  const clean = price.toString().replace(/,/g, '').toLowerCase().trim();
  if (clean.includes('crore') || clean.includes('cr')) return parseFloat(clean) * 10000000;
  if (clean.includes('lakh')  || clean.includes('l'))  return parseFloat(clean) * 100000;
  return parseFloat(clean) || 0;
}

// Displays: ₹ 29.75 L  /  ₹ 1.15 Cr  /  ₹ 85,000
function formatPrice(price) {
  const n = parsePrice(price);
  if (!n || isNaN(n)) return price;
  if (n >= 10000000) return '₹ ' + (n / 10000000).toFixed(2) + ' Cr';
  if (n >= 100000)   return '₹ ' + (n / 100000).toFixed(2) + ' L';
  return '₹ ' + n.toLocaleString('en-IN');
}

// ─── DATE ─────────────────────────────────────────────────────────────────────
function formatDateTime(date) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const d = new Date(date);
  const day   = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year  = d.getFullYear();
  let hours   = d.getHours();
  const mins  = String(d.getMinutes()).padStart(2, '0');
  const secs  = String(d.getSeconds()).padStart(2, '0');
  const ampm  = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${day}-${month}-${year} ${String(hours).padStart(2,'0')}:${mins}:${secs} ${ampm}`;
}

// ─── CLEAR BUTTON ─────────────────────────────────────────────────────────────
function updateClearButton() {
  document.getElementById("clearBtn").style.display =
    document.getElementById("search").value.trim() ? "block" : "none";
}

// ─── GOOGLE DRIVE IMAGES ──────────────────────────────────────────────────────
// Expects car.images = comma-separated Google Drive file IDs
// Drive files must be shared as "Anyone with the link can view"
function parseDriveImages(imagesField) {
  if (!imagesField) return [];
  return imagesField.toString().split(',')
    .map(id => id.trim())
    .filter(Boolean)
    .map(id => `https://drive.google.com/thumbnail?id=${id}&sz=w600`);
}

// ─── IMAGE SLIDER ─────────────────────────────────────────────────────────────
function buildImageSlider(images, carId) {
  if (!images.length) {
    return '<div class="no-image">No images available</div>';
  }

  const imgHtml = images.map((url, i) => `
    <div class="img-wrap" id="imgwrap-${carId}-${i}" onclick="toggleImageSelect('${carId}', ${i})">
      <img src="${url}" loading="lazy"
        onerror="this.closest('.img-wrap').style.display='none'"
        alt="Car photo ${i + 1}">
      <div class="img-check" id="imgcheck-${carId}-${i}"></div>
    </div>
  `).join('');

  return `
    <div class="image-slider">${imgHtml}</div>
    <div class="img-hint">Tap images to select for sharing</div>
  `;
}

function toggleImageSelect(carId, index) {
  if (!imageSelectionState[carId]) imageSelectionState[carId] = new Set();
  const set = imageSelectionState[carId];
  set.has(index) ? set.delete(index) : set.add(index);

  const check = document.getElementById(`imgcheck-${carId}-${index}`);
  const wrap  = document.getElementById(`imgwrap-${carId}-${index}`);
  if (check) check.classList.toggle('selected', set.has(index));
  if (wrap)  wrap.classList.toggle('img-selected', set.has(index));
}

// ─── LOAD CARS ────────────────────────────────────────────────────────────────
async function loadCars() {
  const loadingDiv     = document.getElementById("loading");
  const lastUpdatedDiv = document.getElementById("lastUpdated");

  // Restore saved filter state
  const savedFilters = JSON.parse(localStorage.getItem("bwm_filters") || "{}");
  document.getElementById("search").value         = savedFilters.search       || "";
  document.getElementById("showroomOnly").checked  = savedFilters.showroomOnly || false;
  document.getElementById("budgetFilter").value    = savedFilters.budget       || "";
  updateClearButton();

  // ✅ Handle snapshot share link: ?share=SHARE_ID
  const params  = new URLSearchParams(window.location.search);
  const shareId = params.get('share');
  if (shareId) {
    await loadSharedCar(shareId);
    return;
  }

  try {
    loadingDiv.style.display = "block";
    loadingDiv.innerHTML = '<span class="loader"></span> Loading cars...';

    // ✅ Cache busting — always fetches fresh data
    const response = await fetch(API_URL + '?t=' + Date.now());
    if (!response.ok) throw new Error("API error");

    const result = await response.json();
    let serverVersion, cars;

    if (Array.isArray(result)) {
      cars = result; serverVersion = "old";
    } else {
      cars = result.cars || []; serverVersion = result.lastUpdated;
    }

    const storedVersion = localStorage.getItem("bwm_version");
    if (storedVersion === serverVersion) {
      const cached = localStorage.getItem("bwm_cars");
      if (cached) {
        carsData = JSON.parse(cached);
        loadingDiv.style.display = "none";
        const storedDate = localStorage.getItem("bwm_last_updated");
        lastUpdatedDiv.innerText = storedDate ? "Last updated: " + formatDateTime(storedDate) : "";
        checkCarParam();
        return;
      }
    }

    carsData = cars.filter(car => car.brand && car.model);
    localStorage.setItem("bwm_cars",        JSON.stringify(carsData));
    localStorage.setItem("bwm_version",     serverVersion);
    const nowISO = new Date().toISOString();
    localStorage.setItem("bwm_last_updated", nowISO);
    loadingDiv.style.display = "none";
    lastUpdatedDiv.innerText = "Last updated: " + formatDateTime(nowISO);
    checkCarParam();

  } catch (error) {
    console.error(error);
    const cached     = localStorage.getItem("bwm_cars");
    const storedDate = localStorage.getItem("bwm_last_updated");

    if (cached) {
      carsData = JSON.parse(cached);
      loadingDiv.innerHTML = `
        ⚠️ Offline Mode<br>
        <small>Showing last saved data</small><br><br>
        <button onclick="loadCars()">🔄 Retry</button>
      `;
      lastUpdatedDiv.innerText = storedDate ? "Last updated: " + formatDateTime(storedDate) : "";
      checkCarParam();
    } else {
      loadingDiv.innerHTML = `
        ❌ No data available<br>
        <small>Please connect to internet</small><br><br>
        <button onclick="loadCars()">🔄 Retry</button>
      `;
      lastUpdatedDiv.innerText = "";
    }
  }
}

// ✅ Handle ?car=ID for simple deep-link sharing (shows live data)
function checkCarParam() {
  const carId = new URLSearchParams(window.location.search).get('car');
  if (carId) {
    const car = carsData.find(c => c.id == carId);
    if (car) { showDetails(car.id); return; }
  }
  applyFilters();
}

// ─── SNAPSHOT SHARE LOADER ────────────────────────────────────────────────────
async function loadSharedCar(shareId) {
  const loadingDiv = document.getElementById("loading");
  loadingDiv.style.display = "block";
  loadingDiv.innerHTML = '<span class="loader"></span> Loading shared car...';

  try {
    const response = await fetch(API_URL + '?share=' + shareId + '&t=' + Date.now());
    const result   = await response.json();
    loadingDiv.style.display = "none";

    if (result.error === 'expired') {
      document.getElementById("carList").innerHTML = `
        <div style="text-align:center;padding:30px;">
          ⏰ This share link has expired.<br><br>
          <button onclick="window.location.href=window.location.pathname">View All Cars</button>
        </div>
      `;
      return;
    }
    if (result.error) {
      document.getElementById("carList").innerHTML = `
        <div style="text-align:center;padding:30px;">
          ❌ Share link not found.<br><br>
          <button onclick="window.location.href=window.location.pathname">View All Cars</button>
        </div>
      `;
      return;
    }

    showSnapshotDetails(result.car, result.images || []);

  } catch (err) {
    document.getElementById("loading").innerHTML = `
      ❌ Failed to load shared car.<br><br>
      <button onclick="window.location.href=window.location.pathname">View All Cars</button>
    `;
  }
}

function showSnapshotDetails(car, sharedImages) {
  // Use the images that were snapshotted; fallback to live Drive IDs
  const images = sharedImages.length ? sharedImages : parseDriveImages(car.images);

  document.getElementById("carList").innerHTML = `
    <div class="car-card">
      <div class="share-badge">📤 Shared Snapshot</div>
      ${buildImageSlider(images, 'snap')}
      <h3>${car.brand} ${car.model}</h3>
      <p><strong>Variant:</strong> ${car.variant || "-"}</p>
      <p><strong>Year:</strong> ${car.year}</p>
      <p><strong>Fuel:</strong> ${car.fuel}</p>
      <p><strong>Mileage:</strong> ${car.km} km</p>
      <p><strong>Owners:</strong> ${car.owner}</p>
      <p><strong>Color:</strong> ${car.color}</p>
      <p><strong>IDV:</strong> ${formatPrice(car.idv)}</p>
      <p><strong>TP Expiry:</strong> ${car.tpExpiry}</p>
      <p><strong>OD Expiry:</strong> ${car.odExpiry}</p>
      <div class="price">${formatPrice(car.price)}</div>
      <br>
      <button onclick="window.location.href=window.location.pathname">⬅ View All Cars</button>
    </div>
  `;
}

// ─── DISPLAY CARS (LIST) ──────────────────────────────────────────────────────
function displayCars(cars) {
  const list = document.getElementById("carList");
  list.innerHTML = "";

  if (!cars.length) {
    list.innerHTML = "<div style='text-align:center;padding:20px;'>No cars found</div>";
    return;
  }

  cars.forEach(car => {
    let statusClass = "yellow", statusText = "Yard / Incoming";
    if (car.showroom && !car.booked) { statusClass = "green"; statusText = "Available"; }
    if (car.booked)                  { statusClass = "grey";  statusText = "Booked"; }

    // Show first image as thumbnail on list card
    const images   = parseDriveImages(car.images);
    const thumbHtml = images.length
      ? `<img class="card-thumb" src="${images[0]}" loading="lazy"
           onerror="this.style.display='none'" alt="${car.brand} ${car.model}">`
      : '';

    list.innerHTML += `
      <div class="car-card" onclick="showDetails(${car.id})">
        ${thumbHtml}
        <div><strong>${car.brand} ${car.model}</strong></div>
        <div>${car.variant || ""}</div>
        <div>${car.year} | ${car.fuel} | ${car.km} km</div>
        <div class="price-status-row">
          <div class="price">${formatPrice(car.price)}</div>
          <div class="status ${statusClass}">${statusText}</div>
        </div>
      </div>
    `;
  });
}

// ─── DETAIL VIEW ──────────────────────────────────────────────────────────────
function showDetails(id) {
  const car    = carsData.find(c => c.id == id);
  const list   = document.getElementById("carList");
  const images = parseDriveImages(car.images);

  // Reset image selection for this car
  imageSelectionState[car.id] = new Set();

  list.innerHTML = `
    <div class="car-card">
      ${buildImageSlider(images, car.id)}
      <h3>${car.brand} ${car.model}</h3>
      <p><strong>Variant:</strong> ${car.variant || "-"}</p>
      <p><strong>Year:</strong> ${car.year}</p>
      <p><strong>Fuel:</strong> ${car.fuel}</p>
      <p><strong>Mileage:</strong> ${car.km} km</p>
      <p><strong>Owners:</strong> ${car.owner}</p>
      <p><strong>Color:</strong> ${car.color}</p>
      <p><strong>IDV:</strong> ${formatPrice(car.idv)}</p>
      <p><strong>TP Expiry:</strong> ${car.tpExpiry}</p>
      <p><strong>OD Expiry:</strong> ${car.odExpiry}</p>
      <div class="price">${formatPrice(car.price)}</div>
      <br>
      <button onclick="shareCar(${car.id})">📤 Share on WhatsApp</button>
      <br><br>
      <button onclick="goBack()">⬅ Back</button>
    </div>
  `;
}

// ─── BACK ─────────────────────────────────────────────────────────────────────
function goBack() { applyFilters(); }

// ─── SHARE ────────────────────────────────────────────────────────────────────
async function shareCar(id) {
  const car    = carsData.find(c => c.id == id);
  const images = parseDriveImages(car.images);

  // ✅ Controlled image sharing: use selected images, fallback to all
  const selectedSet  = imageSelectionState[car.id] || new Set();
  const shareImages  = selectedSet.size > 0
    ? [...selectedSet].map(i => images[i])
    : images;

  // ✅ Snapshot-based share — create server snapshot, get expiring link
  let shareUrl = '';
  try {
    const shareId = await createShareSnapshot(car, shareImages);
    if (shareId) {
      shareUrl = window.location.origin + window.location.pathname + '?share=' + shareId;
    }
  } catch (e) {
    // Fallback: simple car ID link (live data, no expiry)
    shareUrl = window.location.origin + window.location.pathname + '?car=' + car.id;
  }

  const imageSection = shareImages.length
    ? '\n\nImages:\n' + shareImages.join('\n')
    : '';

  const linkSection = shareUrl
    ? '\n\nView details: ' + shareUrl
    : '';

  const message =
`*${car.brand} ${car.model} ${car.variant || ""}*

Year: ${car.year}
Fuel: ${car.fuel}
Mileage: ${car.km} km
Owners: ${car.owner}
Color: ${car.color}

Price: ${formatPrice(car.price)}${imageSection}${linkSection}

Available at BWM Thrissur.
Would you like to schedule a visit?`;

  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
}

// ✅ Calls Apps Script doPost() to create a snapshot with 7-day expiry
async function createShareSnapshot(car, images) {
  const response = await fetch(API_URL, {
    method: 'POST',
    redirect: 'follow',
    body: JSON.stringify({ action: 'createShare', car: car, images: images }),
  });
  const result = await response.json();
  return result.shareId || null;
}

// ─── FILTERS ──────────────────────────────────────────────────────────────────
function applyFilters() {
  const searchValue  = document.getElementById("search").value.toLowerCase();
  const showroomOnly = document.getElementById("showroomOnly").checked;
  const budgetLimit  = document.getElementById("budgetFilter").value;

  const filtered = carsData.filter(car => {
    const text = `${car.brand} ${car.model} ${car.variant} ${car.color} ${car.fuel} ${car.year}`;
    const matchesSearch   = text.toLowerCase().includes(searchValue);
    const matchesShowroom = showroomOnly ? (car.showroom && !car.booked) : true;
    const matchesBudget   = budgetLimit  ? parsePrice(car.price) <= Number(budgetLimit) : true;
    return matchesSearch && matchesShowroom && matchesBudget;
  });

  displayCars(filtered);

  localStorage.setItem("bwm_filters", JSON.stringify({
    search:       document.getElementById("search").value,
    showroomOnly: document.getElementById("showroomOnly").checked,
    budget:       document.getElementById("budgetFilter").value,
  }));
}

// ✅ QUICK FILTERS — programmatic one-tap filter shortcuts
function quickFilter(type) {
  // Reset everything first
  document.getElementById("search").value         = "";
  document.getElementById("showroomOnly").checked  = false;
  document.getElementById("budgetFilter").value    = "";

  if (type === 'diesel')   document.getElementById("search").value        = "diesel";
  if (type === 'petrol')   document.getElementById("search").value        = "petrol";
  if (type === 'under20')  document.getElementById("budgetFilter").value  = "2000000";
  if (type === 'showroom') document.getElementById("showroomOnly").checked = true;
  // 'clear' — already reset above

  applyFilters();
  updateClearButton();
}

// ─── EVENTS ───────────────────────────────────────────────────────────────────
document.getElementById("search").addEventListener("input", function () {
  applyFilters();
  updateClearButton();
});
document.getElementById("showroomOnly").addEventListener("change", applyFilters);
document.getElementById("budgetFilter").addEventListener("change", applyFilters);

// ─── CLEAR SEARCH ─────────────────────────────────────────────────────────────
function clearSearch() {
  document.getElementById("search").value = "";
  applyFilters();
  updateClearButton();
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
loadCars();

const storedDate = localStorage.getItem("bwm_last_updated");
if (storedDate) {
  document.getElementById("lastUpdated").innerText = "Last updated: " + formatDateTime(storedDate);
}
