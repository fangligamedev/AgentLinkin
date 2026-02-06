#!/bin/bash
export PORT=${PORT:-3001}
export JWT_SECRET="dev-secret-key-change-in-production"
echo "Starting server on port $PORT..."
npx tsx src/server-v2.ts
