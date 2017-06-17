"use strict";

window.$ = document.querySelector.bind(document);

Number.prototype.pad = function(digits, decimals) {
	var str = "" + (this | 0);
	while(str.length < digits)
		str = "0" + str;
	return str + (decimals ? (this%1).toFixed(decimals).substr(1) : "");
};
HTMLCanvasElement.prototype.getBlob = function(...args) {
	return new Promise(resolve => {
		this.toBlob(resolve, ...args);
	});
};
Blob.prototype.toArrayBuffer = function() {
	return new Promise((resolve, reject) => {
		var reader = new FileReader();
		reader.onload = () => resolve(reader.result);
		reader.onerror = () => reject(reader.error);
		reader.readAsArrayBuffer(this);
	});
};

let progress = $("progress");
let video = $("#video");
let start = $("#start");
let startFine = $("#startFine");
let end = $("#end");
let endFine = $("#endFine");
let worker = null;

let fps = 24;

video.onclick = event => {
	if(video.paused)
		video.play();
	else
		video.pause();
	event.preventDefault();
};

$("#fps").oninput = event => {
	start.value = (+start.value) + (startFine.value / fps);
	end.value = (+end.value) + (endFine.value / fps);
	startFine.value = 0;
	endFine.value = 0;
	
	fps = +event.target.value;
	startFine.min = -fps;
	startFine.max = fps;
	endFine.min = -fps;
	endFine.max = fps;
	updateTimes();
};

var framerates = $("#framerates");
framerates.onchange = event => {
	$("#fps").value = framerates.value;
	framerates.selectedIndex = -1;
};
framerates.selectedIndex = -1;

$("#open").onclick = () => {
	$("#file").click();
};
$("#file").onchange = event => {
	if(worker) return;
	
	openFile(event.target.files[0]);
}
document.body.ondragenter = event => {
	if(event.preventDefault)
		event.preventDefault();
	return false;
};
document.body.ondragover = event => {
	if(event.preventDefault)
		event.preventDefault();
	return false;
};
document.body.ondrop = event => {
	if(event.dataTransfer && event.dataTransfer.files)
		openFile(event.dataTransfer.files[0]);
	
	if(event.preventDefault)
		event.preventDefault();
	return false;
};
function openFile(file) {
	if(worker) return;
	
	video.src = URL.createObjectURL(file);
};

video.ondurationchange = () => {
	start.max = video.duration;
	end.max = video.duration;
	onStartChange();
	onEndChange();
}

start.oninput = event => {
	startFine.value = 0;
	onStartChange();
	if(!worker)
		video.currentTime = start.value;
};
startFine.oninput = event => {
	onStartChange();
	if(!worker)
		video.currentTime = (+start.value) + startFine.value/fps;
};
end.oninput = event => {
	endFine.value = 0;
	onEndChange();
	if(!worker)
		video.currentTime = end.value;
};
endFine.oninput = event => {
	onEndChange();
	if(!worker)
		video.currentTime = (+end.value) + endFine.value/fps;
};

$("#setStart").onclick = () => {
	start.value = video.currentTime;
	startFine.value = 0;
	onStartChange();
};
$("#setEnd").onclick = () => {
	end.value = video.currentTime;
	endFine.value = 0;
	onEndChange();
};

let goBtn = $("#go");
goBtn.onclick = () => {
	if(worker)
		stopExtraction();
	else
		startExtraction();
}

function startExtraction() {
	onStartChange();
	onEndChange();
	
	worker = new Worker("worker.js");
	worker.onmessage = ev => {
		stopExtraction();
		
		if(!ev.data.success) {
			console.error(ev.data.error);
			alert("An error occured!");
		} else {
			var blob = new Blob([ev.data.result], {
				type: "application/zip",
			});
			saveAs(blob, "frames.zip");
		}
	};
	goBtn.textContent = "Stop";
	
	let first = (+start.value) + startFine.value/fps;
	let time = first;
	let last = (+end.value) + endFine.value/fps;
	let increment = 1/fps;
	
	let ext, mime;
	if($("#jpg").checked)
		ext = ".jpg", mime = "image/jpeg";
	else
		ext = ".png", mime = "image/png";
	
	progress.value = 0;
	progress.max = last - first;
	
	let canvas = document.createElement("canvas");
	canvas.width = video.videoWidth;
	canvas.height = video.videoHeight;
	
	let promises = [];
	
	let ctx = canvas.getContext("2d");
	video.onseeked = () => {
		if(!worker) return;
		
		ctx.drawImage(video, 0, 0);
		
		let filename = Math.floor(time / 60).pad(2) + ":" + (time % 1).pad(2, 3) + ext;
		promises.push(canvas.getBlob(mime)
			.then(blob => blob.toArrayBuffer())
			.then(data => {
				if(!worker) throw "Operation canceled";
				
				worker.postMessage({
					data,
					filename,
				}, [data]);
			})
		);
		
		progress.value = time - first;
		
		time += increment;
		if(time > last) {
			Promise.all(promises)
			.then(() => worker.postMessage({finished: true}));
			return;
		}
		
		video.currentTime = time;
	};
	
	video.currentTime = time;
};

function stopExtraction() {
	worker.terminate();
	worker = null;
	goBtn.textContent = "Go!";
};

function onEndChange() {
	end.value = Math.min(Math.max(+end.value, 0), video.duration);
	while((+end.value) + endFine.value/fps > video.duration)
		endFine.value -= 1;
	while((+end.value) + endFine.value/fps < 0)
		endFine.value = (+endFine.value) + 1;
	
	if((+end.value) + endFine.value/fps < (+start.value) + startFine.value/fps) {
		start.value = end.value;
		startFine.value = endFine.value;
	}
	
	updateTimes();
}

function onStartChange() {
	start.value = Math.min(Math.max(+start.value, 0), video.duration);
	while((+start.value) + startFine.value/fps > video.duration)
		startFine.value -= 1;
	while((+start.value) + startFine.value/fps < 0)
		startFine.value = (+startFine.value) + 1;
	
	if((+start.value) + startFine.value/fps > (+end.value) + endFine.value/fps) {
		end.value = start.value;
		endFine.value = startFine.value;
	}
	
	updateTimes();
}

function updateTimes() {
	let time, seconds, minutes;
	
	time = (+start.value) + startFine.value/fps;
	seconds = time % 60;
	minutes = Math.floor(time/60);
	$("#startTime").textContent = minutes.pad(2) + ":" + seconds.pad(2, 3);
	$("#startSeconds").textContent = time.toFixed(3) + "s";
	
	time = (+end.value) + endFine.value/fps;
	seconds = time % 60;
	minutes = Math.floor(time/60);
	$("#endTime").textContent = minutes.pad(2) + ":" + seconds.pad(2, 3);
	$("#endSeconds").textContent = time.toFixed(3) + "s";
}

{
	let file = $("#file").files[0];
	if(file)
		openFile(file);
}

