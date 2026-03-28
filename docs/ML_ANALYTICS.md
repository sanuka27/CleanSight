# ML Analytics & Reporting Dashboard

## Overview

The ML Analytics dashboard provides comprehensive insights into CleanSight's machine learning system performance, including Phase 1 (binary trash validation) and Phase 2 (waste category classification). This feature enables administrators to monitor ML model accuracy, review workload, and identify areas for improvement.

## Purpose

- **Monitor ML Performance**: Track prediction accuracy and confidence levels
- **Review Workload Management**: Understand how many predictions require manual review
- **Quality Assurance**: Identify weak points where the model struggles
- **Operational Insights**: Support decision-making for ML system improvements
- **Demo & Evaluation**: Showcase ML system effectiveness for project presentations

## Key Metrics

### Phase 1: Binary Validation Metrics

Phase 1 determines if an uploaded image contains waste (trash vs non-trash).

**Available Metrics:**
- **Total Predictions**: Number of images processed by Phase 1
- **Label Distribution**: Breakdown of trash vs non-trash classifications
- **Review Status Distribution**: 
  - `approved`: Admin confirmed the prediction
  - `flagged`: Non-trash or low confidence, needs review
  - `manual_review`: Actively being reviewed
  - `pending`: Awaiting review
  - `rejected`: Admin rejected as invalid
  - `overridden`: Admin overrode the model's prediction
- **Override Rate**: Percentage of reviewed reports where admin disagreed with the model
- **Average Confidence**: Mean confidence score for predictions

### Phase 2: Category Classification Metrics

Phase 2 classifies validated waste into categories (glass, mixed, paper, plastic).

**Available Metrics:**
- **Total Predictions**: Number of images processed by Phase 2
- **Predicted Category Distribution**: What the model predicted
- **Final Category Distribution**: What was confirmed after review
- **Review Status Distribution**:
  - `auto_accepted`: HIGH confidence (>80%), no review needed
  - `flagged`: MODERATE confidence (50-80%), suggested review
  - `manual_review`: LOW/VERY LOW confidence (<50%), requires review
  - `approved`: Admin confirmed the prediction
  - `overridden`: Admin changed the category
  - `rejected`: Admin rejected (rare)
- **Auto-Accept Rate**: Percentage of predictions accepted automatically
- **Override Rate**: Percentage where predicted ≠ final category
- **Confidence Level Distribution**: HIGH, MODERATE, LOW, VERY LOW breakdown

### Combined Metrics

- **Total ML Processed Reports**: All reports that went through ML pipeline
- **Phase 1 Approval Rate**: Percentage approved or overridden as valid
- **Review Queue Size**: Total reports needing manual review (both phases)

## Predicted vs Final Reviewed Values

A critical distinction in ML analytics:

### Predicted Values
- What the ML model originally predicted
- Fields: `imageValidationLabel`, `wasteCategoryPredictedLabel`
- Represents model's initial assessment

### Final Reviewed Values
- What was ultimately confirmed after admin review
- Fields: `finalValidationDecision`, `wasteCategoryFinalLabel`
- Represents ground truth after human verification

**Why This Matters:**
- Comparing predicted vs final reveals model accuracy
- High override rates indicate model weaknesses
- Helps identify categories needing better training data
- Essential for measuring ML system improvement over time

## Analytics Calculations

### Override Rate
```
Override Rate = (Number of Overrides / Total Reviewed) × 100
```
Where an override is: predicted value ≠ final value

### Approval Rate (Phase 1)
```
Approval Rate = (Approved + Overridden as Valid) / Total Predictions × 100
```

### Auto-Accept Rate (Phase 2)
```
Auto-Accept Rate = Auto-Accepted / Total Phase 2 Predictions × 100
```

### Average Confidence
```
Avg Confidence = Mean of all non-null confidence scores
```

## Time-Based Trends

