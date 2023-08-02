// PROVIDED CODE BELOW (LINES 1 - 80) DO NOT REMOVE

// The store will hold all information needed globally
let store = {
	track_id: undefined,
	player_id: undefined,
	race_id: undefined,
};

const trackNames = ['Mos Eisley', 'Dantooine', 'Coruscant', 'Nal Hutta', 'Corellia', 'Dathomir'];

const racerNames = ['Anakin', 'Ahsoka', 'Obi-wan', 'Jar-Jar', 'Captain Rex'];

// We need our javascript to wait until the DOM is loaded
document.addEventListener("DOMContentLoaded", function() {
	onPageLoad()
	.then(() => {
		console.log('got tracks and racers');
		// now that everything is dynamically rendered, we can attach listeners
		setupTrackHandlers();
		setupPodHandlers();
		setupSubmitHandler();
	})
});

async function onPageLoad() {
	try {
		await getTracks()
			.then(tracks => {
				const html = renderTrackCards(tracks);
				// console.log(tracks);
				renderAt('#tracks', html);
			});

		await getRacers()
			.then((racers) => {
				const html = renderRacerCars(racers);
				// console.log(racers);
				renderAt('#racers', html);
			});
	} catch(error) {
		console.log("Problem getting tracks and racers ::", error.message);
		console.error(error);
	}
}

/* The click handlers as provided (in setupClickHandlers()) did not work properly because clicking on any child element inside the card (list item) did not return the id of the entire card. Fix: Use event.currentTarget instead of event.target. I also think it is a bit more robust to attach listeners directly to elements */

function setupTrackHandlers() {
	const listItems = document.querySelectorAll('#tracks li');
	listItems.forEach(item => {
		item.addEventListener('click', function(event) {
			handleSelectTrack(event.currentTarget);
		});
	});
}

function setupPodHandlers() {
	const listItems = document.querySelectorAll('#racers li');
	listItems.forEach(item => {
		item.addEventListener('click', function(event) {
			handleSelectPodRacer(event.currentTarget);
		});
	});
}

function setupSubmitHandler() {
	const submit = document.querySelector('#submit-create-race');
	submit.addEventListener('click', function(event) {
		event.preventDefault();

		// error check before submitting
		if (!getPlayerId() || !getTrackId()) {
			alert('Please select a track and racer before submitting.');
		} else {
			handleCreateRace();
		}	

	});
}

function setupAccelHandler() {
	const accelButton = document.querySelector('#gas-peddle');
	accelButton.addEventListener('click', function(event) {
		handleAccelerate();
	});
}

/*
function setupClickHandlers() {
	document.addEventListener('click', function(event) {
		const { target } = event

		// Race track form field
		if (currentTarget.matches('.card.track')) {
			handleSelectTrack(target)
		}

		// Podracer form field
		if (currentTarget.matches('.card.podracer')) {
			handleSelectPodRacer(target)
		}

		// Submit create race form
		if (currentTarget.matches('#submit-create-race')) {
			event.preventDefault()
	
			// start race
			handleCreateRace()
		}

		// Handle acceleration click
		if (target.matches('#gas-peddle')) {
			handleAccelerate()
		}

	}, false)
}
*/

async function delay(ms) {
	try {
		return await new Promise(resolve => setTimeout(resolve, ms));
	} catch(error) {
		console.log("an error shouldn't be possible here");
		console.log(error);
	}
}
// ^ PROVIDED CODE ^ DO NOT REMOVE

// This async function controls the flow of the race, add the logic and error handling
async function handleCreateRace() {

	try {
		// get tracks, then find current track in order to render the name in renderRaceStartView()
		const tracks = await getTracks();
		let track = tracks.find(e => e.id === getTrackId());

		// render starting UI
		renderAt('#race', renderRaceStartView(track));

		// add handler for acceleration button (now that the view is rendered)
		setupAccelHandler();

		// Get player_id and track_id from the store
		const playerId = getPlayerId();
		const trackId = getTrackId();
		
		// invoke the API call to create the race, then save the result
		const race = await createRace(playerId, trackId);
		console.log(race);

		// update the store with the race id
		// For the API to work properly, the race id should be race id - 1
		let raceId = race.ID - 1;

		/* There's a bug presumably on the server side: An attempt will to start a race with id 1 fail with the error 'invalid race id'.
		This is a workaround: A new race is created in this case   */
		if (raceId === 1) {
			await createRace(playerId, trackId);
			raceId++;
		}

		setRaceId(raceId);
		console.log(store);
		
		// The race has been created, now start the countdown
		await runCountdown();

		await startRace(getRaceId());

		await runRace(getRaceId());

	} catch(err) {
		console.log('Error running the race:', err);
	}
}

