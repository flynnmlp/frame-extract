#!/bin/bash

set -e 

cd "$(dirname "$0")"

mkdir -p dist

cp node_modules/file-saver/FileSaver.min.js index.html style.css script.js dist/

cat worker.js node_modules/jszip/dist/jszip.min.js > dist/worker.js

