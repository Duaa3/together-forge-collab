# CV Data Extraction Accuracy Test Report

**Test Date:** [YYYY-MM-DD]  
**Tester:** [NAME]  
**Total CVs Tested:** [NUMBER]  
**Test Environment:** Production / Staging  

---

## Test Summary

- **Total Test Cases:** [NUMBER]
- **Successful Extractions:** [NUMBER]/[TOTAL]
- **Accuracy Rate:** [PERCENTAGE]%
- **Target Accuracy:** 95%
- **Status:** ✅ PASS / ❌ FAIL

---

## Extraction Results by Field

### Name Extraction
- **Success Rate:** [PERCENTAGE]%
- **Successful:** [NUMBER]/[TOTAL]
- **Failed Cases:** [TC001, TC002, ...]
- **Common Issues:** [Description of patterns in failures]

### Email Extraction
- **Success Rate:** [PERCENTAGE]%
- **Successful:** [NUMBER]/[TOTAL]
- **Failed Cases:** [TC001, TC002, ...]
- **Common Issues:** [Description of patterns in failures]

### Phone Extraction
- **Success Rate:** [PERCENTAGE]%
- **Successful:** [NUMBER]/[TOTAL]
- **Failed Cases:** [TC001, TC002, ...]
- **Common Issues:** [Description of patterns in failures]

### Skills Extraction
- **Success Rate:** [PERCENTAGE]%
- **Successful:** [NUMBER]/[TOTAL]
- **Average Skills per CV:** [NUMBER]
- **Failed Cases:** [TC001, TC002, ...]
- **Common Issues:** [Description of patterns in failures]

---

## Test Cases Detail

| Test ID | Filename | Field | Expected | Actual | Status | Notes |
|---------|----------|-------|----------|--------|--------|-------|
| TC001 | example.pdf | Name | John Doe | John Doe | ✅ | - |
| TC001 | example.pdf | Email | john@example.com | john@example.com | ✅ | - |
| TC001 | example.pdf | Phone | +1234567890 | +1234567890 | ✅ | - |
| TC001 | example.pdf | Skills | 5 skills | 5 skills | ✅ | - |

---

## Issues Found

### Critical Issues
1. [Issue description]
   - **Severity:** High/Medium/Low
   - **Affected Test Cases:** [List]
   - **Recommended Fix:** [Description]

### Minor Issues
1. [Issue description]
   - **Severity:** Low
   - **Affected Test Cases:** [List]
   - **Recommended Fix:** [Description]

---

## Performance Metrics

- **Average Processing Time per CV:** [NUMBER] seconds
- **Fastest Processing:** [NUMBER] seconds (Test Case: [ID])
- **Slowest Processing:** [NUMBER] seconds (Test Case: [ID])
- **Total Test Duration:** [NUMBER] minutes

---

## Recommendations

1. [Recommendation for improvement]
2. [Recommendation for improvement]
3. [Recommendation for improvement]

---

## Sign-off

**Tested by:** [NAME]  
**Reviewed by:** [NAME]  
**Date:** [YYYY-MM-DD]  
**Next Review Date:** [YYYY-MM-DD]
