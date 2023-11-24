#!/bin/bash

# Install wasm support and the wasm-bindgen tool
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli

# Build the wasm file and generate the JS bindings
cargo build --target wasm32-unknown-unknown --release
wasm-bindgen target/wasm32-unknown-unknown/release/dungeon_crawler.wasm --out-dir . --no-modules --no-typescript