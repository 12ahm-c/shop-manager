#!/bin/bash

# Define backend URL
BASE_URL="http://localhost:3001/v1"
TOKEN="YOUR_AUTH_TOKEN_HERE"

# Ensure jq is installed or just output raw
echo "Testing Phase 6 & 7 Endpoints"
echo "============================="

# Function to execute curl and print response
test_endpoint() {
  local method=$1
  local endpoint=$2
  local data=$3

  echo "------------------------------------------------"
  echo "-> $method $BASE_URL$endpoint"
  
  if [ -n "$data" ]; then
    curl -s -X "$method" "$BASE_URL$endpoint" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data" | head -c 1000
  else
    curl -s -X "$method" "$BASE_URL$endpoint" \
      -H "Authorization: Bearer $TOKEN" | head -c 1000
  fi
  echo ""
  echo "------------------------------------------------"
  echo ""
}

# --- Phase 6: Invoices & Reports ---

echo "=== INVOICES ==="
test_endpoint "GET" "/invoices/123"
test_endpoint "GET" "/invoices/sale/sale-456"
test_endpoint "POST" "/invoices/123/resend"

echo "=== REPORTS ==="
test_endpoint "GET" "/reports/daily-cash?date=2025-01-01"
test_endpoint "GET" "/reports/profitability?period=month"
test_endpoint "GET" "/reports/top-products"
test_endpoint "GET" "/reports/aging"

# --- Phase 7: Dashboard, Alerts, AI ---

echo "=== DASHBOARDS ==="
test_endpoint "GET" "/dashboard/employee"
test_endpoint "GET" "/dashboard/admin?period=today"
test_endpoint "GET" "/dashboard/financial"

echo "=== AI CHAT ==="
test_endpoint "POST" "/ai/chat" '{"message":"What are my top selling products?"}'
test_endpoint "GET" "/ai/suggestions"
test_endpoint "GET" "/ai/health"

echo "=== NOTIFICATIONS ==="
test_endpoint "GET" "/notifications/me"
test_endpoint "PATCH" "/notifications/123/read"
test_endpoint "PATCH" "/notifications/read-all"
test_endpoint "GET" "/admin/alerts"

echo "Testing completed."
