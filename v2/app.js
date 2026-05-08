const API_URL =
"https://script.google.com/macros/s/AKfycbz8hbybFJOHB2Wn9tSdU-xsS7M7hCo5b2Rpljqs4us0MNvCVF4-Agx1PK7aTVHx-l2k/exec";

let carsData = [];

const carList =
document.getElementById('carList');

const searchInput =
document.getElementById('search');


// LOAD CARS
async function loadCars() {

  try {

    carList.innerHTML = `
      <div style="
        text-align:center;
        padding:40px;
        color:#9ca8b7;
      ">
        Loading inventory...
      </div>
    `;

    const response =
    await fetch(
      API_URL + "?key=BWM@2026",
      {
        cache: "no-store"
      }
    );

    const result =
    await response.json();

    carsData =
    result.cars || [];

    renderCars(carsData);

  }

  catch(err) {

    console.error(err);

    carList.innerHTML = `
      <div style="
        text-align:center;
        padding:40px;
        color:#ff6b6b;
      ">
        Failed to load inventory
      </div>
    `;

  }

}


// RENDER
function renderCars(cars) {

  carList.innerHTML = '';

  if(!cars.length) {

    carList.innerHTML = `
      <div style="
        text-align:center;
        padding:40px;
        color:#9ca8b7;
      ">
        No cars found
      </div>
    `;

    return;
  }

  cars.forEach(car => {

    let images = [];

    if(Array.isArray(car.images)) {

      images = car.images;

    }

    else if(typeof car.images === 'string') {

      images =
      car.images
      .split(',')
      .map(i => i.trim())
      .filter(Boolean);

    }

    images.sort();

    const image =
    images.length
    ? getOptimizedImage(images[0])
    : '';


    const showroom =
      car.showroom === true ||
      car.showroom === "TRUE";

    const booked =
      car.booked === true ||
      car.booked === "TRUE";

    let badge =
      showroom
      ? "AVAILABLE"
      : "INCOMING";

    if(booked)
      badge = "BOOKED";

    carList.innerHTML += `

      <div class="car-card" onclick="openDetails('${car.id}')">

        <div class="badge">
          ${badge}
        </div>

        ${
          image

          ? `
            <img
              src="${image}"
              class="car-image"
              loading="lazy"
            >
          `

          : `
            <div class="no-image">
              No Image
            </div>
          `
        }

        <div class="card-content">

          <div class="car-title">
            ${car.brand || ''} ${car.model || ''}
          </div>

          <div class="car-variant">
            ${car.variant || ''}
          </div>

          <div class="car-meta">

            <span>${car.year || '-'}</span>

            <span>•</span>

            <span>${car.fuel || '-'}</span>

            <span>•</span>

            <span>
              ${Number(car.km || 0).toLocaleString('en-IN')} km
            </span>

          </div>

          <div class="price-row">

            <div class="price">
              ${formatPrice(car.price)}
            </div>

            <button
              class="share-btn"
              onclick="shareCar(event, '${car.id}')"
            >
              📤
            </button>

          </div>

        </div>

      </div>

    `;

  });

}


// SEARCH
searchInput.addEventListener(
  'input',
  function() {

    const value =
    this.value.toLowerCase();

    const filtered =
    carsData.filter(car => {

      const text = `
        ${car.brand}
        ${car.model}
        ${car.variant}
        ${car.fuel}
        ${car.color}
        ${car.year}
      `
      .toLowerCase();

      return text.includes(value);

    });

    renderCars(filtered);

  }
);


// SHARE
function shareCar(event, id) {

  event.stopPropagation();

  const car =
  carsData.find(c => c.id == id);

  if(!car) return;

  const msg = `
🚗 ${car.brand} ${car.model}

📅 ${car.year}
⛽ ${car.fuel}
📍 ${Number(car.km || 0).toLocaleString('en-IN')} km

💰 ${formatPrice(car.price)}

Blue Wave Motors
Thrissur
  `;

  window.open(
    "https://wa.me/?text=" +
    encodeURIComponent(msg),
    "_blank"
  );

}


// IMAGE
function getOptimizedImage(
  url,
  size = 1200
) {

  if(!url) return '';

  if(url.includes('googleusercontent.com'))
    return url;

  const match =
  url.match(/[-\\w]{25,}/);

  if(!match)
    return url;

  return `
https://drive.google.com/thumbnail?id=${match[0]}&sz=w${size}
  `;
}


// PRICE
function parsePrice(price) {

  if(!price) return 0;

  let text =
  price.toString()
  .toLowerCase();

  text =
  text.replace(/,/g,'');

  const match =
  text.match(/[\\d.]+/);

  if(!match)
    return 0;

  let number =
  parseFloat(match[0]);

  if(text.includes('crore'))
    return number * 10000000;

  if(
    text.includes('lakh') ||
    text.includes('l')
  )
    return number * 100000;

  return number;

}


function formatPrice(price) {

  const n =
  parsePrice(price);

  if(!n)
    return price;

  if(n >= 10000000)
    return '₹ ' +
    (n / 10000000).toFixed(2) +
    ' Cr';

  if(n >= 100000)
    return '₹ ' +
    (n / 100000).toFixed(2) +
    ' Lakh';

  return '₹ ' +
  n.toLocaleString('en-IN');

}

const detailView =
document.getElementById('detailView');

const detailContent =
document.getElementById('detailContent');

const backBtn =
document.getElementById('backBtn');


// OPEN DETAILS
function openDetails(id) {

  const car =
  carsData.find(c => c.id == id);

  if(!car) return;

  let images = [];

  if(Array.isArray(car.images)) {

    images = car.images;

  }

  else if(typeof car.images === 'string') {

    images =
    car.images
    .split(',')
    .map(i => i.trim())
    .filter(Boolean);

  }

  images.sort();

  detailContent.innerHTML = `

    <div class="detail-image-slider">

      ${
        images.length

        ? images.map(img => `

          <img
            src="${getOptimizedImage(img)}"
            class="detail-image"
          >

        `).join('')

        : `

          <div class="no-image">
            No Images
          </div>

        `
      }

    </div>

    <div class="detail-info">

      <div class="detail-title">
        ${car.brand || ''}
        ${car.model || ''}
      </div>

      <div class="detail-variant">
        ${car.variant || ''}
      </div>

      <div class="price-badge">
        ${formatPrice(car.price)}
      </div>

      <div class="spec-grid">

        <div class="spec-card">

          <div class="spec-label">
            Fuel
          </div>

          <div class="spec-value">
            ${car.fuel || '-'}
          </div>

        </div>

        <div class="spec-card">

          <div class="spec-label">
            Year
          </div>

          <div class="spec-value">
            ${car.year || '-'}
          </div>

        </div>

        <div class="spec-card">

          <div class="spec-label">
            KM Driven
          </div>

          <div class="spec-value">
            ${Number(car.km || 0).toLocaleString('en-IN')}
          </div>

        </div>

        <div class="spec-card">

          <div class="spec-label">
            Color
          </div>

          <div class="spec-value">
            ${car.color || '-'}
          </div>

        </div>

      </div>

    </div>

    <div class="detail-actions">

      <button
        class="whatsapp-btn"
        onclick="shareCar(event, '${car.id}')"
      >
        📤 Share on WhatsApp
      </button>

    </div>

  `;

  detailView.classList.remove('hidden');

  document.body.style.overflow =
  'hidden';

}


// CLOSE DETAILS
backBtn.addEventListener(
  'click',
  function() {

    detailView.classList.add('hidden');

    document.body.style.overflow =
    '';

  }
);

// START
loadCars();