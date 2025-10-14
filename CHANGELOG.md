# Changelog

## Latest Updates

### Fixed Issues

#### 1. Toroidal Warping → Planar Grids
**Problem**: Simple graphs (like 2-3 pieces) were warping into torus/circular shapes instead of flat grids.

**Solution**: Added **Planarity Bias** parameter (0.0-2.0)
- Applies a force that reduces local curvature
- For each node with 3+ neighbors, computes the plane defined by those neighbors
- Pushes the node toward that plane
- Higher values = flatter, more grid-like structures
- Default: 0.5 (moderate flattening)

**Suggested Settings for Flat Grids**:
- Planarity Bias: 1.0 - 1.5
- Edge Constraint: 0.5 - 0.8
- Repulsion Exponent: 1.5 - 2.0

#### 2. Board State Popup Blocking Screen
**Problem**: Board state visualization covered half the screen and couldn't be dismissed.

**Solutions**:
- Reduced size: Grid cells now 25px (was 30px)
- Made dismissable: Click the ✕ button to close
- Starts hidden, only appears when you click a node
- Max width: 220px
- Compact padding and margins

#### 3. Exponent Range
**Changed**: Repulsion Exponent from (-3 to 2) → (0 to 2)
- Negative exponents caused unstable/exotic behaviors
- Range 0-2 covers all practical cases:
  - n = 0.5: Very slow falloff, highly spread
  - n = 1.0: Linear falloff
  - n = 2.0: Inverse square (gravitational)

#### 4. Board Editor Workflow
**Old**: Started with default board, click to remove pieces

**New**: Start with blank board, add pieces from unlimited palette
- Click "Big 2×2", "Vertical 1×2", "Horizontal 2×1", or "Small 1×1" to add
- Pieces automatically placed in first available spot
- Click pieces on board to remove them
- Much more intuitive for exploring simple configurations

**Benefits**:
- Easy to test simple cases (e.g., just 2-3 pieces)
- Build up complexity incrementally
- Explore minimal state spaces

## Why These Changes Help

### The Toroidal Problem Explained
When you have a graph that's topologically a **cycle** (states forming a loop), pure repulsion in 3D naturally settles into a **circular** or **toroidal** shape to minimize energy - this is mathematically optimal for repulsion alone!

Example: Two 2×1 pieces can slide past each other, creating a cycle in the state graph:
```
State A → State B → State C → State D → State A (cycle!)
```

Pure repulsion arranges this cycle as a circle/ring. But we want to see it as a **square grid** with some connectivity.

The **Planarity Bias** explicitly counteracts this by adding a force that prefers locally flat arrangements. It won't completely flatten a torus (that's topologically impossible), but it will reveal planar substructures and reduce unnecessary curvature.

### Physical Intuition
Think of it like this:
- **Pure Repulsion**: Nodes want to be as far apart as possible → spherical/toroidal packing
- **Edge Constraint**: Connected nodes stay ~3 units apart
- **Planarity Bias**: Local neighborhoods prefer to be flat → grid-like structures emerge

The combination creates tight, uniform local grids while allowing the overall structure to spread out and avoid overlap between distant clusters.

## Usage Examples

### For 2-3 Simple Pieces
1. Open Board Editor
2. Add 2-3 pieces (e.g., two horizontal 2×1 blocks)
3. Generate graph
4. Set Planarity Bias to 1.5
5. Set Edge Constraint to 0.7
6. Apply Parameters
7. Result: Clean square/rectangular grid!

### For Complex Full Board
1. Use default configuration or build custom
2. Set Planarity Bias to 0.5-0.8 (moderate)
3. Set Repulsion Exponent to 1.5-2.0
4. Increase iterations to 400-500
5. Result: Clear separated clusters with visible topology

