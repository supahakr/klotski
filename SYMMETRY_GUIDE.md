# Symmetry Detection & Enforcement Guide

## What's New

I've implemented a powerful symmetry detection and enforcement system for your Klotski graph visualization! This feature automatically:

1. **Detects symmetries** in the graph structure
2. **Enforces these symmetries** in the layout
3. **Creates more visually pleasing** and understandable visualizations

## Types of Symmetries Detected

### 1. Horizontal Mirror Symmetry
States that are mirror images across a vertical axis (flipped horizontally) are positioned symmetrically in the visualization.

```
   A --- B        B' --- A'
   |     |        |      |
   |     |   →    |      |
   C --- D        D' --- C'
```

### 2. Vertical Mirror Symmetry
States that are mirror images across a horizontal axis (flipped vertically) are positioned symmetrically.

```
   A --- B        C --- D
   |     |        |     |
   |     |   →    |     |
   C --- D        A --- B
```

### 3. 180° Rotational Symmetry
States that are rotations of each other are positioned symmetrically around a central point.

## How It Works

1. **Before Layout:**
   - Analyzes all states in the graph
   - Identifies mirror pairs and rotational symmetries
   - Groups them for enforcement

2. **During Layout:**
   - Every few iterations, symmetry constraints are applied
   - Symmetric nodes are adjusted to maintain proper relationships
   - Strength parameter controls how strictly symmetry is enforced

3. **Result:**
   - More structured, understandable layouts
   - Clearer visual patterns
   - Better representation of the puzzle's inherent symmetries

## Controls

- **Enforce Symmetries** checkbox: Toggle symmetry enforcement on/off
- **Symmetry Strength** slider: Control how strongly symmetries are enforced
  - Low values (0.1-0.3): Subtle symmetry influence
  - High values (0.7-1.0): Strong symmetry enforcement

## Tips for Best Results

1. **Start with symmetry off** for initial layout
2. **Enable symmetry** after the graph has spread out
3. **Adjust strength** based on graph size:
   - Smaller graphs: 0.5-0.7 works well
   - Larger graphs: 0.2-0.4 preserves more local structure

4. **Pair with your optimal parameters:**
   - Repulsion: 1.0
   - Attraction: 0.6
   - Dampening: 0.99
   - Distance Exponent: 1.5

## Technical Details

The system works by:

1. Creating mirrored/rotated versions of each state
2. Checking if these transformed states exist in the graph
3. Recording the pairs of symmetric states
4. During layout, computing the ideal symmetric positions
5. Gradually moving nodes toward these positions

## Examples of Improved Visualizations

- **Grid Puzzles:** Perfect grid layouts with clear symmetry
- **Standard Klotski:** Clearer representation of the solution paths
- **Custom Puzzles:** Better visualization of symmetric solution branches

Enjoy your symmetrical visualizations! 🔄
