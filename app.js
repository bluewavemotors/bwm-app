// version 1.1.0
const API_URL = "https://script.google.com/macros/s/AKfycbwwE7Vh-aojmNafegOxlHAZhbqbBW9YRZI6LpjE3oAxPb70zRfKvci3CyxfkafGLF75/exec";

let carsData = [];

// 🔢 Price Formatting
function formatIndianNumber(price) {
  const number = parsePrice(price);
  if (!number || isNaN(number)) return price;
  return number.toLocaleString('en-IN');
}

function parsePrice(price) {
  if (!price) return 0;

  let clean = price.toString().replace(/,/g, '').toLowerCase().trim();

  if (clean.includes('lakh') || clean.includes('l')) {
    return parseFloat(clean) * 100000;
  }

  return parseFloat(clean);
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
  const seconds = String(d.getSeconds()).padStart(2, '0');

  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;

  const hh = String(hours).padStart(2, '0');

  return `${day}-${month}-${year} ${hh}:${minutes}:${seconds} ${ampm}`;
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

  const savedFilters = JSON.parse(localStorage.getItem("bwm_filters") || "{}");

  document.getElementById("search").value = savedFilters.search || "";
  document.getElementById("showroomOnly").checked = savedFilters.showroomOnly || false;
  document.getElementById("budgetFilter").value = savedFilters.budget || "";

  updateClearButton();

  try {
    loadingDiv.style.display = "block";
    loadingDiv.innerHTML = '<span class="loader"></span> Loading cars...';

    const response = await fetch(API_URL);

    if (!response.ok) throw new Error("API error");

    const result = await response.json();

    let serverVersion;
    let cars;

    if (Array.isArray(result)) {
      cars = result;
      serverVersion = "old";
    } else {
      cars = result.cars || [];
      serverVersion = result.lastUpdated;
    }

    const storedVersion = localStorage.getItem("bwm_version");

    if (storedVersion === serverVersion) {
      const cached = localStorage.getItem("bwm_cars");

      if (cached) {
        carsData = JSON.parse(cached);

        loadingDiv.style.display = "none";

        const storedDate = localStorage.getItem("bwm_last_updated");
        lastUpdatedDiv.innerText = storedDate
          ? "Last updated: " + formatDateTime(storedDate)
          : "";

        applyFilters();
        return;
      }
    }

    carsData = cars.filter(car => car.brand && car.model);

    localStorage.setItem("bwm_cars", JSON.stringify(carsData));
    localStorage.setItem("bwm_version", serverVersion);

    const nowISO = new Date().toISOString();
    localStorage.setItem("bwm_last_updated", nowISO);

    loadingDiv.style.display = "none";

    lastUpdatedDiv.innerText =
      "Last updated: " + formatDateTime(nowISO);

    applyFilters();

  } catch (error) {

    console.error(error);

    const cached = localStorage.getItem("bwm_cars");
    const storedDate = localStorage.getItem("bwm_last_updated");

    if (cached) {

      carsData = JSON.parse(cached);

      loadingDiv.innerHTML = `
        ⚠️ Offline Mode<br>
        <small>Showing last saved data</small><br><br>
        <button onclick="loadCars()">🔄 Retry</button>
      `;

      lastUpdatedDiv.innerText = storedDate
        ? "Last updated: " + formatDateTime(storedDate)
        : "";

      applyFilters();

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

// 🚗 DISPLAY CARS
function displayCars(cars) {
  const list = document.getElementById("carList");
  list.innerHTML = "";

  if (cars.length === 0) {
    list.innerHTML = "<div style='text-align:center;padding:20px;'>No cars found</div>";
    return;
  }

  cars.forEach(car => {

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
      <div class="car-card" onclick="showDetails(${car.id})">
        <div><strong>${car.brand} ${car.model}</strong></div>
        <div>${car.variant || ""}</div>
        <div>${car.year} | ${car.fuel} | ${car.km} km</div>
        <div class="price-status-row">
          <div class="price">₹ ${formatIndianNumber(car.price)}</div>
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
    <div class="car-card">
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
      <button onclick="shareCar(${car.id})">📤 Share on WhatsApp</button>
      <br><br>
      <button onclick="goBack()">⬅ Back</button>
    </div>
  `;
}

// 🔙 BACK
function goBack() {
  applyFilters();
}

// 📤 SHARE
function shareCar(id) {
  const car = carsData.find(c => c.id == id);

  const message =
`*${car.brand} ${car.model} ${car.variant || ""}*

Year: ${car.year}
Fuel: ${car.fuel}
Mileage: ${car.km} km
Owners: ${car.owner}
Color: ${car.color}

Price: ₹ ${formatIndianNumber(car.price)}

Available at BWM Thrissur.
Would you like to schedule a visit?
`;

  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
}

// 🔎 FILTER
function applyFilters() {

  const searchValue = document.getElementById("search").value.toLowerCase();
  const showroomOnly = document.getElementById("showroomOnly").checked;
  const budgetLimit = document.getElementById("budgetFilter").value;

  let filtered = carsData.filter(car => {

    const searchableText = `
      ${car.brand}
      ${car.model}
      ${car.variant}
      ${car.color}
      ${car.fuel}
      ${car.year}
    `;

    const matchesSearch = searchableText.toLowerCase().includes(searchValue);

    const matchesShowroom = showroomOnly
      ? (car.showroom && !car.booked)
      : true;

    const carPriceNumber = parsePrice(car.price);

    const matchesBudget = budgetLimit
      ? carPriceNumber <= Number(budgetLimit)
      : true;

    return matchesSearch && matchesShowroom && matchesBudget;
  });

  displayCars(filtered);

  localStorage.setItem("bwm_filters", JSON.stringify({
    search: document.getElementById("search").value,
    showroomOnly: document.getElementById("showroomOnly").checked,
    budget: document.getElementById("budgetFilter").value
  }));
}

// 🎯 EVENT LISTENERS
document.getElementById("search").addEventListener("input", function () {
  applyFilters();
  updateClearButton();
});

document.getElementById("showroomOnly").addEventListener("change", applyFilters);
document.getElementById("budgetFilter").addEventListener("change", applyFilters);

// 🚀 INIT
loadCars();

const storedDate = localStorage.getItem("bwm_last_updated");
if (storedDate) {
  document.getElementById("lastUpdated").innerText =
    "Last updated: " + formatDateTime(storedDate);
}

// ❌ CLEAR SEARCH
function clearSearch() {
  document.getElementById("search").value = "";
  applyFilters();
  updateClearButton();
}
