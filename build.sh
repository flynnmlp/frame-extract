#!/bin/bash

set -e 

cd "$(dirname "$0")"

mkdir -p dist

cat worker.js node_modules/jszip/dist/jszip.min.js > dist/worker.js

cp node_modules/file-saver/FileSaver.min.js index.htm style.css script.js dist/

