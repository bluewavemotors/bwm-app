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

  if (clean.includes('lakh')) {
    return parseFloat(clean) * 100000;
  }

  if (clean.includes('l')) {
    return parseFloat(clean) * 100000;
  }

  return parseFloat(clean);
}

function doGet(e) {

  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName("To-Share");

  const data = sheet.getDataRange().getValues();
  const headers = data.shift();

  const map = {
    "SL NO": "id",
    "REG NO": "regNo",
    "BRAND": "brand",
    "MODEL": "model",
    "VARIANT": "variant",
    "PRICE": "price",
    "COLOR": "color",
    "YEAR": "year",
    "FUEL": "fuel",
    "MILEAGE": "km",
    "OWNER": "owner",
    "Ins TP Expiry": "tpExpiry",
    "Ins OD Expiry": "odExpiry",
    "IDV": "idv",
    "In Showroom": "status"
  };

  let cars = data.map(row => {

    let obj = {};

    headers.forEach((h, i) => {
      let key = map[h] || h;
      obj[key] = row[i];
    });

    obj.showroom = (obj.status || "").toString().includes("Yes");
    obj.booked = (obj.status || "").toString().includes("Booked");

    return obj;
  });

  // 🔥 Version changes ONLY when sheet changes.
  const lastUpdated = Utilities.base64Encode(
    Utilities.computeDigest(
      Utilities.DigestAlgorithm.MD5,
      JSON.stringify(data)
    )
  );

  return ContentService
    .createTextOutput(JSON.stringify({
      lastUpdated: lastUpdated,
      cars: cars
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

async function loadCars() {

  const loadingDiv = document.getElementById("loading");
  const lastUpdatedDiv = document.getElementById("lastUpdated");

  // ✅ Restore saved filters (VERY IMPORTANT)
  const savedFilters = JSON.parse(localStorage.getItem("bwm_filters") || "{}");

  document.getElementById("search").value = savedFilters.search || "";
  document.getElementById("showroomOnly").checked = savedFilters.showroomOnly || false;
  document.getElementById("budgetFilter").value = savedFilters.budget || "";

  try {
    loadingDiv.style.display = "block";
    loadingDiv.innerText = "⏳ Loading cars...";

    const response = await fetch(API_URL);

    if (!response.ok) throw new Error("API error");

    const result = await response.json();

    let serverVersion;
    let cars;

    // 🔥 Handle BOTH formats
    if (Array.isArray(result)) {
      cars = result;
      serverVersion = "old";
    } else {
      cars = result.cars;
      serverVersion = result.lastUpdated;
    }

    const storedVersion = localStorage.getItem("bwm_version");

    // ✅ If NO CHANGE → use cached data
    if (storedVersion === serverVersion) {

      const cached = localStorage.getItem("bwm_cars");

      if (cached) {
        carsData = JSON.parse(cached);

        loadingDiv.style.display = "none";

        lastUpdatedDiv.innerText =
          "Last updated: " + localStorage.getItem("bwm_last_updated");

        // ✅ Apply filters instead of displayCars
        applyFilters();
        return;
      }
    }

    // 🔥 Data changed → update fresh data
    carsData = cars.filter(car => car.brand && car.model);

    // Save cache
    localStorage.setItem("bwm_cars", JSON.stringify(carsData));
    localStorage.setItem("bwm_version", serverVersion);

    const now = new Date().toLocaleString();
    localStorage.setItem("bwm_last_updated", now);

    loadingDiv.style.display = "none";

    lastUpdatedDiv.innerText = "Last updated: " + now;

    // ✅ Apply filters after refresh
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

      // ✅ Apply filters in offline also
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

  cars.forEach(car => {

    let statusClass = "yellow";
    let statusText = "Not in Showroom";

    if (car.showroom && !car.booked) {
      statusClass = "green";
      statusText = "Available";
    }

    if (!car.showroom && !car.booked) {
      statusClass = "yellow";
      statusText = "Yard / Incoming";
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
  applyFilters(); // maintain filter state when going back
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

  const encodedMessage = encodeURIComponent(message);

  const whatsappURL = `https://wa.me/?text=${encodedMessage}`;

  window.open(whatsappURL, "_blank");
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

  // ✅ SAVE FILTERS
  localStorage.setItem("bwm_filters", JSON.stringify({
    search: document.getElementById("search").value,
    showroomOnly: document.getElementById("showroomOnly").checked,
    budget: document.getElementById("budgetFilter").value
  }));
}


document.getElementById("search").addEventListener("input", applyFilters);
document.getElementById("showroomOnly").addEventListener("change", applyFilters);
document.getElementById("budgetFilter").addEventListener("change", applyFilters);

loadCars();

const lastUpdated = localStorage.getItem("bwm_last_updated");

if (lastUpdated) {
  document.getElementById("lastUpdated").innerText =
    "Last updated: " + lastUpdated;
}

function clearSearch() {
  document.getElementById("search").value = "";
  applyFilters();
}
