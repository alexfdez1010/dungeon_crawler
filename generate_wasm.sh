#!/bin/bash

cargo build --target wasm32-unknown-unknown --release
wasm-bindgen target/wasm32-unknown-unknown/release/dungeon_crawler.wasm --out-dir ./wasm_help --no-modules --no-typescript