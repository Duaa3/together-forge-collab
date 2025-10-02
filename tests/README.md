# Testing Documentation

Welcome to the HR Recruitment System Testing Documentation. This directory contains all testing infrastructure, test cases, results, and validation documentation.

---

## 📁 Directory Structure

```
/tests/
├── README.md                           # This file - testing documentation index
├── validation-criteria.md              # Project validation criteria checklist
├── /test-cases/
│   ├── extraction-test-cases.json     # CV extraction test case definitions
│   └── cv-format-checklist.md         # CV format diversity checklist
├── /test-results/
│   ├── extraction-accuracy-template.md        # Template for extraction tests
│   ├── scoring-validation-template.md         # Template for scoring tests
│   └── batch-processing-stability-template.md # Template for batch processing
└── /cv-samples/
    ├── /valid/            # Valid CVs with known expected data
    ├── /edge-cases/       # Unusual formats, missing data
    └── /invalid/          # Malformed or corrupted files
```

---

## 🎯 Testing Objectives

### 1. **CV Data Extraction Accuracy**
- **Target:** ≥95% accuracy across all fields
- **Fields Tested:** Name, Email, Phone, Skills, Links
- **Coverage:** 50+ diverse CV formats

### 2. **Candidate Scoring Algorithm Validation**
- **Target:** 100% accuracy in score calculation
- **Decision Logic:** Accept/Reject based on threshold (≥60)
- **Components:** Mandatory skills, Nice-to-have skills, Experience

### 3. **Batch Processing Stability**
- **Target:** Process 50+ CVs without crashes
- **Metrics:** Success rate, error handling, resource usage
- **Functions Tested:** parse-cv, analyze-candidate-advanced, candidate-scoring-engine

---

## 🚀 Quick Start Guide

### Running Extraction Tests

1. **Prepare Test Cases**
   - Add test CVs to `/tests/cv-samples/`
   - Update `extraction-test-cases.json` with expected data

2. **Execute Tests**
   - Navigate to Testing Dashboard: `/testing`
   - Upload test CVs
   - Click "Run Extraction Tests"

3. **Review Results**
   - View accuracy metrics in real-time
   - Export results using template: `extraction-accuracy-template.md`

### Running Scoring Validation

1. **Define Test Scenarios**
   - Create job requirements
   - Define candidate profiles (all skills met, missing skills, borderline)

2. **Execute Tests**
   - Use Testing Dashboard
   - Run scoring validation suite

3. **Analyze Results**
   - Check decision accuracy (Accept/Reject)
   - Verify score calculation formula
   - Export results using template: `scoring-validation-template.md`

### Running Batch Processing Tests

1. **Prepare Batch**
   - Create job with 50+ candidate CVs
   - Ensure diverse CV formats

2. **Execute Batch Processing**
   - Trigger batch-process-candidates function
   - Monitor edge function logs
   - Track database insertions

3. **Validate Stability**
   - Check success rate
   - Verify no memory leaks
   - Ensure error handling works
   - Export results using template: `batch-processing-stability-template.md`

---

## 📊 Test Coverage Requirements

### CV Format Diversity (50+ CVs)
- ✅ **PDF** (native text): 20 CVs
- ✅ **PDF** (scanned): 10 CVs
- ✅ **DOCX**: 7 CVs
- ✅ **DOC**: 3 CVs
- ✅ **TXT**: 5 CVs
- ✅ **Multiple layouts**: Single, two-column, creative
- ✅ **International formats**: Various phone/name formats
- ✅ **Skill densities**: 5-30+ skills per CV

### Test Scenarios
- ✅ Complete contact information
- ✅ Missing email/phone/links
- ✅ International phone formats
- ✅ Non-English names
- ✅ High skill density (25+ skills)
- ✅ Low skill density (0-5 skills)
- ✅ Corrupted/malformed files
- ✅ Edge cases (unusual formats)

---

## 📝 How to Document Test Results

### For Extraction Tests
1. Copy `test-results/extraction-accuracy-template.md`
2. Rename with date: `extraction-accuracy-YYYY-MM-DD.md`
3. Fill in all sections:
   - Test summary
   - Field-by-field results
   - Test cases detail table
   - Issues found
   - Recommendations
4. Store in `test-results/` directory

### For Scoring Validation
1. Copy `test-results/scoring-validation-template.md`
2. Rename with date: `scoring-validation-YYYY-MM-DD.md`
3. Document all test scenarios
4. Include decision accuracy matrix
5. Validate formula implementation
6. Store in `test-results/` directory

### For Batch Processing
1. Copy `test-results/batch-processing-stability-template.md`
2. Rename with date: `batch-processing-stability-YYYY-MM-DD.md`
3. Document all test runs
4. Track edge function performance
5. Monitor resource usage
6. Store in `test-results/` directory

