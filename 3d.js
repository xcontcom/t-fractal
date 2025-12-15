let iterations = 8;
let sizexy = 2 ** iterations;
let sizez	= 2 ** iterations;
let pixelSize = 2;

let seed3d = null;			// seed3d[x][y][z] in {0,1}
let seedSize = 4;

let currentZ = 0;			 // 0..sizez-1 (big Z slicer)
let level = 0;					// used in "level" mode (value slicer)

let seedEditorVisible = true;

// ---------- Settings ----------
function updateGlobalSettings() {
	iterations = parseInt(document.getElementById("iterations").value, 10);
	pixelSize	= parseInt(document.getElementById("pixelSize").value, 10);

	sizexy = 2 ** iterations;
	sizez	= 2 ** iterations;

	const zSlider = document.getElementById("zSlice");
	zSlider.min = 0;
	zSlider.max = Math.max(0, sizez - 1);

	currentZ = Math.min(currentZ, sizez - 1);
	zSlider.value = currentZ;

	document.getElementById("zSliceValue").textContent = String(currentZ);
	document.getElementById("zMaxValue").textContent = String(sizez - 1);
}

// ---------- Seed helpers ----------
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

function makeRingSeed3D(n) {
	// Ring in XY, extruded through Z
	const s = allocSeed3D(n, 0);
	for (let x = 0; x < n; x++) {
		for (let y = 0; y < n; y++) {
			const border = (x === 0 || y === 0 || x === n - 1 || y === n - 1) ? 1 : 0;
			for (let z = 0; z < n; z++) s[x][y][z] = border;
		}
	}
	return s;
}

function makeRandomSeed3D(n) {
	const s = allocSeed3D(n, 0);

	function genLayerDiagonalSymmetry(z) {
		for (let i = 0; i < n; i++) {
			for (let j = 0; j < n; j++) {
				if (i <= j && i + j <= n - 1) {
					const v = Math.random() < 0.5 ? 1 : 0;

					// 2D diagonal + central symmetry inside XY plane, fixed z
					s[i][j][z] = v;
					s[j][i][z] = v;
					s[n - 1 - i][n - 1 - j][z] = v;
					s[n - 1 - j][n - 1 - i][z] = v;
				}
			}
		}
	}

	// Generate count:
	// even n: generate z=0..(n/2-1)	(e.g. n=10 -> z=0..4)
	// odd	n: generate z=0..(floor(n/2)) (includes true middle)
	const half = Math.floor(n / 2);
	const genCount = (n % 2 === 0) ? half : (half + 1);

	for (let z = 0; z < genCount; z++) {
		genLayerDiagonalSymmetry(z);
	}

	// Choose ONE mirroring method for the whole seed
	const useRot180 = 1;//Math.random() < 0.5;

	// Mirror z -> (n-1-z)
	// For even n, the "center pair" is (half-1) <-> half (e.g. 4<->5 for n=10)
	for (let z = 0; z < half; z++) {
		const z2 = n - 1 - z;

		if (!useRot180) {
			// plain copy
			for (let x = 0; x < n; x++) {
				for (let y = 0; y < n; y++) {
					s[x][y][z2] = s[x][y][z];
				}
			}
		} else {
			// copy with 180° rotation in XY
			for (let x = 0; x < n; x++) {
				for (let y = 0; y < n; y++) {
					s[x][y][z2] = s[y][n - 1 - x][z];
				}
			}
		}
	}

	return s;
}

// ---------- Seed editor UI ----------
function toggleSeedEditor() {
	seedEditorVisible = !seedEditorVisible;
	document.getElementById("seedEditor").style.display = seedEditorVisible ? "block" : "none";
	document.getElementById("toggleSeedBtn").textContent = seedEditorVisible ? "Hide seed" : "Show seed";
}

