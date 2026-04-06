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

async function loadCars() {

  const loadingDiv = document.getElementById("loading");
  const lastUpdatedDiv = document.getElementById("lastUpdated");

  try {
    loadingDiv.style.display = "block";
    loadingDiv.innerText = "⏳ Loading cars...";

    const response = await fetch(API_URL);

    if (!response.ok) throw new Error("API error");

    const data = await response.json();

    if (!data || data.length === 0) {
      loadingDiv.innerText = "No cars available";
      return;
    }

    carsData = data.filter(car => car.brand && car.model);

    // ✅ Save offline data
    localStorage.setItem("bwm_cars", JSON.stringify(carsData));

    // ✅ Save timestamp
    const now = new Date().toLocaleString();
    localStorage.setItem("bwm_last_updated", now);

    loadingDiv.style.display = "none";

    // ✅ Show last updated
    lastUpdatedDiv.innerText = "Last updated: " + now;

    displayCars(carsData);

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

      displayCars(carsData);

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
}

document.getElementById("search").addEventListener("input", applyFilters);
document.getElementById("showroomOnly").addEventListener("change", applyFilters);
document.getElementById("budgetFilter").addEventListener("change", applyFilters);

loadCars();

document.getElementById("lastUpdated").innerText =
  "Last updated: " + localStorage.getItem("bwm_last_updated");
