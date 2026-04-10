export const WASTE_TYPES = ['general', 'recyclable', 'organic', 'construction', 'hazardous'];
export const URGENCY_LEVELS = ['low', 'medium', 'high'];

// ML Phase 1 (Trash/Non-trash)
export const AI_REVIEW_STATUSES = ['approved', 'flagged', 'manual_review', 'pending', 'rejected', 'overridden'];
export const IMAGE_VALIDATION_LABELS = ['trash', 'non-trash', 'error', 'pending'];
export const FINAL_VALIDATION_DECISIONS = ['approved', 'rejected', 'overridden', null];

// ML Phase 2 (Categories)
export const WASTE_CATEGORIES = ['glass', 'mixed', 'paper', 'plastic'];
export const PREDICTED_LABELS = [...WASTE_CATEGORIES, 'pending', 'error'];
export const CATEGORY_REVIEW_STATUSES = ['auto_accepted', 'flagged', 'manual_review', 'pending', 'approved', 'overridden', 'rejected'];
export const CONFIDENCE_LEVELS = ['HIGH', 'MODERATE', 'LOW', 'VERY LOW', null];
