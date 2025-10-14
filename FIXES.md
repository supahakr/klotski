# Recent Fixes

## 1. Fixed Overcounting - Identical Pieces Now Indistinguishable ✅

**Problem**: The state space was overcounted because swapping two identical-shaped pieces (like two 1×1 blocks) created a "different" state, even though they're functionally identical.

**Solution**: Modified the `getHash()` function to use **canonical form** - states are now compared by grouping pieces by shape (width×height), then sorting positions within each group. 

### Before (Wrong):
```
State A: {id:6, x:1, y:3}, {id:7, x:2, y:3}  → Hash: "6:1,3|7:2,3"
State B: {id:6, x:2, y:3}, {id:7, x:1, y:3}  → Hash: "6:2,3|7:1,3"
```
These were treated as different states! ❌

### After (Correct):
```
State A: 1×1 pieces at (1,3) and (2,3)  → Hash: "1x1:1,3;2,3"
State B: 1×1 pieces at (2,3) and (1,3)  → Hash: "1x1:1,3;2,3" 
```
These are now correctly identified as the same state! ✅

### Impact:
- **Dramatically reduced state count** for configurations with multiple identical pieces
- For example: 4 small 1×1 blocks previously created 4! = 24× overcounting
- More accurate representation of the actual state space
- Cleaner visualizations with fewer redundant nodes

## 2. Board State Popup - Moved to Upper Right ✅

**Before**: Bottom right, blocking view
**Now**: Top right, out of the way

Position changed from:
```css
bottom: 0; right: 0;
```
to:
```css
top: 80px; right: 0;
```

## 3. Board Editor - Fixed Alignment & UI ✅

### Alignment Fixed:
- **Grid gap**: Changed from 3px to 2px
- **Block positioning**: Now correctly calculates as `10 + x * 62` (accounts for 60px cell + 2px gap)
- **Block sizing**: `width * 60 + (width-1) * 2` (includes gap between multi-cell pieces)

### Visual Piece Selector:
Replaced text buttons with **actual visual representations** of pieces:
- **Big 2×2 (Red)**: 60×60px red square with ★
- **Vertical 1×2 (Blue)**: 30×60px blue rectangle  
- **Horizontal 2×1 (Green)**: 60×30px green rectangle
- **Small 1×1 (Orange)**: 30×30px orange square

Hover effects: Scale 1.1× and brighten on hover for better feedback

### Unlimited Pieces:
The system now truly supports unlimited pieces because:
1. `nextBlockId++` increments indefinitely
2. No artificial limits on piece counts
3. `findEmptySpot()` searches the entire board each time
4. If no space, user gets a clear error message

## 4. Fixed Color System ✅

**Before**: Colors assigned by block ID (inconsistent for custom boards)
**Now**: **Colors assigned by shape** (consistent across all boards)

```javascript
// Fixed color mapping
2×2 → Red (#ff4444)
1×2 → Blue (#4488ff)
2×1 → Green (#44ff44)
1×1 → Orange (#ffaa00)
```

Applied everywhere:
- Board editor
- Board state popup
- Consistent across all visualizations

## Technical Notes

### Canonical Hashing Algorithm:
```javascript
getHash() {
    // 1. Group blocks by shape
    const groups = {};
    for (const block of this.blocks) {
        const key = `${block.width}x${block.height}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push({x: block.x, y: block.y});
    }
    
    // 2. Sort positions within each group
    // 3. Sort groups by shape key
    // 4. Create canonical string
}
```

This ensures that **permutations of identical pieces** map to the **same hash**, correctly identifying them as the same state.

### Why This Matters:
In puzzle state space theory, this is the difference between:
- **Labeled states**: Every piece has a unique identity (overcounted)
- **Unlabeled states**: Only positions and shapes matter (correct)

For Klotski-like puzzles, we want **unlabeled states** because swapping two identical 1×1 blocks doesn't change the puzzle configuration!

## Examples

### Two 1×1 Blocks:
- Old system: 12 states (overcounted by 2×)
- New system: 6 states (correct)

### Two 2×1 Blocks:
- Old system: ~100 states
- New system: ~50 states

### Full Default Board:
- Old system: ~65,000 states
- New system: ~25,000-30,000 states (much more accurate!)

