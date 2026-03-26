# CleanSight ML Admin Review Flow

This document describes the admin review flow for ML Phase 1 image validation and Phase 2 waste category classification results.

## Overview

CleanSight uses a two-phase ML pipeline:

1. **Phase 1 (Binary Validation)**: Determines if an uploaded image contains waste (`trash` vs `non-trash`)
2. **Phase 2 (Category Classification)**: Classifies validated waste into categories (`glass`, `mixed`, `paper`, `plastic`)

Phase 2 runs only after Phase 1 confirms the image is valid waste. Both phases have independent review workflows.

---

## Phase 1: Image Validation Review

### `aiReviewStatus`
Tracks the report's progress through the ML validation and admin review queue.
- **`pending`**: Default state before ML prediction is verified (or if ML prediction takes time/fails).
- **`flagged`**: The ML model classified the image as `non-trash` or had low confidence on a `trash` classification. Admin review is heavily recommended.
- **`manual_review`**: The report is actively being reviewed or requires closer inspection.
- **`approved`**: The admin agreed with the ML prediction (or simply deemed the image valid).
- **`rejected`**: The admin deemed the image invalid (e.g., non-trash). The overall report is consequently marked as `rejected`.
- **`overridden`**: The admin manually changed the decision against the model's primary classification (e.g., model said `non-trash` but admin forces it to `trash` as a valid report).

### `imageValidationLabel`
- `trash`: Confirmed valid waste.
- `non-trash`: Not waste (invalid image).
- `error`: Failed during prediction.
- `pending`: Pending prediction.

### `finalValidationDecision`
Fields populated upon admin review.
- `approved`: Admin agreed with validation.
- `rejected`: Admin rejected validation.
- `overridden`: Admin bypassed validation.

### Phase 1 Admin Actions

When reviewing a flagged report, administrators have three primary actions:

1. **Approve Image**:
   - Updates `aiReviewStatus` to `approved`.
   - Records the decision in `finalValidationDecision` as `approved`.
   - The report continues its standard lifecycle (pending/verified).

2. **Reject (Invalid)**:
   - Updates `aiReviewStatus` to `rejected`.
   - Records the decision in `finalValidationDecision` as `rejected`.
   - The report's primary `status` is automatically set to `rejected` with an auto-generated rejection reason ("Auto-rejected: invalid image determined during admin review").

3. **Override (Force Valid)**:
   - Updates `aiReviewStatus` to `overridden`.
   - Records the decision in `finalValidationDecision` as `overridden`.
   - The `imageValidationLabel` is forced to `trash`.
   - Allows the report to proceed normally.

---

## Phase 2: Category Classification Review

Phase 2 category classification runs only after Phase 1 is approved or overridden. It uses a PyTorch-based model to classify waste into four categories.

### Categories
- `glass`: Glass bottles, jars, containers
- `mixed`: Mixed or multi-material waste
- `paper`: Paper, cardboard, newspapers
- `plastic`: Plastic bottles, containers, bags

### `wasteCategoryReviewStatus`
Tracks the category prediction review workflow:
- **`pending`**: Awaiting category classification or review
- **`auto_accepted`**: Model prediction had HIGH confidence (>80%) and was automatically accepted
- **`flagged`**: Model prediction had MODERATE confidence (50-80%), needs review
- **`manual_review`**: Model prediction had LOW/VERY LOW confidence (<50%), requires manual classification
- **`approved`**: Admin confirmed the model's predicted category
- **`overridden`**: Admin changed the category to a different value
- **`rejected`**: Admin rejected the category classification (rare, for special cases)

### Category Confidence Levels
The model provides confidence levels based on prediction probability and entropy:
- **HIGH**: Confidence >= 80% with low entropy - prediction can be trusted
- **MODERATE**: Confidence >= 50% - review may be needed
- **LOW**: Confidence >= 30% - manual review recommended
- **VERY LOW**: Confidence < 30% - manual classification required

### Database Fields

| Field | Description |
|-------|-------------|
| `wasteCategoryPredictedLabel` | ML-predicted category (glass/mixed/paper/plastic/pending/error) |
| `wasteCategoryConfidence` | Prediction confidence (0-1) |
| `wasteCategoryEntropy` | Normalized entropy for uncertainty measurement (0-1) |
| `wasteCategoryConfidenceLevel` | HIGH/MODERATE/LOW/VERY LOW |
| `wasteCategoryAllPredictions` | Array of all class predictions with confidence |
| `wasteCategoryReviewStatus` | Review workflow status |
| `wasteCategoryFinalLabel` | Admin-confirmed final category |
| `wasteCategoryReviewedBy` | Admin who reviewed |
| `wasteCategoryReviewedAt` | Review timestamp |
| `wasteCategoryReviewNote` | Optional admin note |

### Phase 2 Admin Actions

