#!/bin/bash

set -e 

cd "$(dirname "$0")"

mkdir -p dist

cat worker.js node_modules/jszip/dist/jszip.min.js > dist/worker.js

(
	echo -n "URL.createObjectURL(new Blob([atob(\""
	base64 -w 0 dist/worker.js
	echo -n "\")], {type: 'text/javascript'}))"
)>dist/worker.base64

cp node_modules/file-saver/FileSaver.min.js index.htm style.css script.js dist/


awk 'BEGIN{getline l < "dist/worker.base64"}/Worker/{gsub("\"worker.js\"",l)}1' script.js >dist/script.js

