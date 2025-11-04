#!/bin/bash

# API Endpoint Testing Script for VideoExaminationAnnotation Component
# Run this script to test the API endpoints expected by the frontend

echo "=== Testing VideoExaminationAnnotation API Endpoints ==="
echo "Date: $(date)"
echo "Testing against: http://localhost:8000"
echo ""

# Function to test an endpoint
test_endpoint() {
    local method=$1
    local url=$2
    local data=$3
    local description=$4
    
    echo "Testing: $description"
    echo "Method: $method"
    echo "URL: $url"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null)
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" "$url" 2>/dev/null)
    fi
    
    if [ $? -eq 0 ]; then
        http_code=$(echo "$response" | tail -n1)
        body=$(echo "$response" | sed '$d')
        
        echo "HTTP Status: $http_code"
        if [ ${#body} -gt 200 ]; then
            echo "Response: ${body:0:200}..."
        else
            echo "Response: $body"
        fi
    else
        echo "ERROR: Failed to connect to server"
    fi
    
    echo "---"
    echo ""
}

# Check if Django is running
echo "Checking if Django development server is running..."
if ! curl -s -o /dev/null -w "%{http_code}" "http://localhost:8000/" >/dev/null 2>&1; then
    echo "❌ Django server not running on localhost:8000"
    echo "Please start Django with: python manage.py runserver"
    echo ""
else
    echo "✅ Django server is accessible"
    echo ""
fi

# Test 1: Video Detail Endpoint
test_endpoint "GET" \
    "http://localhost:8000/api/media/videos/1/" \
    "" \
    "Video Detail Endpoint"

# Test 2: Video Streaming with type=processed
test_endpoint "GET" \
    "http://localhost:8000/api/media/videos/1/?type=processed" \
    "" \
    "Video Streaming (Processed/Anonymized)"

# Test 3: Video Examinations
test_endpoint "GET" \
    "http://localhost:8000/api/video/1/examinations/" \
    "" \
    "Video Examinations List"

# Test 4: Video Segments Validation (needs CSRF token)
echo "Testing: Video Segments Validation Endpoint"
echo "Method: POST"
echo "URL: http://localhost:8000/api/media/videos/1/segments/validation-status/"

# Try to get CSRF token first
csrf_token=$(curl -s "http://localhost:8000/" | grep -o 'csrfmiddlewaretoken[^>]*value="[^"]*"' | sed 's/.*value="\([^"]*\)".*/\1/' 2>/dev/null)

if [ -n "$csrf_token" ]; then
    echo "CSRF Token: ${csrf_token:0:20}..."
    response=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -H "X-CSRFToken: $csrf_token" \
        -H "Referer: http://localhost:8000/" \
        -d '{"notes": "Test validation from script"}' \
        "http://localhost:8000/api/media/videos/1/segments/validation-status/" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        http_code=$(echo "$response" | tail -n1)
        body=$(echo "$response" | sed '$d')
        echo "HTTP Status: $http_code"
        echo "Response: $body"
    else
        echo "ERROR: Failed to connect to server"
    fi
else
    echo "Could not obtain CSRF token - testing without authentication"
    response=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d '{"notes": "Test validation from script"}' \
        "http://localhost:8000/api/media/videos/1/segments/validation-status/" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        http_code=$(echo "$response" | tail -n1)
        body=$(echo "$response" | sed '$d')
        echo "HTTP Status: $http_code"
        echo "Response: $body"
    else
        echo "ERROR: Failed to connect to server"
    fi
fi

echo "---"
echo ""

# Test additional endpoints that might exist
echo "=== Testing Additional Endpoints ==="

test_endpoint "GET" \
    "http://localhost:8000/api/media/videos/" \
    "" \
    "Video List Endpoint"

test_endpoint "GET" \
    "http://localhost:8000/api/videos/" \
    "" \
    "Alternative Video List Endpoint"

test_endpoint "GET" \
    "http://localhost:8000/api/anonymization/overview/" \
    "" \
    "Anonymization Overview Endpoint"

echo "=== Testing Complete ==="
echo ""
echo "Expected HTTP Status Codes:"
echo "  200 - Success"
echo "  404 - Endpoint not found (needs implementation)"
echo "  403 - CSRF/Permission issue"
echo "  500 - Server error"
echo ""
echo "If you see 404 errors, the endpoints need to be implemented in the backend."
echo "See api_test_and_fix_prompt.md for detailed implementation instructions."
