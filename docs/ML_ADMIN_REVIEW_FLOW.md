# CleanSight ML Admin Review Flow (Phase 1)

This document describes the admin review flow for ML Phase 1 image validation results.

## Overview
In ML Phase 1, newly submitted reports undergo a binary image classification check (`trash` vs `non-trash`). Depending on the model's confidence, reports may be flagged for manual review by an admin.

## Statuses

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

## Admin Actions

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

## Future Plans (Phase 2)
For Phase 2 (Waste Category Classification), this review flow remains intact. Additional details, such as verifying the specific categories (`recyclable`, `hazardous`, etc.), can be added as a separate metadata section in the report drawer without breaking Phase 1's image validity checks. By separating structural validity (Phase 1) from categorical details (Phase 2), the CleanSight system can efficiently funnel data.
