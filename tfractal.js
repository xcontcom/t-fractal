let iterations=8;
let sizexy=2**iterations;
let pixelSize=2;
let array;

let seed = [
	[1, 1, 1, 1],
	[1, 0, 0, 1],
	[1, 0, 0, 1],
	[1, 1, 1, 1]
];

let mode;

let range, min, max;


function updateGlobalSettings() {
	iterations = parseInt(document.getElementById("iterations").value);
	pixelSize = parseInt(document.getElementById("pixelSize").value);
	sizexy = 2 ** iterations;
}

function init() {
	updateGlobalSettings();
	array=[];
	for (let x = 0; x < sizexy; x++) {
		array[x]=[];
		for (let y = 0; y < sizexy; y++) {
			array[x][y]=0;
		}
	}

	let pattern = seed;
	
	for(let i=0;i<iterations-1;i++){
		const patternLength = pattern.length;
		const step=2**i;
		const newSizexy=Math.floor(sizexy/(step));
		for (let x = 0; x < sizexy; x++) {
			for (let y = 0; y < sizexy; y++) {
				const px = Math.floor(x / step) % patternLength;
				const py = Math.floor(y / step) % patternLength;
				array[x][y] += pattern[px][py];
			}
		}
	}

	min = Infinity, max = -Infinity;
	for (let x = 0; x < sizexy; x++) {
		for (let y = 0; y < sizexy; y++) {
			const v = array[x][y];
			if (v < min) min = v;
			if (v > max) max = v;
		}
	}
	range = (max - min) || 1;
	
	renderColorModeOnly();
	
}

function renderColorModeOnly() {
	mode = document.getElementById("colorMode").value;
	const canvas = document.getElementById('myCanvas');
	canvas.width = sizexy*pixelSize;
	canvas.height = sizexy*pixelSize;
	const ctx = canvas.getContext('2d');

	ctx.fillStyle = 'rgb(0,0,0)';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = 'rgb(255,255,255)';

	for (let x = 0; x < sizexy; x++) {
		for (let y = 0; y < sizexy; y++) {
			const val = array[x][y];
			let color;

			switch (mode) {
				case "grayscale":
					const gray = Math.floor(((val - min) / range) * 255);
					color = `rgb(${gray},${gray},${gray})`;
					break;

				case "hsl":
					const hue = ((val - min) / range) * 360;
					color = `hsl(${hue}, 100%, 50%)`;
					break;

				case "binary":
					color = (val % 2 === 0) ? "black" : "white";
					break;
					
				case "ternary":
					color = (val % 3 === 0) ? "black" : "white";
					break;
					
				case "rgb":
					const palette = ["#f00", "#0f0", "#00f"];
					color = palette[val % palette.length];
					break;
					
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
			}

			ctx.fillStyle = color;
			ctx.fillRect(x*pixelSize, y*pixelSize, 1*pixelSize, 1*pixelSize);
		}
	}
}

// Interface:
let gridVisible = false;
let currentGridSize = 0;

function enableGenerateButton() {
	document.getElementById("generateButton").disabled = false;
	document.getElementById("colorMode").disabled = true;
}

function renderCheckboxGridFromSeed(inputSeed) {
	const size = inputSeed.length;
	const grid = document.getElementById("checkboxGrid");
	const wipeButton = document.getElementById("wipeButton");

	grid.innerHTML = "";

	const table = document.createElement("table");
	table.style.borderCollapse = "collapse";

	for (let i = 0; i < size; i++) {
		const row = document.createElement("tr");
		for (let j = 0; j < size; j++) {
			const cell = document.createElement("td");
			cell.style.padding = "2px";

			const cbInput = document.createElement("input");
			cbInput.type = "checkbox";
			cbInput.id = `cb_${i}_${j}`;
			cbInput.onchange = enableGenerateButton;

			if (inputSeed[i][j]) cbInput.checked = true;

			cell.appendChild(cbInput);
			row.appendChild(cell);
		}
		table.appendChild(row);
	}
	grid.appendChild(table);

	gridVisible = true;
	currentGridSize = size;
	document.getElementById("colorMode").disabled = true;
	document.getElementById("generateButton").disabled = false;
	wipeButton.style.display = "inline-block";
}

function generateCheckboxGrid() {
	const size = parseInt(document.getElementById("seedSize").value);
	const grid = document.getElementById("checkboxGrid");

	if (gridVisible && size !== currentGridSize) {
		currentGridSize = size;
	} else if (gridVisible) {
		grid.innerHTML = "";
		gridVisible = false;
		document.getElementById("colorMode").disabled = false;
		document.getElementById("generateButton").disabled = true;
		document.getElementById("wipeButton").style.display = "none";
		return;
	}

	// Resize seed if needed
	const resizedSeed = [];
	for (let i = 0; i < size; i++) {
		resizedSeed[i] = [];
		for (let j = 0; j < size; j++) {
			resizedSeed[i][j] = seed?.[i]?.[j] ? 1 : 0;
		}
	}

	renderCheckboxGridFromSeed(resizedSeed);
}

function generateRandomSeed() {
	const size = parseInt(document.getElementById("seedSize").value);
	// Initialize the 2D array first
	let newSeed=[];
	for (let i = 0; i < size; i++) {
		newSeed[i] = [];
		for (let j = 0; j < size; j++) {
			newSeed[i][j] = 0; // prefill with zeroes or placeholders
		}
	}

	for (let i = 0; i < size; i++) {
		for (let j = 0; j < size; j++) {
			if (i <= j && i + j <= size - 1) {
				const value = Math.random() < 0.5 ? 1 : 0;

				// Set all 4 symmetric positions
				newSeed[i][j] = value;
				newSeed[j][i] = value;
				newSeed[size - i - 1][size - j - 1] = value;
				newSeed[size - j - 1][size - i - 1] = value;
			}
		}
	}

	seed = newSeed;
	renderCheckboxGridFromSeed(seed);
	applySeed();
}

function wipeCheckboxGrid() {
	const size = parseInt(document.getElementById("seedSize").value);
	for (let i = 0; i < size; i++) {
		for (let j = 0; j < size; j++) {
			const cb = document.getElementById(`cb_${i}_${j}`);
			if (cb) cb.checked = false;
		}
	}
	enableGenerateButton(); // allow fractal generation from clean seed
}

function applySeed() {
	document.getElementById("colorMode").disabled = false;
	const size = parseInt(document.getElementById("seedSize").value);
	const newSeed = [];

	for (let i = 0; i < size; i++) {
		newSeed[i] = [];
		for (let j = 0; j < size; j++) {
			const cellBox = document.getElementById(`cb_${i}_${j}`);
			newSeed[i][j] = cellBox.checked ? 1 : 0;
		}
	}

	seed = newSeed;
	init();
}