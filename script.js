'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

// let map, mapEvent;

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(distance, duration, coords) {
    this.distance = distance;
    this.duration = duration;
    this.coords = coords;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(distance, duration, coords, cadence) {
    super(distance, duration, coords);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    //here this.pace will create a new property on this object
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(distance, duration, coords, elevationGain) {
    super(distance, duration, coords);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running(5.2, 60, [12, 81], 178);
// console.log(run1.__proto__);
// const cycle = new Cycling(5.2, 60, [12, 81], 500);
// console.log(run1, cycle);

//////////////////////////////////////
//app arch
class App {
  #map;
  #mapEvent;
  #workouts = [];

  constructor() {
    // get user's position
    this._getPosition();

    // get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    //we need event listeners attached to the dom as soon as the script first loads
    //and sice constructor is called at very first when script first loads, we keep event listeners in here

    //this._newWorkout is eventListener func which is called by eventHandlerListener
    //eventHandlerFunc will have 'this' of the dom elem to which it is attached hence here this will be form
    //we need to fix that using bind
    form.addEventListener('submit', this._newWorkout.bind(this));

    inputType.addEventListener('change', this._toggleElevationField);
  }

  _getPosition() {
    if (navigator.geolocation) {
      //js will call the loadmap function and pass in the argument once user location is determined
      //but this._loadMap is going to be a regular function call instead of a method call
      //hence in reg func call 'this' is undefined
      //soluto is to maually bind the 'this' to whatever we want
      //in this case 'this' will be the current object itself
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('nai ho payega bhai');
        }
      );
    }
  }

  _loadMap(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;

    const coords = [latitude, longitude];

    // console.log(this);
    this.#map = L.map('map').setView(coords, 13);
    //the second param (13) is the default zoom level, higher number greater the zoom

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //handling clicks on map
    //on is like a substitute to addEventListener but in leaflet library
    this.#map.on('click', this._showForm.bind(this));

    //we call this at the very end of loadmap so that the whole map loads up first
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapevent) {
    this.#mapEvent = mapevent;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        '';
    form.classList.add('hidden');
  }

  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const positiveInputs = (...inputs) => inputs.every(inp => inp >= 0);

    e.preventDefault();

    // get data form form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    let workout;

    // if workout running create run object
    if (type === 'running') {
      const cadence = +inputCadence.value;

      // check if data is valid
      if (
        !validInputs(distance, duration, distance) ||
        !positiveInputs(duration, distance, cadence)
      ) {
        return alert('dekh ke daal na bhai');
      }

      //creating object
      workout = new Running(
        distance,
        duration,
        [this.#mapEvent.latlng.lat, this.#mapEvent.latlng.lng],
        cadence
      );
    }

    // if workout cycling create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      // check if data is valid
      if (
        !validInputs(duration, distance, elevation) ||
        !positiveInputs(duration, distance)
      ) {
        return alert('dekh ke daal na bhai');
      }

      //creating object
      workout = new Cycling(
        distance,
        duration,
        [this.#mapEvent.latlng.lat, this.#mapEvent.latlng.lng],
        elevation
      );
    }

    // add workout object to workout array
    this.#workouts.push(workout);

    // render workout on map as marker
    this._renderWorkoutMarker(workout);
    //we dont need bind here because we are calling the func ourselves and not a callback func hence
    //'this' in the called func will be the object itself

    // render workout on list
    this._renderWorkout(workout);

    // hide form and clear fields
    this._hideForm();

    // set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    const markCoords = workout.coords;
    L.marker(markCoords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 300,
          minWidth: 50,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
            <h2 class="workout__title">${workout.description}</h2>
            <div class="workout__details">
                <span class="workout__icon">${
                  workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
                }</span>
                <span class="workout__value">${workout.distance}</span>
                <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⏱</span>
                <span class="workout__value">${workout.duration}</span>
                <span class="workout__unit">min</span>
            </div>
    `;

    if (workout.type === 'running') {
      html += `
            <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.pace.toFixed(
                      1
                    )}</span>
                    <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
                    <span class="workout__icon">🦶🏼</span>
                    <span class="workout__value">${workout.cadence}</span>
                    <span class="workout__unit">spm</span>
            </div>
        </li>
        `;
    }

    if (workout.type === 'cycling') {
      html += `
            <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.speed.toFixed(
                      1
                    )}</span>
                    <span class="workout__unit">km/h</span>
            </div>
            <div class="workout__details">
                    <span class="workout__icon">⛰</span>
                    <span class="workout__value">${workout.elevationGain}</span>
                    <span class="workout__unit">m</span>
            </div>
        </li>
        `;
    }
    form.insertAdjacentHTML('afterend', html);
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    console.log(data);

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
      //we cannot render markers here because all this is happening before the map has even loaded
      //which is why we will add it in load map func
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();

// if (navigator.geolocation) {
//   navigator.geolocation.getCurrentPosition(
//     function (position) {
//       const latitude = position.coords.latitude;
//       const longitude = position.coords.longitude;

//       const coords = [latitude, longitude];

//       map = L.map('map').setView(coords, 13);
//       //the second param (13) is the default zoom level, higher number greater the zoom

//       L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
//         attribution:
//           '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
//       }).addTo(map);

//       //handling clicks on map
//       //on is like a substitute to addEventListener but in leaflet library
//       map.on('click', function (mapevent) {
//         mapEvent = mapevent;
//         form.classList.remove('hidden');
//         inputDistance.focus();
//       });
//     },
//     function () {
//       alert('nai ho payega bhai');
//     }
//   );
// }

// const app = new App();

// form.addEventListener('submit', function (e) {
//   e.preventDefault();

//   //clear fields
//   inputCadence.value = inputDistance.value = inputDuration.value = '';

//   //display marker
//   const markCoords = [mapEvent.latlng.lat, mapEvent.latlng.lng];
//   L.marker(markCoords)
//     .addTo(map)
//     .bindPopup(
//       L.popup({
//         maxWidth: 300,
//         minWidth: 50,
//         autoClose: false,
//         closeOnClick: false,
//         className: 'running-popup',
//       })
//     )
//     .setPopupContent('bhag bhosdike')
//     .openPopup();
// });

// inputType.addEventListener('change', function () {
//   inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
//   inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
// });
