// ============================================================================
// T-FRACTAL 3D - 3D Toroidal Fractal Slice Viewer
// Visualizes 2D slices through a 3D toroidal fractal generated from a small
// 3D seed via repeated toroidal expansion.
// ============================================================================

// GLOBAL STATE
let iterations = 8;                    // Fractal iterations (2^iterations = XY resolution)
let sizexy = 1 << iterations;          // XY canvas resolution
let sizez = 1 << iterations;           // Z depth (slice count)
let pixelSize = 2;                     // Pixel scaling factor

let seed3d = null;                     // 3D seed: seed3d[x][y][z] ∈ {0,1}
let seedSize = 4;                      // Seed cube edge length

let currentZ = 0;                      // Current Z slice
let level = 0;                         // Level threshold (level color mode)
let seedToolsVisible = false;          // Seed editor UI state

// SETTINGS
function updateGlobalSettings() {
	iterations = parseInt(document.getElementById("iterations").value, 10);
	pixelSize  = parseInt(document.getElementById("pixelSize").value, 10);

	sizexy = 1 << iterations;
	sizez  = 1 << iterations;

	const zSlider = document.getElementById("zSlice");
	zSlider.min = 0;
	zSlider.max = sizez - 1;

	currentZ = Math.min(currentZ, sizez - 1);
	zSlider.value = currentZ;

	document.getElementById("zSliceValue").textContent = currentZ;
	document.getElementById("zMaxValue").textContent = sizez - 1;
}

// ============================================================================
// 3D SEED ALLOCATION & GENERATION
// Seed is small N×N×N binary cube that tiles toroidally to generate fractal.
// ============================================================================

// Allocate N×N×N 3D seed array filled with `fill` value
function allocSeed3D(n, fill = 0) {
	const s = new Array(n);
	for (let x = 0; x < n; x++) {
		s[x] = new Array(n);
		for (let y = 0; y < n; y++) {
			s[x][y] = new Array(n).fill(fill);
		}
	}
	return s;
}

// Ring seed: 1s on XY perimeter extruded through all Z slices
function makeRingSeed3D(n) {
	const s = allocSeed3D(n, 0);
	for (let x = 0; x < n; x++) {
		for (let y = 0; y < n; y++) {
			const v = (x === 0 || y === 0 || x === n - 1 || y === n - 1) ? 1 : 0;
			for (let z = 0; z < n; z++) s[x][y][z] = v;
		}
	}
	return s;
}

// Randomized symmetric seed with rotational symmetry
function makeRandomSeed3D(n) {
	const s = allocSeed3D(n, 0);

	function genLayer(z) {
		for (let i = 0; i < n; i++) {
			for (let j = 0; j < n; j++) {
				if (i <= j && i + j <= n - 1) {
					const v = Math.random() < 0.5 ? 1 : 0;
					s[i][j][z] = v;
					s[j][i][z] = v;
					s[n-1-i][n-1-j][z] = v;
					s[n-1-j][n-1-i][z] = v;
				}
			}
		}
	}

	const half = Math.floor(n / 2);
	const genCount = (n % 2 === 0) ? half : half + 1;

	for (let z = 0; z < genCount; z++) genLayer(z);

	const useRot180 = Math.random() < 0.5;
	for (let z = 0; z < half; z++) {
		const z2 = n - 1 - z;
		for (let x = 0; x < n; x++) {
			for (let y = 0; y < n; y++) {
				s[x][y][z2] = useRot180
					? s[y][n-1-x][z]
					: s[x][y][z];
			}
		}
	}

	return s;
}

// ============================================================================
// SEED EDITOR UI
// Interactive 3D seed editor with per-layer checkbox grids.
// ============================================================================

function toggleSeedTools() {
	seedToolsVisible = !seedToolsVisible;
	document.getElementById("seedTools").style.display =
		seedToolsVisible ? "block" : "none";
}

// Render interactive checkbox grid for each Z layer of seed
function renderSeedEditor() {
	const container = document.getElementById("seedLayers");
	container.innerHTML = "";

	const n = seed3d.length;

	for (let z = 0; z < n; z++) {
		const layerDiv = document.createElement("div");
		layerDiv.className = "seedLayer";
		layerDiv.innerHTML = `<b>Z=${z}</b>`;

		const table = document.createElement("table");
		table.style.borderCollapse = "collapse";

		for (let y = 0; y < n; y++) {
			const tr = document.createElement("tr");
			for (let x = 0; x < n; x++) {
				const td = document.createElement("td");
				td.style.padding = "2px";

				const cb = document.createElement("input");
				cb.type = "checkbox";
				cb.id = `cb_${x}_${y}_${z}`;
				cb.checked = !!seed3d[x][y][z];

				td.appendChild(cb);
				tr.appendChild(td);
			}
			table.appendChild(tr);
		}

		layerDiv.appendChild(table);
		container.appendChild(layerDiv);
	}
}

function wipeSeed() {
	const n = seed3d.length;
	for (let x = 0; x < n; x++)
		for (let y = 0; y < n; y++)
			for (let z = 0; z < n; z++)
				seed3d[x][y][z] = 0;

	renderSeedEditor();
	renderCurrentSlice();
}

function setRingSeed() {
	seed3d = makeRingSeed3D(seedSize);
	renderSeedEditor();
	renderCurrentSlice();
}

