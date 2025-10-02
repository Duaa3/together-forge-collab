# CV Format Diversity Testing Checklist

**Target:** Minimum 50 diverse CVs  
**Current Progress:** 0/50 CVs tested  
**Last Updated:** [YYYY-MM-DD]

---

## Required Test Coverage

### By File Format (50 CVs minimum)

#### PDF Files (35 CVs)
- [ ] PDF with native text (searchable) - 20 CVs
  - [ ] Single-page PDF
  - [ ] Multi-page PDF (2-3 pages)
  - [ ] Multi-page PDF (4+ pages)
- [ ] PDF with scanned/image content (OCR required) - 10 CVs
- [ ] PDF with mixed native and scanned content - 5 CVs

#### Microsoft Word (10 CVs)
- [ ] DOCX format - 7 CVs
- [ ] DOC format (legacy) - 3 CVs

#### Plain Text (5 CVs)
- [ ] TXT format - 5 CVs

**Format Total:** ___/50 CVs

---

### By Layout/Structure (overlapping with format)

#### Column Layouts
- [ ] Single column layout - 15 CVs
- [ ] Two column layout - 15 CVs
- [ ] Three column layout - 5 CVs
- [ ] Mixed/hybrid layouts - 5 CVs

#### Design Complexity
- [ ] Simple text-only (minimal formatting) - 10 CVs
- [ ] Moderate formatting (headers, bullets, bold) - 20 CVs
- [ ] Creative/graphical design (colors, icons, graphics) - 10 CVs
- [ ] Template-based (common CV templates) - 10 CVs

**Layout Total:** ___/50 CVs

---

### By Content Variations (overlapping with above)

#### Contact Information Completeness
- [ ] Full contact info (name, email, phone, LinkedIn, GitHub) - 20 CVs
- [ ] Missing email - 5 CVs
- [ ] Missing phone - 5 CVs
- [ ] Missing social links (LinkedIn/GitHub) - 5 CVs
- [ ] Missing multiple fields - 5 CVs
- [ ] Only name and email - 5 CVs
- [ ] Unusual contact formats (Skype, Portfolio URLs) - 5 CVs

#### Phone Number Formats
- [ ] US format: +1 (555) 123-4567 - 10 CVs
- [ ] UK format: +44 7700 900000 - 5 CVs
- [ ] European formats: +33, +49, +39, etc. - 10 CVs
- [ ] Asian formats: +91, +86, +81, etc. - 5 CVs
- [ ] Dots separator: 555.123.4567 - 3 CVs
- [ ] Dashes separator: 555-123-4567 - 3 CVs
- [ ] Spaces separator: 555 123 4567 - 3 CVs
- [ ] No formatting: 5551234567 - 3 CVs
- [ ] With country code and parentheses - 3 CVs
- [ ] Mixed formats - 5 CVs

**Phone Format Total:** ___/50 varieties

#### Name Variations
- [ ] English names (First Last) - 20 CVs
- [ ] Non-English names (accents, special characters) - 10 CVs
- [ ] Asian names (different ordering) - 5 CVs
- [ ] Names with titles (Dr., Prof., MBA) - 5 CVs
- [ ] Hyphenated names - 3 CVs
- [ ] Single name (mononym) - 2 CVs
- [ ] Very long names (4+ parts) - 5 CVs

**Name Variation Total:** ___/50 CVs

---

### By Skill Density

#### Number of Skills Listed
- [ ] 0-5 skills (sparse) - 5 CVs
- [ ] 6-10 skills (low) - 10 CVs
- [ ] 11-20 skills (moderate) - 20 CVs
- [ ] 21-30 skills (high) - 10 CVs
- [ ] 30+ skills (very high) - 5 CVs

#### Skill Presentation Format
- [ ] Bullet list - 20 CVs
- [ ] Comma-separated - 15 CVs
- [ ] Categorized (Frontend, Backend, etc.) - 10 CVs
- [ ] Skill ratings/bars - 5 CVs

**Skill Total:** ___/50 CVs

---

### By Experience Level

- [ ] Entry-level (0-2 years) - 10 CVs
- [ ] Mid-level (3-5 years) - 15 CVs
- [ ] Senior (6-10 years) - 15 CVs
- [ ] Expert (10+ years) - 10 CVs

**Experience Total:** ___/50 CVs

---

### By Industry/Role

- [ ] Software Engineering - 15 CVs
- [ ] Data Science/Analytics - 10 CVs
- [ ] DevOps/Cloud - 5 CVs
- [ ] Product Management - 5 CVs
- [ ] Design (UI/UX) - 5 CVs
- [ ] Quality Assurance - 5 CVs
- [ ] Other tech roles - 5 CVs

**Industry Total:** ___/50 CVs

---

### By Language

- [ ] English only - 40 CVs
- [ ] Bilingual (English + other) - 7 CVs
- [ ] Non-English primary - 3 CVs

**Language Total:** ___/50 CVs

---

### Edge Cases & Special Scenarios

- [ ] CV with profile photo embedded - 5 CVs
- [ ] CV with charts/graphs - 3 CVs
- [ ] CV with tables (project/work history) - 10 CVs
- [ ] CV with links (clickable URLs) - 10 CVs
- [ ] CV with QR codes - 2 CVs
- [ ] CV with unusual fonts - 5 CVs
- [ ] CV with colored backgrounds - 5 CVs
- [ ] CV with watermarks - 3 CVs
- [ ] CV with headers/footers - 10 CVs
- [ ] Password-protected PDF - 2 CVs
- [ ] Corrupted/malformed files - 3 CVs
- [ ] Very large files (10MB+) - 2 CVs
- [ ] Very small files (<50KB) - 5 CVs

**Edge Cases Total:** ___/65 scenarios

---

## Test Sample Sources

### Recommended Sources
- [ ] Real anonymized CVs (with consent)
- [ ] Synthetic/generated test CVs
- [ ] Public CV templates (modified)
- [ ] CV builder outputs (LinkedIn, Indeed, etc.)
- [ ] Academic CVs vs corporate CVs
- [ ] Freelance/contractor CVs

---

## Quality Criteria

Each test CV should:
- ✅ Have a known expected outcome (name, email, phone, skills)
- ✅ Be representative of real-world use cases
- ✅ Test at least one specific edge case or variation
- ✅ Be properly documented in extraction-test-cases.json
- ✅ Be stored in appropriate /tests/cv-samples/ subdirectory

---

## Progress Tracking

**Total Unique CVs Collected:** ___/50  
**Test Cases Documented:** ___/50  
**Coverage Percentage:** ___%

### Status Legend
- [ ] Not started
- [⏳] In progress
- [✅] Complete
- [❌] Failed/Blocked

---

## Notes

[Add any notes about difficult-to-obtain formats, challenges, or observations]
