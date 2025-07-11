const iterations=10;
const sizexy=2**iterations;
const size=1;
let array;

let seed = [
	[1, 1, 1, 1],
	[1, 0, 0, 1],
	[1, 0, 0, 1],
	[1, 1, 1, 1]
];

let mode;

let range, min, max;

function init() {
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
	canvas.width = sizexy * size;
	canvas.height = sizexy * size;
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
			ctx.fillRect(x * size, y * size, size, size);
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

function generateCheckboxGrid() {
	const grid = document.getElementById("checkboxGrid");
	const wipeButton = document.getElementById("wipeButton");
	const size = parseInt(document.getElementById("seedSize").value);

	if (gridVisible && size !== currentGridSize) {
		currentGridSize = size;
	} else if (gridVisible) {
		// Just hide everything
		grid.innerHTML = "";
		gridVisible = false;
		wipeButton.style.display = "none";
		document.getElementById("colorMode").disabled = false;
		document.getElementById("generateButton").disabled = true;
		return;
	}

	// Build grid
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

			if (seed?.[i]?.[j]) cbInput.checked = true;

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
	wipeButton.style.display = "inline-block"; // 👈 show the button
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