require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.use(cors());

app.get('/', (req, res) => {
	res.send('Server is running');
});

// Nearby Search with Pagination Support
app.get('/api/places', async (req, res) => {
	const { location, radius, keyword } = req.query;
	const apiKey = 'AIzaSyD6CnVdH_CGjfZHfnksvGbL69aOw0HRvFw';
	let allResults = [];

	try {
		let nextPageToken = null;
		let hasMorePages = true;

		// Loop through paginated results
		while (hasMorePages) {
			const response = await axios.get(
				`https://maps.googleapis.com/maps/api/place/nearbysearch/json`,
				{
					params: {
						location,
						radius,
						keyword,
						pagetoken: nextPageToken || '',
						key: apiKey,
					},
				}
			);

			// Accumulate the current page results
			allResults = [...allResults, ...response.data.results];

			// Check if there is a next_page_token for more results
			nextPageToken = response.data.next_page_token;

			// If there's a next_page_token, wait before making the next request
			if (nextPageToken) {
				await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait 3 seconds before using the token
			} else {
				hasMorePages = false; // No more pages available
			}

			console.log('Total results: ' + allResults + 'END TOTAL RESULTS');
		}

		// Extract place IDs and fetch details for each place
		const placeDetailsPromises = allResults.map((place) => {
			return axios.get(
				`https://maps.googleapis.com/maps/api/place/details/json`,
				{
					params: {
						place_id: place.place_id,
						key: apiKey,
					},
				}
			);
		});

		// Fetch details for all places
		const detailsResponses = await Promise.all(placeDetailsPromises);
		const placesWithHours = detailsResponses.map((detailsResponse) => {
			const details = detailsResponse.data.result;
			console.log(details);
			return {
				name: details.name,
				vicinity: details.vicinity,
				rating: details.rating,
				hours: details.opening_hours,
				website: details.website,
				location: details.geometry.location,
				url: details.url,
			};
		});

		res.json(placesWithHours);
	} catch (error) {
		console.error('Error fetching data from Google Places API:', error.message);
		res.status(500).send(error.message);
	}
});

// Convert address to lat/lng using Google Geocoding API route
app.get('/api/geocode', async (req, res) => {
	const { address } = req.query;

	const apiKey = 'AIzaSyD6CnVdH_CGjfZHfnksvGbL69aOw0HRvFw';

	try {
		// Call Google Geocoding API
		const response = await axios.get(
			'https://maps.googleapis.com/maps/api/geocode/json',
			{
				params: {
					address: address,
					key: apiKey,
				},
			}
		);

		const results = response.data.results;

		if (results.length > 0) {
			// Extract latitude and longitude from the response
			const latLng = results[0].geometry.location;
			res.json({ latLng }); // Send the lat/lng back to the client
		} else {
			res.status(404).json({ error: 'Address not found' });
		}
	} catch (error) {
		console.error(
			'Error fetching data from Google Geocoding API:',
			error.message
		);
		res.status(500).json({ error: 'Failed to fetch location data' });
	}
});

// Load Map
app.get('/api/maps', async (req, res) => {
	try {
		const googleMapsApiKey = process.env.API_KEY; // Hide API key in environment variables

		const googleMapsUrl = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&callback=initMap`;

		res.send(googleMapsUrl); // Send the data as a response
	} catch (error) {
		console.error('Error fetching data from Google Maps API:', error.message);
		res.status(500).send(error.message);
	}
});

// Start the server
app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});