Daily aggregation of:
- Total predictions made
- Phase 1 approved count
- Phase 1 flagged for review count
- Phase 2 auto-accepted count
- Phase 2 needs review count

**Use Cases:**
- Identify prediction volume patterns
- Track review workload over time
- Monitor seasonal or temporal trends
- Evaluate impact of model updates

## Weak Points Analysis

Categories are analyzed for:
- **Override Rate**: How often admins disagreed with predictions
- **Average Confidence**: Mean confidence for category predictions
- **Manual Review Rate**: Percentage requiring manual review
- **Low Confidence Count**: Number of LOW/VERY LOW predictions

**Interpretation:**
- High override rate (>20%) = model struggles with this category
- Low average confidence (<0.7) = uncertain predictions
- High manual review rate (>30%) = poor auto-accept performance

Categories are sorted by override rate (highest first) to prioritize improvement areas.

## API Endpoints

All endpoints require authentication and support date range filtering.

### GET /api/ml-analytics/summary
Overall ML analytics summary (both phases)

**Query Parameters:**
- `range`: `7d` | `30d` | `90d` | `custom`
- `from`: ISO date string (for custom range)
- `to`: ISO date string (for custom range)

**Response:**
```json
{
  "success": true,
  "data": {
    "range": { "from": "2024-01-01", "to": "2024-01-31" },
    "totalReports": 1250,
    "phase1": {
      "approved": 1100,
      "needsReview": 150,
      "avgConfidence": 0.87,
      "approvalRate": "88.0"
    },
    "phase2": {
      "totalActive": 1100,
      "autoAccepted": 850,
      "needsReview": 250,
      "avgConfidence": 0.75,
      "autoAcceptRate": "77.3"
    },
    "reviewQueueSize": 400
  }
}
```

### GET /api/ml-analytics/phase1
Phase 1 binary validation detailed metrics

**Response includes:**
- `labelDistribution`: Trash/non-trash counts
- `reviewStatusDistribution`: Status breakdown
- `finalDecisionDistribution`: Approved/rejected/overridden counts
- `confidenceDistribution`: Confidence score buckets
- `overrideRate`: Override percentage

### GET /api/ml-analytics/phase2
Phase 2 category classification detailed metrics

**Response includes:**
- `predictedCategoryDistribution`: Model predictions by category
- `finalCategoryDistribution`: Final confirmed categories
- `reviewStatusDistribution`: Status breakdown
- `confidenceLevelDistribution`: HIGH/MODERATE/LOW/VERY LOW counts
- `autoAcceptRate`: Auto-accept percentage
- `overrideRate`: Override percentage

### GET /api/ml-analytics/trends
Time-series data for daily ML activity

**Response:**
```json
{
  "success": true,
  "data": {
    "range": { "from": "2024-01-01", "to": "2024-01-31" },
    "trends": [
      {
        "date": "2024-01-01",
        "totalPredictions": 45,
        "phase1Approved": 40,
        "phase1Flagged": 5,
        "phase2AutoAccepted": 32,
        "phase2NeedsReview": 8
      }
      // ... more daily data points
    ]
  }
}
```

