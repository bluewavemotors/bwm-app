const cars = [

  {

    brand: "BMW",
    model: "330Li",

    variant: "M Sport",

    year: "2022",

    fuel: "Petrol",

    km: "18,000 km",

    price: "48.90 Lakh",

    image:
    "https://images.unsplash.com/photo-1555215695-3004980ad54e?q=80&w=1200"

  },

  {

    brand: "Mercedes-Benz",
    model: "E200",

    variant: "Exclusive",

    year: "2021",

    fuel: "Petrol",

    km: "32,000 km",

    price: "46.75 Lakh",

    image:
    "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?q=80&w=1200"

  },

  {

    brand: "Audi",
    model: "Q5",

    variant: "Quattro",

    year: "2022",

    fuel: "Diesel",

    km: "22,000 km",

    price: "52.50 Lakh",

    image:
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1200"

  }

];

const carList =
document.getElementById('carList');

function renderCars() {

  carList.innerHTML = '';

  cars.forEach(car => {

    carList.innerHTML += `

      <div class="car-card">

        <div class="badge">
          AVAILABLE
        </div>

        <img
          src="${car.image}"
          class="car-image"
        >

        <div class="card-content">

          <div class="car-title">
            ${car.brand} ${car.model}
          </div>

          <div class="car-variant">
            ${car.variant}
          </div>

          <div class="car-meta">

            <span>${car.year}</span>
            <span>•</span>

            <span>${car.fuel}</span>
            <span>•</span>

            <span>${car.km}</span>

          </div>

          <div class="price-row">

            <div class="price">
              ₹ ${car.price}
            </div>

            <button class="share-btn">
              📤
            </button>

          </div>

        </div>

      </div>

    `;

  });

}

renderCars();