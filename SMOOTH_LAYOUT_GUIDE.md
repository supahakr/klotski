# Smooth Layout Configuration Guide

## ✅ What's New

### 1. **Fixed Iterations Bar Clipping**
- Increased `collapsible-content` max-height from 1000px to 1500px
- Changed overflow to `visible` (only hidden when collapsed)
- Iterations slider now fully visible and goes up to 2000

### 2. **New Customizable Force Parameters**

#### **Distance Exponent** (0.5 - 4.0)
- Controls the power of distance in repulsion formula: `r^n`
- Default: 2.0 (quadratic falloff)
- **Lower (0.5-1.5)**: Slower distance falloff → longer-range forces
- **Higher (2.5-4.0)**: Faster distance falloff → shorter-range forces

#### **Force Constant** (0.1 - 10.0)
- Constant added to denominator: `1 / (r^n × 10 + constant)`
- Default: 2.0
- **Lower (0.1-1.0)**: Stronger forces overall
- **Higher (5.0-10.0)**: Weaker forces, softer repulsion

### 3. **Pre-configured Smooth Settings**

Your discovered optimal parameters are now the **defaults**:

```javascript
{
  repulsionScale: 5.0,      // High repulsion for spread
  attractionScale: 0.3,     // Low attraction allows spread
  dampening: 0.98,          // High dampening = smooth motion
  speedLimit: 5.0,          // Low speed = smooth, controlled movement
  distanceExponent: 2.0,    // Standard quadratic falloff
  forceConstant: 2.0,       // Moderate force strength
  iterations: 1000          // More iterations = smoother result
}
```

## 🎯 Tips for Smoothness

### For Smooth, Spread-Out Graphs:
1. **High Dampening** (0.95-0.99): Reduces oscillation
2. **Low Speed Limit** (3-10): Prevents jerky movement
3. **High Iterations** (1000-2000): Gives time to settle
4. **High Repulsion** (3-7): Pushes nodes apart
5. **Low Attraction** (0.1-0.5): Allows nodes to spread

### For Faster Convergence (Less Smooth):
1. **Lower Dampening** (0.7-0.85): Faster energy dissipation
2. **Higher Speed Limit** (15-30): Nodes move quickly
3. **Fewer Iterations** (200-500): Quick but rougher

### Experimenting with Force Law:

#### Distance Exponent Effects:
- **n = 1.0**: Linear falloff (gravity-like, very spread out)
- **n = 2.0**: Quadratic falloff (default, balanced)
- **n = 3.0**: Cubic falloff (tight clusters, short range)

#### Force Constant Effects:
- **c = 0.5**: Very strong forces (explosive spread)
- **c = 2.0**: Balanced (default)
- **c = 5.0**: Gentle forces (compact layout)

## 📊 Example Configurations

### "Crystal Clear" (Maximum Smoothness)
```
Repulsion: 5.0
Attraction: 0.2
Speed Limit: 3.0
Dampening: 0.99
Exponent: 2.0
Constant: 2.0
Iterations: 2000
```

### "Quick & Clean" (Fast but Smooth)
```
Repulsion: 4.0
Attraction: 0.4
Speed Limit: 8.0
Dampening: 0.90
Exponent: 2.0
Constant: 2.0
Iterations: 800
```

### "Gravity-Like Spread"
```
Repulsion: 6.0
Attraction: 0.3
Speed Limit: 5.0
Dampening: 0.98
Exponent: 1.0  ← Linear falloff
Constant: 1.0
Iterations: 1500
```

### "Tight Clusters"
```
Repulsion: 3.0
Attraction: 1.0
Speed Limit: 5.0
Dampening: 0.98
Exponent: 3.0  ← Cubic falloff
Constant: 3.0
Iterations: 1000
```

## 🔍 Understanding the Formula

The repulsion force between nodes is:

```
force = repulsionScale / (distance^exponent × 10 + constant)
```

- **distance**: Euclidean distance between nodes
- **exponent**: How quickly force decreases with distance
- **constant**: Baseline offset (prevents infinite forces at distance=0)
- **repulsionScale**: Overall strength multiplier

## 🚀 Quick Test

1. Open the app (starts with board editor)
2. Add 3-5 pieces in a simple configuration
3. Click "Apply and Generate"
4. Watch the smooth, spread-out layout appear!
5. Tweak sliders in real-time and click "Apply Parameters" to see changes

The layout should now be **smooth as butter**! 🧈

