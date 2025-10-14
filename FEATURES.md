# Klotski Visualization Features

## Power-Law Repulsion Force

### Force Law: F = k / r^n

The visualization now uses a pure repulsion-based layout with **no attractive forces**. Instead, a soft constraint tries to keep edges near a fixed length of 3 units.

### Key Parameters:

1. **Repulsion Exponent (n)**: Range -3 to 2
   - Controls the shape of the force falloff
   - n = 2: Gravitational/Coulombic (inverse square law)
   - n = 1: Linear falloff
   - n < 1: Slower falloff, more spread
   - n > 2: Faster falloff, tighter clusters
   
2. **Repulsion Scale (k)**: Range 0.1 to 5.0
   - Uniform scaling factor
   - Does NOT change the shape - only scales everything uniformly
   - Higher values = larger overall graph
   
3. **Edge Constraint**: Range 0.0 to 1.0
   - Soft constraint strength for 3-unit edge length
   - Higher = edges more strictly kept at 3 units
   - Lower = edges allowed to stretch more between clusters
   
### Why This Approach?

This creates neat grids/planes with uniform edge lengths within clusters, but allows longer edges between clusters for better visibility of the overall structure. The power-law exponent lets you explore different physical analogies:

- **n = 2**: Gravity or electrostatic repulsion
- **n = 1**: Spring-like repulsion  
- **n = 0.5**: Square-root falloff
- **n < 0**: Attractive at distance, repulsive up close (exotic!)

## Custom Board Editor

Click "Edit Starting Board" to open an interactive editor where you can:

1. **Click pieces to remove them** from the current configuration
2. **Load presets**:
   - **Default Setup**: Standard Klotski starting position
   - **Clear Board**: Just the big red block
   - **Minimal Setup**: Red block + 2 vertical blocks + 2 small blocks
3. **Generate graphs** from any valid configuration

This lets you explore how different starting positions affect the state-space topology!

### Use Cases:
- Explore smaller state spaces (fewer pieces = fewer states)
- Test if certain configurations have more/less symmetry
- Find configurations with interesting topological properties
- Educational: show how adding pieces increases complexity

## Suggested Experiments

### For Grid-Like Clusters:
- Set **n = 1.5 to 2.0** (moderate falloff)
- Set **Edge Constraint = 0.5 to 0.8** (strong constraint)
- Set **Repulsion Scale = 1.0** initially
- Increase **Iterations to 400-500** for convergence

### For More Spread Out:
- Set **n = 0.5 to 1.0** (slow falloff)
- Set **Edge Constraint = 0.2 to 0.4** (weak, allows stretching)
- Set **Repulsion Scale = 2.0-3.0** (larger overall)

### For Tight Clusters:
- Set **n = 2.5 to 4.0** (fast falloff, but note: very high may cause instability)
- Set **Edge Constraint = 0.7 to 1.0** (very strict)
- Set **Repulsion Scale = 0.5 to 1.0** (compact)

## Technical Notes

### Edge Constraint vs Attraction
Unlike traditional spring-based layouts, this uses:
- **No attractive force** between connected nodes
- Only a **soft constraint** that activates when edges exceed 3 units
- This prevents runaway expansion while avoiding the "star cluster" appearance
- Clusters form naturally from repulsion equilibrium, not attraction

### Shape Preservation
The **Repulsion Scale** parameter is designed to scale uniformly:
- Multiplies the force by a constant
- Affects all nodes equally
- Changes size but preserves relative positions
- Like zooming in/out on the same structure

### Force Law Exponent
The exponent **n in 1/r^n** fundamentally changes topology:
- Low n → forces reach far → more connected, spread out
- High n → forces drop off fast → disconnected clusters
- Negative n → exotic behaviors (use with caution!)

