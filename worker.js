"use strict";

let zip = null;

onmessage = event => {
	if(!zip)
		zip = new JSZip();
	
	
	if(event.data.finished) {
		zip.generateAsync({
			type: "arraybuffer",
		})
		.then(data => {
			postMessage({
				success: true,
				result: data,
			}, [data]);
		})
		.catch(error => postMessage({
			success: false,
			error,
		}));
	} else {
		zip.file(event.data.filename, event.data.data);
	}
};

