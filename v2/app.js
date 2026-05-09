const API_URL =
"https://script.google.com/macros/s/AKfycbz8hbybFJOHB2Wn9tSdU-xsS7M7hCo5b2Rpljqs4us0MNvCVF4-Agx1PK7aTVHx-l2k/exec";

let carsData = [];
let activeFilter = 'all';
let detailTouchStartY = 0;

const carList =
document.getElementById('carList');

const searchInput =
document.getElementById('search');

async function fetchWithTimeout(

  resource,

  options = {}

) {

  const timeout =
  options.timeout || 15000;

  const controller =
  new AbortController();

  const id =
  setTimeout(
    () => controller.abort(),
    timeout
  );

  const response =
  await fetch(resource, {

    ...options,

    signal:
    controller.signal

  });

  clearTimeout(id);

  return response;

}


// LOAD CARS
async function loadCars(retryCount = 0) {

  try {

    carList.innerHTML = `

      <div style="
        text-align:center;
        padding:50px 20px;
        color:#9ca8b7;
      ">

        Loading inventory...

      </div>

    `;

    const response =
    await fetchWithTimeout(

      API_URL + "?key=BWM@2026&_=" + Date.now(),

      {
        cache: "no-store",
        timeout: 40000
      }

    );

    // Sometimes GAS returns HTML
    const text =
    await response.text();

    let result;

    try {

      result =
      JSON.parse(text);

    }

    catch(jsonErr) {

      throw new Error(
        "Invalid JSON response"
      );

    }

    carsData =
    result.cars || [];

    applyFilters();

  }

  catch(err) {

    console.log(
      'Load failed:',
      retryCount,
      err
    );

    // AUTO RETRY
    if(retryCount < 3) {

      setTimeout(() => {

        loadCars(retryCount + 1);

      }, 2500);

      return;

    }

    // FINAL FAILURE UI
    carList.innerHTML = `

      <div class="retry-box">

        <div class="retry-title">

          Unable to load inventory

        </div>

        <button
          class="retry-btn"
          onclick="loadCars()"
        >
          Retry
        </button>

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

    const image =
    images.length
    ? getOptimizedImage(images[0])
    : '';

    const showroom =
      [
        true,
        'true',
        'TRUE',
        'yes',
        'YES',
        '1',
        1
      ]
      .includes(car.showroom);

      const booked =
      [
        true,
        'true',
        'TRUE',
        'yes',
        'YES',
        'booked',
        'BOOKED',
        '1',
        1
      ]
      .includes(car.booked);

    let badgeText =
    showroom
    ? "AVAILABLE"
    : "INCOMING";

    let badgeClass =
    showroom
    ? "available"
    : "incoming";


    if(booked) {

      if(showroom) {

        badgeText =
        "BOOKED / IN SHOWROOM";

      }

      else {

        badgeText =
        "BOOKED / INCOMING";

      }

      badgeClass =
      "booked";

    }

    carList.innerHTML += `

      <div class="car-card" onclick="openDetails('${car.id}')">

        <div class="badge ${badgeClass}">
          ${badgeText}
        </div>

        ${
          image

          ? `

            <div class="card-image-wrap">

              <img
                src="${image}"
                class="car-image"
                loading="lazy"
              >

            </div>

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

            <span>•</span>

            <span>
              Owner ${car.owner || '-'}
            </span>

            <span>•</span>

            <span>
              TP: ${car.tpExpiry || '-'}
            </span>

            <span>•</span>

            <span>
              OD: ${car.odExpiry || '-'}
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
              <img
                src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/whatsapp.svg"
                class="wa-icon"
              >
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
  applyFilters
);


// SHARE
function shareCar(event, id) {

  event.stopPropagation();

  const car =
  carsData.find(c => c.id == id);

  if(!car) return;

  const specs = [

    car.year || '-',

    car.fuel || '-',

    `${Number(car.km || 0).toLocaleString('en-IN')} km`

  ]
  .filter(Boolean)
  .join(' | ');

  const message = `

*${car.brand || ''} ${car.model || ''}*

${specs}

${formatPrice(car.price)}

Blue Wave Motors
+91 89433 38111

  `;

  window.open(

    "https://wa.me/?text=" +
    encodeURIComponent(message),

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

  detailContent.innerHTML = `

    <div class="detail-slider-wrapper">

      <div
        class="detail-image-slider"
        id="detailSlider"
      >

        ${
          images.length

          ? images.map((img,index) => `

            <div
              class="detail-image-wrap"
              data-index="${index}"
            >
              <div
                class="detail-arrow left"
                onclick="slideDetailImages(-1)"
              >

                ‹

              </div>

              <div
                class="detail-arrow right"
                onclick="slideDetailImages(1)"
              >

                ›

              </div>

              <img
                src="${getOptimizedImage(img)}"
                class="detail-image"
              >

              <div class="image-count">

                ${index + 1}
                /
                ${images.length}

              </div>

            </div>

          `).join('')

          : `

            <div class="no-image">
              No Images
            </div>

          `
        }
      </div>
    </div>

    <div class="detail-info">

      <div class="car-title">
        ${car.brand || ''}
        ${car.model || ''}
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

        <span>•</span>

        <span>
          Owner ${car.owner || '-'}
        </span>

        <span>•</span>

        <span>
          TP: ${car.tpExpiry || '-'}
        </span>

        <span>•</span>

        <span>
          OD: ${car.odExpiry || '-'}
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

          <img
            src=\"https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/whatsapp.svg\"
            class=\"wa-icon\"
          >

        </button>
    </div>
  `;

  detailView.classList.remove('hidden');
  initInfiniteSlider();

  document.body.style.overflow =
  'hidden';

}


// CLOSE DETAILS
function closeDetails() {

  detailView.classList.add('hidden');

  document.body.style.overflow =
  '';

}

backBtn.addEventListener(
  'click',
  closeDetails
);

function initInfiniteSlider() {

  const slider =
  document.getElementById('detailSlider');

  if(!slider)
    return;

  let touchStartX = 0;

  let touchEndX = 0;

  slider.addEventListener(
    'touchstart',
    function(e) {

      touchStartX =
      e.changedTouches[0].screenX;

    }
  );

  slider.addEventListener(
    'touchend',
    function(e) {

      touchEndX =
      e.changedTouches[0].screenX;

      const maxScroll =
      slider.scrollWidth -
      slider.clientWidth;

      const atLastImage =
      slider.scrollLeft >=
      maxScroll - 5;

      const swipedLeft =
      touchEndX < touchStartX - 40;

      // ONLY after extra swipe
      if(
        atLastImage &&
        swipedLeft
      ) {

        slider.scrollTo({

          left: 0,

          behavior: 'smooth'

        });

      }

    }
  );

}

detailView.addEventListener(
  'touchstart',
  function(e) {

    detailTouchStartY =
    e.changedTouches[0].screenY;

  }
);


detailView.addEventListener(
  'touchend',
  function(e) {

    const touchEndY =
    e.changedTouches[0].screenY;

    const swipedDown =
    touchEndY >
    detailTouchStartY + 70;

    const atTop =
    detailView.scrollTop <= 5;

    if(
      swipedDown &&
      atTop
    ) {

      closeDetails();

    }

  }
);

const filterPills =
document.querySelectorAll('.pill');


filterPills.forEach(pill => {

  pill.addEventListener(
    'click',
    function() {

      filterPills.forEach(p => {

        p.classList.remove('active');

      });

      this.classList.add('active');

      activeFilter =
      this.dataset.filter;

      applyFilters();

    }
  );

});


function applyFilters() {

  const searchValue =
  searchInput.value
  .toLowerCase();

  let filtered =
  [...carsData];


  // SEARCH
  filtered =
  filtered.filter(car => {

    const text = `

      ${car.brand || ''}

      ${car.model || ''}

      ${car.variant || ''}

      ${car.fuel || ''}

      ${car.color || ''}

      ${car.year || ''}

    `
    .toLowerCase();

    return text.includes(searchValue);

  });


  // FILTERS
  if(activeFilter === 'diesel') {

    filtered =
    filtered.filter(car =>

      (car.fuel || '')
      .toLowerCase()
      .includes('diesel')

    );

  }


  else if(activeFilter === 'petrol') {

    filtered =
    filtered.filter(car =>

      (car.fuel || '')
      .toLowerCase()
      .includes('petrol')

    );

  }


  else if(activeFilter === 'showroom') {

    filtered =
    filtered.filter(car =>

      car.showroom === true ||
      car.showroom === 'TRUE'

    );

  }


  // PRICE FILTERS
  else if(
    activeFilter.startsWith('price-')
  ) {

    const lakh =
    Number(
      activeFilter.replace(
        'price-',
        ''
      )
    );

    const limit =
    lakh * 100000;

    filtered =
    filtered.filter(car => {

      const carPrice =
      parsePrice(car.price);

      return (
        carPrice > 0 &&
        carPrice <= limit
      );

    });

  }

  renderCars(filtered);

}

function slideDetailImages(direction) {

  const slider =
  document.getElementById('detailSlider');

  if(!slider)
    return;

  const imageWidth =
  slider.clientWidth;

  const maxScroll =
  slider.scrollWidth -
  slider.clientWidth;

  let target =
  slider.scrollLeft +
  (imageWidth * direction);

  // LOOP TO FIRST
  if(target > maxScroll) {

    target = 0;

  }

  // LOOP TO LAST
  if(target < 0) {

    target = maxScroll;

  }

  slider.scrollTo({

    left: target,

    behavior: 'smooth'

  });

}

// START
loadCars();