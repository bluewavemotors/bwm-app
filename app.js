const API_URL = 
"https://script.google.com/macros/s/AKfycbwwE7Vh-aojmNafegOxlHAZhbqbBW9YRZI6LpjE3oAxPb70zRfKvci3CyxfkafGLF75/exec";
let carsData = [];
let selectedImages = [];

let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  console.log("Install available");
});

function installApp() {
  if (deferredPrompt) {
    deferredPrompt.prompt();

    deferredPrompt.userChoice.then(choice => {
      if (choice.outcome === 'accepted') {
        console.log('App installed');
      }
      deferredPrompt = null;
    });
  }
}

// 🔢 Price Formatting
function formatIndianNumber(price) {
  const number = parsePrice(price);
  if (!number || isNaN(number)) return price;
  return number.toLocaleString('en-IN');
}

function parsePrice(price) {
  if (!price) return 0;

  let text = price.toString().toLowerCase();

  // ✅ Extract ONLY first number properly
  let match = text.match(/[\d.]+/);

  if (!match) return 0;

  let number = parseFloat(match[0]);

  if (text.includes("crore")) {
    return number * 10000000;
  }

  if (text.includes("lakh")) {
    return number * 100000;
  }

  return number;
}

function formatPriceShort(price) {
  const num = parsePrice(price);

  if (!num || isNaN(num)) return price;

  const round2 = (value) => {
    return Math.round(value * 100) / 100;
  };

  if (num >= 10000000) {
    const value = round2(num / 10000000);
    return "₹ " + value.toFixed(2) + " Cr";
  }

  if (num >= 100000) {
    const value = round2(num / 100000);
    return "₹ " + value.toFixed(2) + " L";
  }

  return "₹ " + num.toLocaleString('en-IN');
}

// Displays: ₹ 29.75 L  /  ₹ 1.15 Cr  /  ₹ 85,000
function formatPrice(price) {
  const n = parsePrice(price);
  if (!n || isNaN(n)) return price;
  if (n >= 10000000) return '₹ ' + (n / 10000000).toFixed(2) + ' Cr';
  if (n >= 100000)   return '₹ ' + (n / 100000).toFixed(2) + ' L';
  return '₹ ' + n.toLocaleString('en-IN');
}

function sortCars(cars, type) {
  if (!type) return cars;

  return cars.sort((a, b) => {
    if (type === "priceLow") return parsePrice(a.price) - parsePrice(b.price);
    if (type === "priceHigh") return parsePrice(b.price) - parsePrice(a.price);
    if (type === "kmLow") return a.km - b.km;
    if (type === "yearNew") return b.year - a.year;
  });
}