function randomizeSeed() {
	seed3d = makeRandomSeed3D(seedSize);
	renderSeedEditor();
	renderCurrentSlice();
}

// Resize seed preserving content up to minimum dimension
function resizeSeedFromUI() {
	const n = parseInt(document.getElementById("seedSize").value, 10);
	seedSize = n;

	const old = seed3d;
	seed3d = allocSeed3D(n, 0);

	if (old) {
		const m = Math.min(old.length, n);
		for (let x = 0; x < m; x++)
			for (let y = 0; y < m; y++)
				for (let z = 0; z < m; z++)
					seed3d[x][y][z] = old[x][y][z] ? 1 : 0;
	}

	renderSeedEditor();
	renderCurrentSlice();
}

// Read seed values from checkbox UI into seed3d array
function applySeedFromGrid() {
	const n = seed3d.length;
	for (let z = 0; z < n; z++) {
		for (let y = 0; y < n; y++) {
			for (let x = 0; x < n; x++) {
				const cb = document.getElementById(`cb_${x}_${y}_${z}`);
				seed3d[x][y][z] = cb && cb.checked ? 1 : 0;
			}
		}
	}
	renderCurrentSlice();
}

// ============================================================================
// CORE FRACTAL COMPUTATION
// Compute 2D XY slice at given Z by toroidal summation of seed.
// Each iteration level contributes seed[px%N][py%N][pz%N] where p*=floor(pos/step)
// ============================================================================

// Compute density slice at zSlice via toroidal seed lookup at all iteration scales
function computeSlice2D(zSlice) {
	const n = seed3d.length;
	const slice = Array.from({ length: sizexy }, () =>
		new Array(sizexy).fill(0)
	);

	// Sum contributions from each iteration level
	for (let i = 0; i < iterations - 1; i++) {
		const step = 1 << i;
		const pz = Math.floor(zSlice / step) % n;

		for (let x = 0; x < sizexy; x++) {
			const px = Math.floor(x / step) % n;
			for (let y = 0; y < sizexy; y++) {
				const py = Math.floor(y / step) % n;
				slice[x][y] += seed3d[px][py][pz];
			}
		}
	}

	// Compute min/max for normalization
	let min = Infinity, max = -Infinity;
	for (let x = 0; x < sizexy; x++)
		for (let y = 0; y < sizexy; y++) {
			const v = slice[x][y];
			if (v < min) min = v;
			if (v > max) max = v;
		}

	return { slice, min, max, range: (max - min) || 1 };
}

// ============================================================================
// RENDERING PIPELINE
// ============================================================================

// Handle color mode changes (shows/hides level slider)
function onModeChange() {
	const mode = document.getElementById("colorMode").value;
	document.getElementById("levelRow").style.display =
		(mode === "level") ? "block" : "none";
	renderCurrentSlice();
}

// Render current Z-slice to canvas using active color mode
function renderCurrentSlice() {
	if (!seed3d) return;

	const mode = document.getElementById("colorMode").value;
	const { slice, min, max, range } = computeSlice2D(currentZ);

	if (mode === "level") {
		const ls = document.getElementById("levelSlice");
		ls.min = min;
		ls.max = max;
		ls.value = level;
		document.getElementById("levelValue").textContent = level;
	}

	const canvas = document.getElementById("myCanvas");
	canvas.width  = sizexy * pixelSize;
	canvas.height = sizexy * pixelSize;
	const ctx = canvas.getContext("2d");

	// Render each pixel
	for (let x = 0; x < sizexy; x++) {
		for (let y = 0; y < sizexy; y++) {
			const val = slice[x][y];
			let color;

			switch (mode) {
				case "alleycat":   color = ["#000","#5ff","#f5f","#fff"][val % 4]; break;
				case "livingstone":color = ["#000","#5f5","#f55","#ff5"][val % 4]; break;
				case "level":      color = (val === level) ? "black" : "white"; break;
				case "binary":     color = (val % 2) ? "white" : "black"; break;
				case "ternary":    color = (val % 3) ? "white" : "black"; break;
				case "mod4":       color = (val % 4 < 2) ? "black" : "white"; break;
				case "rgb":        color = ["#f00","#0f0","#00f"][val % 3]; break;
				case "hsl":        color = `hsl(${(val-min)/range*360},100%,50%)`; break;
				default: {         // grayscale
					const g = ((val-min)/range*255)|0;
					color = `rgb(${g},${g},${g})`;
				}
			}

			ctx.fillStyle = color;
			ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
		}
	}

	document.getElementById("stats").textContent =
		`iter=${iterations} size=${sizexy} z=${currentZ}/${sizez-1} seed=${seed3d.length}³`;
}

// ============================================================================
// UI EVENT HANDLERS
// ============================================================================

function updateZSlice() {
	currentZ = parseInt(document.getElementById("zSlice").value, 10);
	document.getElementById("zSliceValue").textContent = currentZ;
	renderCurrentSlice();
}

function updateLevel() {
	level = parseInt(document.getElementById("levelSlice").value, 10);
	document.getElementById("levelValue").textContent = level;
	renderCurrentSlice();
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize or reinitialize app state
function init() {
	updateGlobalSettings();

	if (!seed3d) {
		seed3d = makeRandomSeed3D(seedSize);
	}

	renderSeedEditor();
	onModeChange();
	renderCurrentSlice();
}