When reviewing a flagged or manual_review category prediction:

1. **Approve Category**:
   - Confirms the model's predicted category is correct
   - Sets `wasteCategoryReviewStatus` to `approved`
   - Sets `wasteCategoryFinalLabel` to the predicted label
   - Records reviewer info and timestamp

2. **Override Category**:
   - Changes the category to a different value
   - Sets `wasteCategoryReviewStatus` to `overridden`
   - Sets `wasteCategoryFinalLabel` to the admin-selected category
   - Records the override decision in audit log

3. **Reject Category**:
   - Rejects the category classification (for special cases)
   - Sets `wasteCategoryReviewStatus` to `rejected`
   - `wasteCategoryFinalLabel` remains null
   - Used when image doesn't fit any category or is ambiguous

---

## Review Flow Diagram

```
Report Submitted
       │
       ▼
┌──────────────────┐
│ Phase 1: Binary  │
│   Validation     │
└────────┬─────────┘
         │
    ┌────┴────┐
    │ trash?  │
    └────┬────┘
         │
    ┌────┴────┐
    ▼         ▼
  YES        NO ──────► Flagged/Manual Review
    │                        │
    │                   ┌────┴────┐
    │                   │ Admin   │
    │                   │ Review  │
    │                   └────┬────┘
    │                        │
    │    ┌────────┬──────────┴──────────┐
    │    ▼        ▼                     ▼
    │ Reject   Override              Approve
    │    │        │                     │
    │    ▼        └──────────┬──────────┘
    │ Report                 │
    │ Rejected               │
    │                        ▼
    └────────────────► Phase 1 Approved
                             │
                             ▼
                    ┌────────────────────┐
                    │ Phase 2: Category  │
                    │   Classification   │
                    └────────┬───────────┘
                             │
                   ┌─────────┴─────────┐
                   │  Confidence?      │
                   └─────────┬─────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
      HIGH              MODERATE             LOW/VERY LOW
   (>80%)              (50-80%)              (<50%)
        │                    │                    │
        ▼                    ▼                    ▼
  Auto Accept           Flagged            Manual Review
        │                    │                    │
        │              ┌─────┴─────────────┐     │
        │              │   Admin Review    │◄────┘
        │              └─────────┬─────────┘
        │                        │
        │     ┌──────────────────┼──────────────────┐
        │     ▼                  ▼                  ▼
        │  Approve           Override            Reject
        │     │                  │                  │
        │     ▼                  ▼                  ▼
        │  Final =           Final =            Final = null
        │  Predicted         Selected           (Special)
        │     │                  │                  │
        └─────┴──────────────────┴──────────────────┘
                             │
                             ▼
                    Report Ready for
                    Processing/Assignment
```

---

## API Endpoints

### Phase 1 Review
```
PATCH /api/admin/reports/:id/review
Body: { action: "approve" | "reject" | "override", reviewNote?: string }
```

### Phase 2 Category Review
```
PATCH /api/admin/reports/:id/category-review
Body: {
  action: "approve" | "reject" | "override",
  overrideCategory?: "glass" | "mixed" | "paper" | "plastic",
  reviewNote?: string
}
```

### Category Review Queue
```
GET /api/admin/reports/category-review-queue
Query params:
  - reviewStatus: string (comma-separated)
  - predictedCategory: string (comma-separated)
  - lowConfidenceOnly: boolean
  - sortBy: string
  - sortOrder: asc | desc
  - page: number
  - limit: number
```

---

## Audit Logging

Both Phase 1 and Phase 2 review actions are logged in the audit log:

- Phase 1: `REPORT_ML_REVIEW`
- Phase 2: `REPORT_CATEGORY_REVIEW`

Metadata includes:
- Previous and new review status
- Predicted label and final label
- Override category (if applicable)
- Reviewer info

---

## UI Components

### Admin Report Drawer
The report detail drawer shows:
- Phase 1 validation info (label, confidence, status)
- Phase 2 category prediction (if available):
  - Predicted category
  - Confidence percentage
  - Confidence level badge
  - All class predictions with visual bars
  - Review status
  - Final category (if reviewed)

Review actions appear based on status:
- Phase 1 actions when `aiReviewStatus` needs review
- Phase 2 actions when Phase 1 is approved AND `wasteCategoryReviewStatus` needs review

### Reports Table Filters
The admin can filter reports by:
- Report status
- Waste type
- Urgency
- Phase 1 ML review status
- Phase 2 category review status

---

## Best Practices

1. **Review Priority**: Focus on `manual_review` status first, then `flagged`
2. **Use Override Sparingly**: Only override when confident the model is wrong
3. **Add Notes**: Document unusual cases for future training data
4. **Trust HIGH Confidence**: Auto-accepted predictions rarely need review
5. **Check All Predictions**: Review the full prediction breakdown for edge cases