---

## 🔍 Adding New Test Cases

### Extraction Test Cases

Edit `test-cases/extraction-test-cases.json`:

```json
{
  "id": "TC###",
  "filename": "descriptive_name.pdf",
  "expectedData": {
    "name": "Expected Name",
    "email": "expected@email.com",
    "phone": "+1234567890",
    "skills": ["Skill1", "Skill2"]
  },
  "category": "standard | edge-case | invalid",
  "description": "Brief description of what this tests"
}
```

### Scoring Test Scenarios

Add to your test documentation:
1. Define job requirements (mandatory + nice-to-have)
2. Define candidate profile
3. Calculate expected score manually
4. Define expected decision (Accept/Reject)
5. Run through scoring engine
6. Compare actual vs expected

---

## 📈 Interpreting Results

### Extraction Accuracy
- **Target:** ≥95% overall
- **Critical Fields:** Name, Email (should be >90% each)
- **Important Fields:** Phone, Skills (should be >85% each)

**Status Indicators:**
- ✅ **Pass:** ≥95% accuracy
- ⚠️ **Warning:** 85-94% accuracy (needs improvement)
- ❌ **Fail:** <85% accuracy (critical issues)

### Scoring Validation
- **Target:** 100% accuracy
- **No tolerance** for incorrect Accept/Reject decisions
- **Formula must be exact**

**Status Indicators:**
- ✅ **Pass:** 100% correct decisions, formula validated
- ❌ **Fail:** Any incorrect decision or formula error

### Batch Processing
- **Success Rate:** ≥95%
- **No crashes** for 50+ CVs
- **Error handling** must work
- **No memory leaks**

**Status Indicators:**
- ✅ **Stable:** ≥95% success, no crashes, proper error handling
- ⚠️ **Unstable:** 85-94% success or occasional issues
- ❌ **Failed:** <85% success or frequent crashes

---

## 🔧 Testing Tools

### Testing Dashboard (`/testing`)
Interactive UI for:
- Uploading test CVs
- Running extraction tests
- Running scoring validation
- Viewing test history
- Exporting reports

### CVTestRunner Component
Automated test runner that:
- Loads test cases from JSON
- Processes CVs through pipeline
- Compares actual vs expected
- Generates accuracy metrics
- Exports results

---

## 📅 Testing Schedule

### Pre-Launch Testing
- [ ] Initial extraction accuracy test (10 CVs)
- [ ] Scoring algorithm validation (5 scenarios)
- [ ] Small batch test (10 CVs)

### Full Validation
- [ ] Comprehensive extraction test (50+ CVs)
- [ ] Complete scoring validation (10+ scenarios)
- [ ] Large batch test (50+ CVs)
- [ ] Edge case testing
- [ ] Performance testing

### Ongoing Testing
- **Weekly:** Spot checks with 5-10 new CVs
- **Monthly:** Full regression testing
- **After Updates:** Re-run affected test suites

---

## 🐛 Reporting Issues

When issues are found:

1. **Document in test results**
   - Severity: Critical / High / Medium / Low
   - Affected test cases
   - Root cause (if known)

2. **Create issue ticket**
   - Reference test case ID
   - Include actual vs expected output
   - Attach CV sample (if applicable)

3. **Track resolution**
   - Re-test after fix
   - Update test documentation
   - Mark as resolved in validation criteria

---

## ✅ Validation Criteria Tracking

Track overall project validation in `validation-criteria.md`:
- Extraction accuracy: ____%
- Scoring accuracy: ____%
- Batch processing stability: Pass/Fail
- Format diversity: ___/50 CVs

**Project is ready for production when:**
- ✅ Extraction accuracy ≥95%
- ✅ Scoring accuracy = 100%
- ✅ Batch processing stable (50+ CVs)
- ✅ All 50+ diverse CV formats tested

---

## 📚 References

- **Test Case Definitions:** `test-cases/extraction-test-cases.json`
- **CV Format Checklist:** `test-cases/cv-format-checklist.md`
- **Validation Criteria:** `validation-criteria.md`
- **Result Templates:** `test-results/*.md`

---

## 🤝 Testing Responsibilities

**Tester:**
- Execute tests
- Document results
- Report issues

**Reviewer:**
- Verify test coverage
- Validate results
- Approve sign-off

**Developer:**
- Fix issues
- Re-test after fixes
- Update documentation

---

## 📞 Support

For questions about testing:
1. Review this documentation
2. Check test templates for examples
3. Consult validation criteria checklist

---

**Last Updated:** 2025-10-02  
**Version:** 1.0  
**Maintained by:** HR Recruitment System Team
