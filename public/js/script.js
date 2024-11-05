let map;
let currentController;
let locations = [];
let markers = [];
const resultsContainer = document.querySelector('.results-container');

document.querySelector('#search-form').addEventListener('submit', (e) => {
	e.preventDefault();
	handleFormSubmit('#search-form');
});

document.querySelector('#search-form-mini').addEventListener('submit', (e) => {
	e.preventDefault();
	handleFormSubmit('#search-form-mini');
});

// Handle form submission
function handleFormSubmit(formId) {
	const city = document.querySelector(`${formId} #city`).value;
	const state = document.querySelector(`${formId} #state`).value;
	const zip = document.querySelector(`${formId} #zip`).value;

	console.log('City:', city);
	console.log('State:', state);
	console.log('Zip:', zip);

	if (!city && !state && !zip) {
		alert('Please enter a city, state, or zip code.');
		return;
	}

	if (formId === '#search-form-mini') {
		const places = document.querySelector('.places');
		places.innerHTML = '';

		const loading = document.querySelector('.loading');
		loading.classList.remove('hidden');
	}

	convertToLatLng(city, state, zip);
}

// Show list of places based on the submitted address
function fetchPlaces(url) {
	if (currentController) {
		currentController.abort();
	}

	currentController = new AbortController();
	const { signal } = currentController;

	fetch(url, { signal })
		.then((response) => response.json())
		.then((data) => {
			console.log(data);

			const places = document.querySelector('.places');
			places.innerHTML = '';

			// Iterate through places and append them to the list
			data.forEach((place) => {
				locations = [...locations, place];

				let hours = '';

				if (!place.hours) {
					hours = '';
				} else if (place.hours.open_now) {
					hours = '<div class="hours open">Open Now</div>';
				} else {
					hours = '<div class="hours closed">Closed</div>';
				}

				const li = document.createElement('li');
				li.innerHTML = `

            <div class="name">${place.name}</div>

				<div class="rating"><i class="fa-solid fa-star"></i>${
					place.rating ? place.rating : '-'
				}</div>

            <div class="address">${place.vicinity}</div>

				${hours}

				${
					place.website
						? '<div class="website"><a href="' +
						  place.website +
						  '">Website</a></div>'
						: ''
				}

				${
					place.url
						? '<div class="google-maps-link"><a href="' +
						  place.url +
						  '">Open in Google Maps</a></div>'
						: ''
				}
      `;

				places.appendChild(li);
			});

			// Check if there's a next_page_token and fetch the next page
			if (data.next_page_token) {
				// Wait for the next_page_token to become active (2-5 seconds delay)
				setTimeout(() => {
					const nextPageUrl = `/api/places?location=${latLng.lat},${lngLng.lng}&radius=500000&keyword=gastroenterologist&pagetoken=${data.next_page_token}`;
					fetchPlaces(nextPageUrl);
				}, 3000);
			}
		})
		.then(() => {
			showMarkers();
			const loading = document.querySelector('.loading');
			loading.classList.add('hidden');
		})
		.catch((error) => {
			if (error.name === 'AbortError') {
				console.log('Previous request aborted, new request started.');
			} else {
				console.error('Error:', error);
			}
		});
}

// Show markers on the map
function showMarkers() {
	markers.forEach((marker) => marker.setMap(null));

	locations.forEach((location) => {
		const marker = new google.maps.Marker({
			position: { lat: location.location.lat, lng: location.location.lng },
			map: map,
			title: location.title,
		});

		marker.addListener('click', () => {
			const position = marker.getPosition();
			map.setCenter(position);

			map.setZoom(15);
		});

		markers.push(marker);
	});

	const bounds = new google.maps.LatLngBounds();
	locations.forEach((location) => {
		bounds.extend(
			new google.maps.LatLng(location.location.lat, location.location.lng)
		);
	});
	map.fitBounds(bounds);

	locations = [];
}

// Convert submitted address to Lat/Lng
function convertToLatLng(city, state, zip) {
	const address = `${city ? city : ''}${state ? ', ' + state : ''}${
		zip ? ', ' + zip : ''
	}`;

	fetch(`/api/geocode?address=${encodeURIComponent(address)}`)
		.then((response) => response.json())
		.then((data) => {
			console.log(data.latLng);
			const { lat, lng } = data.latLng;

			const searchUrl = `/api/places?location=${lat},${lng}&radius=50000&keyword=gastroenterologist+digestive+health+GI+doctor`;
			fetchPlaces(searchUrl);
			moveCenterLocation(lat, lng);
		})
		.catch((error) => {
			console.error('Error:', error);
			alert('Unable to locate. Please enter more information.');
		});
}

// Initialize Google Maps
function initMap() {
	console.log('Initializing map...');
	map = new google.maps.Map(document.getElementById('map'), {
		center: { lat: 39.8283, lng: -98.5795 },
		zoom: 5,
		disableDefaultUI: true,
	});
}

// Load the Google Maps API script
function loadGoogleMapsScript() {
	fetch('/api/maps')
		.then((response) => response.text())
		.then((url) => {
			console.log('Loading Google Maps script...');
			const script = document.createElement('script');
			script.src = url;
			script.async = true;
			script.defer = true;
			document.head.appendChild(script);
		})
		.catch((error) =>
			console.error('Error loading Google Maps script:', error)
		);
}

function moveCenterLocation(lat, lng) {
	if (map && typeof map.setCenter === 'function') {
		console.log('Moving map center...');
		console.log(lat, lng);
		// Move the center of the map and set the zoom level
		map.setCenter({ lat, lng });
		map.setZoom(12);

		// Hide the home container
		const homeContainer = document.querySelector('.home-container');
		homeContainer.style.display = 'none';

		// Remove map background filter
		const mapContainer = document.querySelector('#map');
		mapContainer.style.backdropFilter = 'none';
		mapContainer.style.filter = 'none';

		// Show the results container
		const resultsContainer = document.querySelector('.results-container');
		resultsContainer.classList.remove('hidden');
	} else {
		console.error('Map not initialized correctly.');
	}
}

// Initialization
// Load the Google Maps API script dynamically
loadGoogleMapsScript();
