#!/bin/bash

# Finding Classification Storage Test Runner
# 
# This script runs all tests related to finding classification storage
# to identify why findings are sometimes stored without their classifications.
#
# Usage: ./run_classification_tests.sh
# 
# @author LX-Annotate Development Team

echo "🧪 Running Finding Classification Storage Tests"
echo "=============================================="

# Change to frontend directory
if [ ! -d "frontend" ]; then
    echo "❌ Error: frontend directory not found!"
    echo "   Please run this script from the lx-annotate root directory"
    exit 1
fi

cd frontend

echo ""
echo "📋 Test Overview:"
echo "- Store-level tests: Validate Pinia store classification handling"
echo "- Component tests: Test AddableFindingsDetail workflow"
echo "- Integration tests: Validate data structure integrity"
echo ""

# Function to run test and capture results
run_test() {
    local test_file=$1
    local test_name=$2
    
    echo "🔍 Running: $test_name"
    echo "   File: $test_file"
    
    if npm run test:unit -- "$test_file" --reporter=verbose; then
        echo "✅ PASSED: $test_name"
    else
        echo "❌ FAILED: $test_name"
        echo "   Check output above for issues detected"
    fi
    echo ""
}

# Run the tests
echo "Starting test execution..."
echo ""

# 1. Store-level tests
if [ -f "tests/stores/patientFindingStore.classificationStorage.test.ts" ]; then
    run_test "tests/stores/patientFindingStore.classificationStorage.test.ts" "Store Classification Tests"
else
    echo "⚠️  Store test file not found"
fi

# 2. Component integration tests  
if [ -f "tests/components/RequirementReport/AddableFindingsDetail.classificationWorkflow.test.ts" ]; then
    run_test "tests/components/RequirementReport/AddableFindingsDetail.classificationWorkflow.test.ts" "Component Workflow Tests"
else
    echo "⚠️  Component test file not found"
fi

# 3. Data validation tests
if [ -f "tests/integration/findingClassificationStorage.validation.test.ts" ]; then
    run_test "tests/integration/findingClassificationStorage.validation.test.ts" "Data Validation Tests"
else
    echo "⚠️  Integration test file not found"
fi

echo "=============================================="
echo "🏁 Test Execution Complete"
echo ""
echo "📊 Results Summary:"
echo "- Green tests (✅): Proper data handling validated"
echo "- Red tests (❌): Issues detected that need fixing"
echo "- Warning messages (🐛): Potential problems identified"
echo ""
echo "📋 Next Steps:"
echo "1. Review any failed tests to understand root causes"
echo "2. Check console warnings for data integrity issues"
echo "3. Implement fixes based on test guidance"
echo "4. Re-run tests to validate fixes"
echo ""
echo "📚 For detailed analysis, see: FINDING_CLASSIFICATION_STORAGE_TESTS.md"
