#!/bin/bash

# Smoke-Check Script for Vidya Vaani - CI Gate
# Assumes MOCK_LLM=true, MOCK_WHISPER=true, MOCK_AUTH=true, and all services are running (e.g., via docker-compose.dev.yml)
# Requires 'curl' and 'jq'

set -e

APP_URL=${APP_URL:-http://localhost:3000}
ADMIN_TOKEN=${ADMIN_TOKEN:-demo-admin-token-12345}
TEST_FILE_PATH="docs/sample.txt" # Assume a small mock file exists

echo "--- Vidya Vaani Smoke Check Started ---"

# --- 1. Health Check ---
echo "1. Performing API Health Check..."
HEALTH_STATUS=$(curl -s $APP_URL/api/health | jq -r '.status')
if [ "$HEALTH_STATUS" != "healthy" ]; then
    echo "❌ Health check failed. Status: $HEALTH_STATUS"
    exit 1
fi
echo "✅ Health Check Passed."

# --- 2. Admin Auth Check (Mock Auth) ---
echo "2. Testing Admin Authentication..."
AUTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $ADMIN_TOKEN" $APP_URL/api/admin/stats)
if [ "$AUTH_RESPONSE" != "200" ]; then
    echo "❌ Mock Auth failed. Response code: $AUTH_RESPONSE"
    exit 1
fi
echo "✅ Admin Auth Passed."

# --- 3. Mock RAG Query (Deterministic LLM Response) ---
echo "3. Testing Mock RAG and LLM Adapter (English)..."
RAG_QUERY='{"user_id":"test-user","text":"What are the fees for my program?"}'
RAG_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d "$RAG_QUERY" $APP_URL/api/ask)
EXPECTED_PHRASE="75,000"

if echo "$RAG_RESPONSE" | grep -q "$EXPECTED_PHRASE"; then
    echo "✅ Mock RAG Query Passed. Response is deterministic."
else
    echo "❌ Mock RAG Query Failed. Expected '$EXPECTED_PHRASE' but got: $RAG_RESPONSE"
    exit 1
fi

# --- 4. Mock Multilingual Query (Hindi) ---
echo "4. Testing Mock Multilingual Flow (Hindi)..."
HI_QUERY='{"user_id":"test-user","text":"फीस कितनी है?","lang":"hi"}'
HI_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d "$HI_QUERY" $APP_URL/api/ask)
EXPECTED_ACTION="answer:fees"

if echo "$HI_RESPONSE" | grep -q "$EXPECTED_ACTION"; then
    echo "✅ Multilingual Query Passed. Intent detected and translated."
else
    echo "❌ Multilingual Query Failed. Expected action '$EXPECTED_ACTION' but got: $HI_RESPONSE"
    exit 1
fi

# --- 5. Fallback/Handoff Check ---
echo "5. Testing Fallback/Handoff Flow..."
FALLBACK_QUERY='{"user_id":"test-user","text":"I need to speak to a human"}'
FALLBACK_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d "$FALLBACK_QUERY" $APP_URL/api/ask)
EXPECTED_HANDOFF="escalated"

if echo "$FALLBACK_RESPONSE" | grep -q "REQ-1234"; then
    echo "✅ Fallback/Handoff Passed. Request ID received."
else
    echo "❌ Fallback/Handoff Failed. Could not find request ID."
    exit 1
fi

echo "--- Vidya Vaani Smoke Check Completed Successfully (PASSED) ---"
exit 0