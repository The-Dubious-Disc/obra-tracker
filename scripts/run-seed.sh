#!/bin/bash
cd "$(dirname "$0")/.."
node -r esbuild-register scripts/seed-punta-colorada.ts