function renderSeedEditor() {
	const container = document.getElementById("seedLayers");
	container.innerHTML = "";

	const n = seed3d.length;

	for (let z = 0; z < n; z++) {
		const layerDiv = document.createElement("div");
		layerDiv.className = "seedLayer";

		const title = document.createElement("div");
		title.className = "seedLayerTitle";
		title.innerHTML = `<b>Z = ${z}</b><span class="mono">${n}×${n}</span>`;
		layerDiv.appendChild(title);

		const table = document.createElement("table");

		for (let y = 0; y < n; y++) {
			const tr = document.createElement("tr");
			for (let x = 0; x < n; x++) {
				const td = document.createElement("td");
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

function wipeSeed() {
	const n = seed3d.length;
	for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) for (let z = 0; z < n; z++) seed3d[x][y][z] = 0;
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

function resizeSeedFromUI() {
	const n = parseInt(document.getElementById("seedSize").value, 10);
	seedSize = n;

	// Keep old content where possible
	const old = seed3d;
	seed3d = allocSeed3D(n, 0);

	if (old) {
		const m = Math.min(old.length, n);
		for (let x = 0; x < m; x++) for (let y = 0; y < m; y++) for (let z = 0; z < m; z++) {
			seed3d[x][y][z] = old[x][y][z] ? 1 : 0;
		}
	}

	renderSeedEditor();
	renderCurrentSlice();
}

// ---------- 3D fractal slice computation (on-demand) ----------
function computeSlice2D(zSlice) {
	const n = seed3d.length;
	const slice = new Array(sizexy);
	for (let x = 0; x < sizexy; x++) slice[x] = new Array(sizexy).fill(0);

	for (let i = 0; i < iterations - 1; i++) {
		const step = 2 ** i;
		const pz = (Math.floor(zSlice / step) % n + n) % n;

		for (let x = 0; x < sizexy; x++) {
			const px = (Math.floor(x / step) % n + n) % n;
			for (let y = 0; y < sizexy; y++) {
				const py = (Math.floor(y / step) % n + n) % n;
				slice[x][y] += seed3d[px][py][pz];
			}
		}
	}

	let min = Infinity, max = -Infinity;
	for (let x = 0; x < sizexy; x++) for (let y = 0; y < sizexy; y++) {
		const v = slice[x][y];
		if (v < min) min = v;
		if (v > max) max = v;
	}
	const range = (max - min) || 1;

	return { slice, min, max, range };
}

// ---------- Rendering (modes back) ----------
function renderCurrentSlice() {
	if (!seed3d) return;

	const mode = document.getElementById("colorMode").value;
	const { slice, min, max, range } = computeSlice2D(currentZ);

	// update "level" slider range based on actual min/max
	const levelSlider = document.getElementById("levelSlice");
	levelSlider.min = min;
	levelSlider.max = max;
	if (level < min) level = min;
	if (level > max) level = max;
	levelSlider.value = level;
	document.getElementById("levelValue").textContent = String(level);

	// canvas
	const canvas = document.getElementById("myCanvas");
	canvas.width	= sizexy * pixelSize;
	canvas.height = sizexy * pixelSize;
	const ctx = canvas.getContext("2d");

	for (let x = 0; x < sizexy; x++) {
		for (let y = 0; y < sizexy; y++) {
			const val = slice[x][y];
			let color;

			switch (mode) {
				case "grayscale": {
					const g = Math.floor(((val - min) / range) * 255);
					color = `rgb(${g},${g},${g})`;
					break;
				}
				case "hsl": {
					const hue = ((val - min) / range) * 360;
					color = `hsl(${hue}, 100%, 50%)`;
					break;
				}
				case "binary":
					color = (val % 2 === 0) ? "black" : "white";
					break;

				case "ternary":
					color = (val % 3 === 0) ? "black" : "white";
					break;

				case "mod4":
					color = (val % 4 === 0 || val % 4 === 1) ? "black" : "white";
					break;

				case "level":
					color = (val === level) ? "black" : "white";
					break;

				case "rgb": {
					const palette = ["#f00", "#0f0", "#00f"];
					color = palette[val % palette.length];
					break;
				}

				case "livingstone": {
					const palette = ["#000", "#5f5", "#f55", "#ff5"];
					color = palette[val % palette.length];
					break;
				}

				case "alleycat": {
					const palette = ["#000", "#5ff", "#f5f", "#fff"];
					color = palette[val % palette.length];
					break;
				}

				default:
					color = "black";
			}

			ctx.fillStyle = color;
			ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
		}
	}

	document.getElementById("stats").textContent =
		`iter=${iterations}	size=${sizexy}×${sizexy}	z=${currentZ}/${sizez - 1}	seed=${seed3d.length}³	min=${min}	max=${max}`;
}

// ---------- UI hooks ----------
function updateZSlice() {
	currentZ = parseInt(document.getElementById("zSlice").value, 10);
	document.getElementById("zSliceValue").textContent = String(currentZ);
	renderCurrentSlice();
}

function updateLevel() {
	level = parseInt(document.getElementById("levelSlice").value, 10);
	document.getElementById("levelValue").textContent = String(level);
	renderCurrentSlice();
}

// ---------- Main ----------
function init() {
	updateGlobalSettings();

	seedSize = parseInt(document.getElementById("seedSize").value, 10);

	if (!seed3d || seed3d.length !== seedSize) {
		seed3d = makeRingSeed3D(seedSize);
	}

	renderSeedEditor();
	renderCurrentSlice();
}