// ─── DATE ─────────────────────────────────────────────────────────────────────
function formatDateTime(date) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const d = new Date(date);
  const day   = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');

  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;

  return `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;
}

// ─── CLEAR BUTTON ─────────────────────────────────────────────────────────────
function updateClearButton() {
  const searchInput = document.getElementById("search");
  const clearBtn = document.getElementById("clearBtn");
  clearBtn.style.display = searchInput.value.trim() ? "block" : "none";
}

// ─── LOAD CARS ────────────────────────────────────────────────────────────────
async function loadCars() {
  const loadingDiv = document.getElementById("loading");
  const lastUpdatedDiv = document.getElementById("lastUpdated");

  try {
    loadingDiv.style.display = "block";
    loadingDiv.innerHTML = '<span class="loader"></span> Loading cars...';

    const response = await fetch(API_URL + "?t=" + new Date().getTime());
    const result = await response.json();

    carsData = (result?.cars || []).map(sanitizeCar);

    // ✅ CACHE AFTER LOAD
    localStorage.setItem("carsCache", JSON.stringify(carsData));

    loadingDiv.style.display = "none";

    lastUpdatedDiv.innerText =
      "Last updated: " + formatDateTime(new Date().toISOString());

    applyFilters();

  } catch (error) {
    const cached = localStorage.getItem("carsCache");

    if (cached) {
      carsData = JSON.parse(cached);
      applyFilters();
      showError("⚠️ Offline mode (cached data)", loadCars);
    } else {
      showError("❌ No data available", loadCars);
    }
  }
}

function showError(message, retryFn) {
  const loadingDiv = document.getElementById("loading");
  if (!loadingDiv) return;

  loadingDiv.style.display = "block";

  const retryButton = retryFn
    ? `<button onclick="${retryFn.name}()" style="
        padding:8px 14px;
        border:none;
        border-radius:6px;
        background:#444;
        color:#fff;
        cursor:pointer;
      ">
        🔄 Retry
      </button>`
    : "";

  loadingDiv.innerHTML = `
    <div style="text-align:center;">
      ${message}<br><br>
      ${retryButton}
    </div>
  `;
}

function sanitizeCar(car) {
  return {
    id: car.id || "",
    brand: (car.brand || "").toString(),
    model: (car.model || "").toString(),
    variant: (car.variant || "").toString(),
    color: (car.color || "").toString(),
    fuel: (car.fuel || "").toString(),
    year: (car.year || "").toString(),
    owner: (car.owner || "").toString(),

    showroom: car.showroom === true || car.showroom === "TRUE",
    booked: car.booked === true || car.booked === "TRUE",

    price: car.price || 0,
    km: Number(car.km) || 0,
    images: car.images || ""
  };
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

    // ✅ Safe image extraction
    const firstImage = car.images
      ? car.images.split(",").map(i => i.trim()).find(i => i.startsWith("http"))
      : "";

    let statusClass = "yellow";
    let statusText = "Yard / Incoming";

    if (car.showroom && !car.booked) {
      statusClass = "green";
      statusText = "Available";
    }

    if (car.booked) {
      statusClass = "grey";
      statusText = "Booked";
    }

    list.innerHTML += `
      <div class="car-card" onclick="showDetails('${car.id}')">

        ${firstImage 
          ? `<img src="${getOptimizedImage(firstImage, 400)}" class="car-image" loading="lazy">` 
          : `<div class="no-image">No Image</div>`
        }

        <div><strong>${car.brand} ${car.model}</strong></div>
        <div>${car.variant || ""}</div>
        <div>${car.year || "-"} | ${car.fuel || "-"} | ${car.km || 0} km</div>

        <div class="price-status-row">
          <div class="price">${formatPriceShort(car.price)}</div>
          <div class="status ${statusClass}">${statusText}</div>
        </div>
      </div>
    `;
  });
}

// ─── DETAIL VIEW ──────────────────────────────────────────────────────────────
function showDetails(id) {
  const car = carsData.find(c => c.id == id);
  if (!car) return;

  const list = document.getElementById("carList");

  // ✅ Reset selection
  selectedImages = [];

  let imagesHTML = "";

  if (car.images && car.images.trim() !== "") {

    const imgs = car.images
      .split(",")
      .map(i => i.trim())
      .filter(i => i.startsWith("http"));

    if (imgs.length > 0) {

      imagesHTML = `
        <div class="image-slider">
          ${imgs.map((img, i) => `
            <div class="img-wrap" onclick="toggleSelect(${i})">
              <img src="${getOptimizedImage(img)}" loading="lazy" id="img-view-${i}">
              <div class="img-check" id="img-${i}"></div>
            </div>
          `).join("")}
        </div>
        <div class="img-hint">Tap images to select for sharing</div>
      `;

    } else {
      imagesHTML = `<div style="padding:10px;color:red;">No Valid Images</div>`;
    }

  } else {
    imagesHTML = `<div style="padding:10px;color:red;">No Images Available</div>`;
  }

  list.innerHTML = `
    <div class="car-detail-card">

      ${imagesHTML}

      <h3>${car.brand} ${car.model}</h3>
      <p><strong>Variant:</strong> ${car.variant || "-"}</p>
      <p><strong>Year:</strong> ${car.year || "-"}</p>
      <p><strong>Fuel:</strong> ${car.fuel || "-"}</p>
      <p><strong>Mileage:</strong> ${car.km || 0} km</p>
      <p><strong>Owners:</strong> ${car.owner || "-"}</p>
      <p><strong>Color:</strong> ${car.color || "-"}</p>

      <div class="price">₹ ${formatIndianNumber(car.price)}</div>

      <br>
      <button onclick="event.stopPropagation(); shareCar('${car.id}')">
        📤 Share on WhatsApp
      </button>

      <br><br>

      <button onclick="event.stopPropagation(); goBack()">
        ⬅ Back
      </button>
    </div>
  `;
}

function getOptimizedImage(url, size = 800) {
  if (!url) return "";

  const match = url.match(/[-\w]{25,}/);
  if (!match) return url;

  return `https://drive.google.com/thumbnail?id=${match[0]}&sz=w${size}`;
}

