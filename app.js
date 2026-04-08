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

    const response = await fetch(API_URL);
    const result = await response.json();

    carsData = result.cars || [];

    loadingDiv.style.display = "none";

    lastUpdatedDiv.innerText =
      "Last updated: " + formatDateTime(new Date());

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
    let statusText = "Yard";

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

  let imagesHTML = "";

  if (car.images) {
    const imgs = car.images.split(",");

    imagesHTML = `
      <div class="slider">
        ${imgs.map(img => `
          <img src="${img}" class="slide" loading="lazy">
        `).join("")}
      </div>
    `;
  }

  list.innerHTML = `
    <div class="car-card">

      ${imagesHTML}

      <h3>${car.brand} ${car.model}</h3>
      <p><strong>Variant:</strong> ${car.variant || "-"}</p>
      <p><strong>Year:</strong> ${car.year}</p>
      <p><strong>Fuel:</strong> ${car.fuel}</p>
      <p><strong>Mileage:</strong> ${car.km} km</p>
      <p><strong>Owners:</strong> ${car.owner}</p>
      <p><strong>Color:</strong> ${car.color}</p>

      <div class="price">₹ ${formatIndianNumber(car.price)}</div>

      <br>
      <button onclick="shareCar('${car.id}')">📤 Share on WhatsApp</button>
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
  const firstImage = car.images ? car.images.split(",")[0] : "";

  const message =
`*${car.brand} ${car.model}*

${firstImage}

Year: ${car.year}
Fuel: ${car.fuel}
KM: ${car.km}

Price: ₹ ${formatIndianNumber(car.price)}

Available at BWM Thrissur.`;

  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
}

// 🔎 FILTER
function applyFilters() {
  const searchValue = document.getElementById("search").value.toLowerCase();

  let filtered = carsData.filter(car => {
    return `${car.brand} ${car.model} ${car.variant}`.toLowerCase().includes(searchValue);
  });

  displayCars(filtered);
}

// 🚀 INIT
document.getElementById("search").addEventListener("input", applyFilters);
loadCars();
