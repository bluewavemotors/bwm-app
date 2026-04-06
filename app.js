const API_URL = "https://script.google.com/macros/s/AKfycbwwE7Vh-aojmNafegOxlHAZhbqbBW9YRZI6LpjE3oAxPb70zRfKvci3CyxfkafGLF75/exec";

let carsData = [];

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

async function loadCars() {

  const loadingDiv = document.getElementById("loading");
  const lastUpdatedDiv = document.getElementById("lastUpdated");

  const savedFilters = JSON.parse(localStorage.getItem("bwm_filters") || "{}");

  document.getElementById("search").value = savedFilters.search || "";
  document.getElementById("showroomOnly").checked = savedFilters.showroomOnly || false;
  document.getElementById("budgetFilter").value = savedFilters.budget || "";

  // ✅ 🔥 HANDLE CLEAR (X) BUTTON VISIBILITY AFTER RESTORE
  const searchInput = document.getElementById("search");
  const clearBtn = document.getElementById("clearBtn");

  if (searchInput.value.trim() !== "") {
    clearBtn.style.display = "block";
  } else {
    clearBtn.style.display = "none";
  }

  try {
    loadingDiv.style.display = "block";
    loadingDiv.innerText = "⏳ Loading cars...";

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

        lastUpdatedDiv.innerText =
          "Last updated: " + localStorage.getItem("bwm_last_updated");

        applyFilters();
        return;
      }
    }

    carsData = cars.filter(car => car.brand && car.model);

    localStorage.setItem("bwm_cars", JSON.stringify(carsData));
    localStorage.setItem("bwm_version", serverVersion);

    const now = new Date().toLocaleString();
    localStorage.setItem("bwm_last_updated", now);

    loadingDiv.style.display = "none";

    lastUpdatedDiv.innerText = "Last updated: " + now;

    applyFilters();

  } catch (error) {

    console.error(error);

    const cached = localStorage.getItem("bwm_cars");
    const lastUpdated = localStorage.getItem("bwm_last_updated");

    if (cached) {

      carsData = JSON.parse(cached);

      loadingDiv.innerHTML = `
        ⚠️ Offline Mode<br>
        <small>Showing last saved data</small><br><br>
        <button onclick="loadCars()">🔄 Retry</button>
      `;

      lastUpdatedDiv.innerText = lastUpdated
        ? "Last updated: " + lastUpdated
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

function goBack() {
  applyFilters();
}

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

// Event Listeners
const searchInput = document.getElementById("search");
const clearBtn = document.getElementById("clearBtn");

searchInput.addEventListener("input", function () {
  applyFilters();

  if (this.value.trim() !== "") {
    clearBtn.style.display = "block";
  } else {
    clearBtn.style.display = "none";
  }
});

document.getElementById("showroomOnly").addEventListener("change", applyFilters);
document.getElementById("budgetFilter").addEventListener("change", applyFilters);

// Init
loadCars();

const lastUpdated = localStorage.getItem("bwm_last_updated");
if (lastUpdated) {
  document.getElementById("lastUpdated").innerText =
    "Last updated: " + lastUpdated;
}

function clearSearch() {
  const searchInput = document.getElementById("search");
  const clearBtn = document.getElementById("clearBtn");

  searchInput.value = "";
  clearBtn.style.display = "none";

  applyFilters();
}