function clearSearch() {
  document.getElementById("search").value = "";
  applyFilters();
  updateClearButton();
}

// 🔙 BACK
function goBack() {
  applyFilters();
}

function toggleSelect(index) {
  const check = document.getElementById("img-" + index);
  const img = document.getElementById("img-view-" + index);
  const wrap = check.parentElement;

  const isSelected = selectedImages.includes(index);

  if (isSelected) {
    selectedImages = selectedImages.filter(i => i !== index);
    check.classList.remove("selected");
    img.classList.remove("selected-img");
    wrap.classList.remove("img-selected");
  } else {
    selectedImages.push(index);
    check.classList.add("selected");
    img.classList.add("selected-img");
    wrap.classList.add("img-selected");
  }
}

// 📤 SHARE
async function shareCar(id) {
  const car = carsData.find(c => c.id == id);
  if (!car) return;

  const imgs = car.images ? car.images.split(",") : [];

  let selectedImgs = selectedImages.length > 0
    ? selectedImages.map(i => imgs[i]).filter(Boolean)
    : imgs.slice(0, 3);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "createShare",
        car: car,
        images: selectedImgs
      })
    });

    const text = await response.text();
    console.log("RAW RESPONSE:", text);

    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      alert("❌ Server not returning JSON");
      console.log(text);
      return;
    }

    if (!result.shareId) {
      alert("❌ Share failed");
      console.log(result);
      return;
    }

    const shareUrl = `${window.location.origin}/share.html?id=${result.shareId}`;

    const message =
`*${car.brand} ${car.model}*

${shareUrl}

Price: ${formatPriceShort(car.price)}

_Blue Wave Motors_`;

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");

  } catch (err) {
    alert("❌ Network error");
    console.error(err);
  }
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
  const searchValue = document.getElementById("search").value.toLowerCase();
  const showroomOnly = document.getElementById("showroomOnly").checked;
  const budgetLimit  = document.getElementById("budgetFilter").value;
  const sortType = document.getElementById("sortFilter").value;

  let filtered = carsData.filter(car => {

    // 🔍 SEARCH
    const searchableText = [
      car.brand,
      car.model,
      car.variant,
      car.color,
      car.fuel,
      car.year
    ]
      .map(x => (x || "").toString().toLowerCase())
      .join(" ");

    const matchesSearch = searchableText.includes(searchValue);

    // 🏢 SHOWROOM FILTER
    const matchesShowroom = showroomOnly
      ? (car.showroom && !car.booked)
      : true;

    // 💰 BUDGET FILTER
    const carPriceNumber = parsePrice(car.price);

    const matchesBudget = budgetLimit
      ? carPriceNumber <= Number(budgetLimit)
      : true;

    return matchesSearch && matchesShowroom && matchesBudget;
  });

  // ✅ SORT AFTER FILTER
  filtered = sortCars(filtered, sortType);

  displayCars(filtered);
}

function goToSlide(index, carId) {
  const slider = document.getElementById("slider-" + carId);
  const slides = slider.querySelectorAll(".slide");
  const dots = slider.parentElement.querySelectorAll(".dot");

  const width = slides[0].clientWidth;

  slider.scrollTo({
    left: index * width,
    behavior: "smooth"
  });

  dots.forEach(d => d.classList.remove("active"));
  dots[index].classList.add("active");
}

function quickFilter(type) {

  if (type === "diesel") {
    document.getElementById("search").value = "diesel";
  }

  if (type === "petrol") {
    document.getElementById("search").value = "petrol";
  }

  if (type === "under20") {
    document.getElementById("budgetFilter").value = "2000000";
  }

  if (type === "showroom") {
    document.getElementById("showroomOnly").checked = true;
  }

  if (type === "clear") {
    document.getElementById("search").value = "";
    document.getElementById("budgetFilter").value = "";
    document.getElementById("showroomOnly").checked = false;
  }

  applyFilters();
}

// 🎯 EVENT LISTENERS
window.addEventListener("DOMContentLoaded", function () {

  document.getElementById("search").addEventListener("input", function () {
    applyFilters();
    updateClearButton();
  });

  document.getElementById("showroomOnly").addEventListener("change", applyFilters);
  document.getElementById("budgetFilter").addEventListener("change", applyFilters);
  document.getElementById("sortFilter").addEventListener("change", applyFilters);

  loadCars();

});