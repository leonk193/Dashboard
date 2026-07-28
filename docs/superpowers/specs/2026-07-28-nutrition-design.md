# Nutrition Tab Design Specification

## Context
The user requested adding a nutrition tab to their existing dashboard to track calories, macronutrients, and meal photos. The dashboard already has established patterns for data storage (localStorage with Supabase sync), UI components (bento grid tiles, tabbed interfaces), and styling conventions.

## Requirements
Based on user feedback during brainstorming:

### Core Features:
1. **Meal Logging**: Detailed entry form for meals with:
   - Meal name and time
   - Calories and macronutrients (protein, carbs, fat in grams)
   - Optional photo upload
   - Optional notes field

2. **Data Storage**: 
   - Sync with Supabase backend for cross-device consistency
   - LocalStorage fallback for offline use
   - Follow existing dashboard sync patterns using sync.js

3. **Progress Tracking**:
   - Daily calorie goal (default 2000 kcal)
   - Macro goals (protein: 150g, carbs: 250g, fat: 70g)
   - Visual progress rings for each metric
   - Daily totals display

4. **Meal History**:
   - Chronological list of meals with photos
   - Edit/delete functionality
   - Filter by date (today, week, month)

5. **UI/UX**:
   - Tabbed interface matching dashboard patterns:
     * Log Meal tab
     * Daily Summary tab  
     * Meal History tab
   - Consistent styling with existing dashboard components
   - Responsive design for mobile and desktop

## Approach Selected: Tabbed Interface
Chosen over single-page and modal-based approaches because:
- Follows established dashboard patterns (similar to main.html structure)
- Clear separation of concerns between logging, tracking, and history
- Scales well to different screen sizes
- Provides immediate visual feedback while maintaining focused workflows

## Architecture Overview

### Data Flow
```
User Input → Form Validation → LocalStorage → Supabase Sync
                                      ↓
                Real-time Updates ← Storage Events
```

### Component Structure
1. **Tab Container** - Manages switching between views
2. **Meal Form Component** - Detailed entry form with photo upload
3. **Progress Ring Component** - Reusable circular progress visualization
4. **Meal List Component** - Display and interaction with meal history
5. **Sync Handler** - Leverages existing sync.js infrastructure

### Storage Schema
```javascript
// LocalStorage key: 'nutrition_meals'
// Array of meal objects:
{
  id: timestamp + random,
  name: string,
  time: string (HH:MM format),
  calories: number,
  protein: number (grams),
  carbs: number (grams),
  fat: number (grams),
  photo_url: string (Supabase storage URL, nullable),
  notes: string,
  timestamp: ISO string,
  date: YYYY-MM-DD
}
```

### Supabase Tables Needed
1. `nutrition_meals` - Stores meal records
2. `nutrition_photos` - Storage bucket for meal photos

## Implementation Details

### Styling & Components
- Reuse CSS variables from existing dashboard (--text-primary, --text-secondary, etc.)
- Consistent tile styling for the nutrition bento grid item
- Tabbed interface following patterns from other dashboard sections
- Progress rings inspired by day-ring component in main.html
- Photo upload component with drag-and-drop and preview

### Key Functions
1. **Meal Logging**:
   - Form validation (require name, at least one nutrition value)
   - Photo compression/resizing (client-side before upload)
   - Optimistic UI updates

2. **Progress Calculation**:
   - Daily totals calculated from meals matching current date
   - Percentage-based progress rings with color coding:
     * < 50%: warning color
     * 50-80%: accent color  
     * 80-100%: success color
     * > 100%: gradient (success → warning)

3. **History Management**:
   - Reverse chronological ordering (newest first)
   newest first)
   - Edit mode pre-populates form with existing values
   - Delete with confirmation dialog
   - Storage events trigger UI updates across tabs

### Responsive Behavior
- **Desktop (≥768px)**: 4-column bento grid, side-by-side layout in tabs
- **Tablet (440-768px)**: 2-column bento grid, stacked tab content
- **Mobile (<440px)**: Single column bento, full-width form fields

### Error Handling & Edge Cases
- Offline capability: LocalStorage queues sync when connection restored
- Photo upload limits: 5MB max, client-side validation
- Invalid data handling: Graceful degradation to localStorage only
- Storage limits: Automatic cleanup of old entries if needed (configurable)

## Verification Plan

### Manual Testing
1. Verify nutrition tile appears in dashboard bento grid
2. Test tab switching preserves state
3. Validate form submission with various input combinations
4. Check progress ring updates with realistic meal data
5. Confirm photo upload displays correctly in history
6. Test edit/delete functionality
7. Verify responsive breakpoints
8. Check Supabase sync when online/offline

### Automated Validation
- Form validation prevents incomplete submissions
- Storage persistence confirmed across page refreshes
- UI updates correctly when storage changes externally
- Accessibility: ARIA labels, keyboard navigation, screen reader friendly

## Risks & Mitigations

### Risk: Photo Storage Costs
- **Mitigation**: Implement client-side image compression before upload
- **Alternative**: Allow users to disable photo uploads in settings

### Risk: Data Loss During Sync Conflicts
- **Mitigation**: Use timestamp-based conflict resolution (last write wins)
- **Fallback**: Preserve both versions with manual resolution option

### Risk: Performance with Large Meal Histories
- **Mitigation**: Implement pagination or virtual scrolling for history view
- **Alternative**: Auto-archive older data after configurable period

## Future Enhancements
1. Barcode scanning for packaged foods
2. Meal templates for frequently eaten foods
3. Nutritional insights and trends over time
4. Integration with fitness data for calorie burn calculations
5. Social sharing of meals (with privacy controls)
6. Meal planning calendar view

## Files Modified/Created
1. `nutrition.html` - New page implementing the nutrition tab
2. `index.html` - Added nutrition tile to bento grid
3. `docs/superpowers/specs/2026-07-28-nutrition-design.md` - This document

## Dependencies
- Existing sync.js infrastructure
- Supabase backend (already configured for dashboard)
- No additional external libraries required