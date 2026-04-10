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

// 🕒 Date Formatting
function formatDateTime(date) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const d = new Date(date);

  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');

  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;

  return `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;
}

// 🔥 X BUTTON CONTROL
function updateClearButton() {
  const searchInput = document.getElementById("search");
  const clearBtn = document.getElementById("clearBtn");
  clearBtn.style.display = searchInput.value.trim() ? "block" : "none";
}

// 🚀 LOAD DATA
async function loadCars() {
  const loadingDiv = document.getElementById("loading");
  const lastUpdatedDiv = document.getElementById("lastUpdated");

  try {
    loadingDiv.style.display = "block";
    loadingDiv.innerHTML = '<span class="loader"></span> Loading cars...';

    const response = await fetch(API_URL + "?t=" + new Date().getTime());
    const result = await response.json();
    carsData = result?.cars || [];

    loadingDiv.style.display = "none";

    lastUpdatedDiv.innerText =
      "Last updated: " + formatDateTime(new Date().toISOString());

    applyFilters();

  } catch (error) {
    loadingDiv.innerHTML = "❌ Error loading data";
  }
}

// 🚗 DISPLAY CARS
function displayCars(cars) {
  const list = document.getElementById("carList");
  list.innerHTML = "";

  if (cars.length === 0) {
    list.innerHTML = "<div style='text-align:center;padding:20px;'>No cars found</div>";
    return;
  }

  cars.forEach(car => {

    const firstImage = car.images ? car.images.split(",")[0] : "";

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

        ${firstImage ? `<img src="${firstImage}" class="car-image" loading="lazy">` : ""}

        <div><strong>${car.brand} ${car.model}</strong></div>
        <div>${car.variant || ""}</div>
        <div>${car.year} | ${car.fuel} | ${car.km} km</div>

        <div class="price-status-row">
          <div class="price"> ${formatPriceShort(car.price)}</div>
          <div class="status ${statusClass}">${statusText}</div>
        </div>
      </div>
    `;
  });
}

// 🔍 DETAILS VIEW
function showDetails(id) {
  const car = carsData.find(c => c.id == id);
  const list = document.getElementById("carList");

  list.innerHTML = `
    <div class="car-detail-card">
      <h3>${car.brand} ${car.model}</h3>
      <p><strong>Variant:</strong> ${car.variant || "-"}</p>
      <p><strong>Year:</strong> ${car.year}</p>
      <p><strong>Fuel:</strong> ${car.fuel}</p>
      <p><strong>Mileage:</strong> ${car.km} km</p>
      <p><strong>Owners:</strong> ${car.owner}</p>
      <p><strong>Color:</strong> ${car.color}</p>
      <p><strong>IDV:</strong> ₹ ${formatIndianNumber(car.idv)}</p>
      <p><strong>TP Expiry:</strong> ${car.tpExpiry}</p>
      <p><strong>OD Expiry:</strong> ${car.odExpiry}</p>

      <div class="price">₹ ${formatIndianNumber(car.price)}</div>

      <br>
      <button onclick="event.stopPropagation(); shareCar(${car.id})">
        📤 Share on WhatsApp
      </button>

      <br><br>

      <button onclick="event.stopPropagation(); goBack()">
        ⬅ Back
      </button>
    </div>
  `;
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

  const checkbox = document.getElementById("img-" + index);
  const image = document.getElementById("img-view-" + index);

  checkbox.checked = !checkbox.checked;

  if (checkbox.checked) {
    if (!selectedImages.includes(index)) {
      selectedImages.push(index);
    }
    image.classList.add("selected-img");
  } else {
    selectedImages = selectedImages.filter(i => i !== index);
    image.classList.remove("selected-img");
  }
}

// 📤 SHARE
async function shareCar(id) {

  const car = carsData.find(c => c.id == id);
  if (!car) return;

  const imgs = car.images ? car.images.split(",") : [];

  // ✅ Use selected images if available, else fallback
  let selectedImgs;

  if (selectedImages && selectedImages.length > 0) {
    selectedImgs = selectedImages
      .map(i => imgs[i])
      .filter(Boolean); // remove undefined safety
  } else {
    selectedImgs = imgs.slice(0, 3);
  }

  const payload = {
    brand: car.brand,
    model: car.model,
    variant: car.variant,
    year: car.year,
    fuel: car.fuel,
    km: car.km,
    price: formatPriceShort(car.price),
    images: selectedImgs // ✅ ALWAYS ARRAY
  };

  const res = await fetch("YOUR_APPS_SCRIPT_WEBAPP_URL", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  const result = await res.json();

  const shareUrl = `${window.location.origin}/share.html?id=${result.id}`;

  const message =
`*${car.brand} ${car.model}*

${shareUrl}

Price: ${formatPriceShort(car.price)}

_⚠️ Open once with internet. Then works offline._

_Blue Wave Motors, Thrissur_`;

  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
}

// 🔎 FILTER
function applyFilters() {
  const searchValue = document.getElementById("search").value.toLowerCase();
  const showroomOnly = document.getElementById("showroomOnly").checked;
  const budgetLimit = document.getElementById("budgetFilter").value;

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
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

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
document.getElementById("search").addEventListener("input", applyFilters);
document.getElementById("showroomOnly").addEventListener("change", applyFilters);
document.getElementById("budgetFilter").addEventListener("change", applyFilters);

// 🚀 INIT
loadCars();