function runRace(raceID) {

	// queries getRace() in an interval of 500 ms and displays race progess during race as well as the final result

	return new Promise(resolve => {

		const raceInterval = setInterval(() => {
			getRace(raceID)
			.then(res => {
				console.log(res);
				renderAt('#leaderBoard', raceProgress(res.positions));
				return res;
			})
			.then(res => {
				if (res.status === 'finished') {
					clearInterval(raceInterval);
					renderAt('#race', resultsView(res.positions));
					resolve(res);
				}
			})
			.catch(err => console.log("Problem fetching race info::", err));
			
		}, 500);

	})
}

async function runCountdown() {
	try {
		// wait for the DOM to load
		// await delay(1000);
		let timer = 3;

		return new Promise(resolve => {

			const interval = setInterval(() => {
				// run this DOM manipulation to decrement the countdown for the user
				document.getElementById('big-numbers').innerHTML = --timer;
				if (timer === 0) {
					// if the countdown is done, clear the interval, resolve the promise, and return
					clearInterval(interval);
					resolve();
				}
			}, 1000);

		})
	} catch(error) {
		console.log(error);
	}
}

function handleSelectPodRacer(target) {
	console.log("selected a pod", target.id);

	// remove class selected from all racer options
	const selected = document.querySelector('#racers .selected');
	if(selected) {
		selected.classList.remove('selected');
	}

	// add class selected to current target
	target.classList.add('selected');

	// save the selected racer to the store
	setPlayerId(target.id);
}

function handleSelectTrack(target) {
	console.log("selected a track", target.id);

	// remove class selected from all track options
	const selected = document.querySelector('#tracks .selected');
	if(selected) {
		selected.classList.remove('selected');
	}

	// add class selected to current target
	target.classList.add('selected');

	// save the selected track id to the store
	setTrackId(target.id);
}

function handleAccelerate() {
	accelerate(getRaceId());
}

// ------------ Getters and setters for the store  --------

function getPlayerId() {
	return store.player_id;
}

function setPlayerId(id) {
	store.player_id = parseInt(id);
	// console.log(store);
}

function getTrackId() {
	return store.track_id;
}

function setTrackId(id) {
	store.track_id = parseInt(id);
	// console.log(store);
}

function getRaceId() {
	return store.race_id;
}

function setRaceId(id) {
	store.race_id = parseInt(id);
	// console.log(store);
}

// HTML VIEWS ------------------------------------------------
// Provided code - do not remove

function renderRacerCars(racers) {
	if (!racers.length) {
		return `
			<h4>Loading Racers...</4>
		`;
	}

	const results = racers.map(renderRacerCard).join('');

	// removed duplicate css id 'racer'
	return `
			${results}
	`;
}

function renderRacerCard(racer) {
	const { id, driver_name, top_speed, acceleration, handling } = racer;

	return `
		<li class="card podracer" id="${id}">
			<h3>${driver_name}</h3>
			<p>Top speed: ${top_speed}</p>
			<p>Acceleration: ${acceleration}</p>
			<p>Handling: ${handling}</p>
		</li>
	`;
}

function renderTrackCards(tracks) {
	if (!tracks.length) {
		return `
			<h4>Loading Tracks...</4>
		`;
	}

	const results = tracks.map(renderTrackCard).join('');

	// removed duplicate css id 'tracks'
	return `
			${results}
	`;
}

function renderTrackCard(track) {
	const { id, name } = track;

	return `
		<li id="${id}" class="card track">
			<h3>${name}</h3>
		</li>
	`;
}

function renderCountdown(count) {
	return `
		<h2>Race Starts In...</h2>
		<p id="big-numbers">${count}</p>
	`;
}