### GET /api/ml-analytics/weak-points
Categories with performance issues

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "category": "mixed",
        "totalPredictions": 280,
        "avgConfidence": 0.62,
        "lowConfidenceCount": 95,
        "manualReviewCount": 110,
        "overriddenCount": 68,
        "overrideRate": 24.3,
        "manualReviewRate": 39.3
      }
      // ... sorted by overrideRate descending
    ]
  }
}
```

### GET /api/ml-analytics/confidence-distribution
Confidence score distribution for both phases

## Dashboard UI Components

### Summary Cards
4 KPI cards at the top:
- Total ML Predictions
- Phase 1 Approval Rate
- Phase 2 Auto-Accept Rate
- Review Queue Size

### ML Trends Chart
Line chart showing daily prediction activity:
- Total predictions
- Phase 1 approved
- Phase 2 auto-accepted

### Phase 1 Section
- Pie chart: Trash vs non-trash distribution
- Bar chart: Review status breakdown
- Key metrics: Override rate, average confidence

### Phase 2 Section
- Bar chart: Predicted vs final categories (side-by-side comparison)
- Bar chart: Review status breakdown
- Key metrics: Override rate, auto-accept rate

### Weak Points Table
Table showing categories sorted by override rate:
- Category name with color indicator
- Total predictions
- Average confidence (color-coded)
- Override rate (color-coded: red >20%, amber >10%, green ≤10%)
- Manual review rate

### Date Range Selector
Standard admin topbar with range options:
- This Week (7d)
- This Month (30d)
- Last 90 Days (90d)
- Custom Range

## Data Sources

All metrics are derived from the `Report` model in MongoDB. No new database schema changes were required.

**Phase 1 Fields Used:**
- `aiReviewStatus`
- `imageValidationLabel`
- `imageValidationConfidence`
- `finalValidationDecision`
- `reviewedBy`, `reviewedAt`

**Phase 2 Fields Used:**
- `wasteCategoryReviewStatus`
- `wasteCategoryPredictedLabel`
- `wasteCategoryFinalLabel`
- `wasteCategoryConfidence`
- `wasteCategoryConfidenceLevel`
- `wasteCategoryReviewedBy`, `wasteCategoryReviewedAt`

**Timestamps:**
- `createdAt`: For report submission trends
- `reviewedAt`, `wasteCategoryReviewedAt`: For review activity trends

## Performance Considerations

- MongoDB aggregation pipelines used for efficient querying
- Existing indexes on Report model support fast analytics:
  - `wasteCategoryReviewStatus`
  - `wasteCategoryPredictedLabel`
  - `createdAt`
- Daily granularity for trends (not hourly) to limit data volume
- Date range filtering reduces query scope

## Usage Examples

### Monitoring Model Performance
Check Phase 2 weak points table to identify categories with high override rates. If "mixed" has a 25% override rate, this indicates the model struggles to classify mixed waste and may need additional training data.

### Review Workload Planning
Check review queue size and trends to understand staffing needs. If Phase 2 flagged predictions are increasing, allocate more admin time for category reviews.

### Evaluating Model Updates
After retraining a model:
1. Note current override rates and confidence levels
2. Deploy updated model
3. Monitor ML Analytics for 7-30 days
4. Compare metrics to see if performance improved

### Demo Presentation
Use ML Analytics dashboard to show:
- Total predictions processed (demonstrates system usage)
- High auto-accept rates (shows ML effectiveness)
- Predicted vs final comparison (shows human-in-the-loop quality)
- Weak points identification (shows data-driven improvement process)

## Troubleshooting

### No Data Displayed
- Check date range: Ensure reports exist in selected period
- Verify ML services ran: Reports need ML predictions to show analytics
- Check filters: Broad date ranges may have no matching data

### Unexpected Metrics
- Zero override rate: No reviewed reports yet (all pending or auto-accepted)
- 100% override rate: Small sample size, not statistically significant
- N/A confidence: Reports without ML predictions (error or pending state)

### Empty Trends
- Custom date range may be too narrow (< 1 day)
- No reports created in selected period
- ML services not running during that timeframe

## Future Enhancements

Potential additions (not in current scope):
- Confusion matrix visualization
- Per-admin reviewer performance metrics
- Export analytics data to CSV
- Automated alerting for high override rates
- Confidence calibration charts
- Category-specific confidence trends

## Related Documentation

- [ML_ADMIN_REVIEW_FLOW.md](./ML_ADMIN_REVIEW_FLOW.md) - Phase 1 & 2 review workflows
- [ANALYTICS_API.md](./ANALYTICS_API.md) - General analytics API documentation
- Backend: `Backend/src/services/mlAnalyticsService.js`
- Frontend: `Frontend/src/pages/admin/MLAnalytics.tsx`
