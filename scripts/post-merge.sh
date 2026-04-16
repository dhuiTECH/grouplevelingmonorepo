#!/bin/bash
set -e

cd apps/web && npm install --legacy-peer-deps 2>/dev/null || true
