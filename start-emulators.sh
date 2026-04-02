#!/bin/bash

echo "Starting Firebase Emulators..."
echo "Auth: http://localhost:9099"
echo "Firestore: http://localhost:8080"
echo "UI: http://localhost:4000"
echo ""

npx firebase emulators:start --only auth,firestore