function renderRaceStartView(track) {
	return `
		<header>
			<h1>Race: ${track.name}</h1>
		</header>
		<main id="two-columns">
			<section id="leaderBoard">
				${renderCountdown(3)}
			</section>

			<section id="accelerate">
				<h2>Directions</h2>
				<p>Click the button as fast as you can to make your racer go faster!</p>
				<button id="gas-peddle">Click Me To Win!</button>
			</section>
		</main>
		<footer></footer>
	`;
}

function resultsView(positions) {
	positions.sort((a, b) => (a.final_position > b.final_position) ? 1 : -1);

	return `
		<header>
			<h1>Race Results</h1>
		</header>
		<main>
			${raceProgress(positions)}
			<a class="button" href="/race">Start a new race</a>
		</main>
	`;
}

function raceProgress(positions) {
	let userPlayer = positions.find(e => e.id === getPlayerId());
  userPlayer.driver_name += " (you)";

	positions = positions.sort((a, b) => (a.segment > b.segment) ? -1 : 1);
	let count = 1;

	const results = positions.map(p => {
		return `
			<tr>
				<td>
					<h3>${count++} - ${p.driver_name}</h3>
				</td>
			</tr>
		`
	}).join(''); // added a join to render the elements correctly

	return `
		<h2>Leaderboard</h2>
		&nbsp;
		<table>
			${results}
		<table>
	`;
}

function renderAt(element, html) {
	const node = document.querySelector(element);

	node.innerHTML = html;
}

// ^ Provided code ^ do not remove


// API CALLS ------------------------------------------------

const SERVER = 'http://localhost:3001'

function defaultFetchOpts() {
	return {
		mode: 'cors',
		headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin' : SERVER,
		},
	};
}

// Make a fetch call (with error handling!) to each of the following API endpoints 

function getTracks() { // returns a promise
	// GET request to `${SERVER}/api/tracks`
	return fetch(`${SERVER}/api/tracks`)
	.then(res => res.json())
	.then(res => {
		// inject track names from array
		const tracks = res.map((track, index) => {
			track.name = trackNames[index];
			return track;
		});
		return tracks;
	})
	.catch(err => console.log("Problem with getTracks request:", err));
}

function getRacers() { // returns a promise
	// GET request to `${SERVER}/api/cars`
	return fetch(`${SERVER}/api/cars`)
	.then(res => res.json())
	.then(res => {
		// inject racer names from array
		const racers = res.map((racer, index) => {
			racer.driver_name = racerNames[index];
			return racer;
		});
		return racers;
	})
	.catch(err => console.log("Problem with getRacers request:", err));
}

function createRace(player_id, track_id) { // returns a promise
	player_id = parseInt(player_id);
	track_id = parseInt(track_id);
	const body = { player_id, track_id };
	
	return fetch(`${SERVER}/api/races`, {
		method: 'POST',
		...defaultFetchOpts(),
		dataType: 'jsonp',
		body: JSON.stringify(body)
	})
	.then(res => res.json())
	.catch(err => console.log("Problem with createRace request::", err));
}

function getRace(id) {
	// GET request to `${SERVER}/api/races/${id}`
	return fetch(`${SERVER}/api/races/${id}`)
	.then(res => res.json())
	.then(res => {
		// inject racer names from array
		const racers = res.positions.map((racer, index) => {
			racer.driver_name = racerNames[index];
			return racer;
		});
		res.positions = racers;
		return res;
	})
	.catch(err => console.log("Problem with getRace request:", err));
}

function startRace(id) {
	return fetch(`${SERVER}/api/races/${id}/start`, {
		method: 'POST',
		...defaultFetchOpts(),
	})
	.then(res => {
		console.log(`Race with ID ${id} started: ${res.status}`);
	})
	.catch(err => console.log("Problem with startRace request::", err));
}

function accelerate(id) {
	// POST request to `${SERVER}/api/races/${id}/accelerate`
	// options parameter provided as defaultFetchOpts
	// no body or datatype needed for this request
	return fetch(`${SERVER}/api/races/${id}/accelerate`, {
		method: 'POST',
		...defaultFetchOpts(),
	})
	.then(res => {
		console.log(`Player accelerated: ${res.status}`);
	})
	.catch(err => console.log("Problem with accelerate request::", err));
}
