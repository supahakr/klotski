# CUDA Integration Quick Start

## Two Options for Better Layouts

### Option 1: Use Improved JavaScript (Already Done ✓)
The force calculations now exactly match your CUDA code:
- **Repulsion**: `norm / (r² × 10 + 2)`
- **Attraction**: 6th-power edge forces `(r⁶ - 1) / (r⁶ + 1) × 0.2 - 0.1`
- **Speed limiting**: Hard cap at 20 units
- **Dampening**: Velocity decay (0.85 default)

Try tweaking the sliders in the UI - especially **Repulsion Scale** and **Attraction Scale**.

### Option 2: Use Real CUDA (Best Results)

#### Step 1: Export from Browser
1. Generate your Klotski graph in the browser
2. Click **"Export for CUDA"** button
3. Save `klotski_graph.json`

#### Step 2: Run CUDA Layout
```bash
# See CUDA_INTEGRATION.md for full C++ bridge code
g++ -o klotski_cuda_bridge klotski_cuda_bridge.cpp force.cu \
    -I/usr/local/cuda/include -L/usr/local/cuda/lib64 -lcudart

./klotski_cuda_bridge klotski_graph.json
# Creates: klotski_layout.json
```

#### Step 3: Import to Browser
1. In browser, click **"Import CUDA Layout"**
2. Select `klotski_layout.json`
3. Layout is applied instantly!

## Troubleshooting

**JavaScript layout looks clumped?**
- Increase **Repulsion Scale** (try 2.0-5.0)
- Increase **Iterations** (try 500-1000)
- Decrease **Dampening** (try 0.7-0.8 for faster convergence)
- Increase **Initial Radius** (try 200-300 for more spread)

**CUDA export not working?**
- Make sure you've generated a graph first
- Check browser console for errors

**Import not updating layout?**
- Ensure the JSON has matching `num_nodes` count
- Check that graph was generated before importing

## File Format

Export JSON structure:
```json
{
  "num_nodes": 1234,
  "max_degree": 8,
  "positions": [x0,y0,z0,w0, x1,y1,z1,w1, ...],
  "velocities": [vx0,vy0,vz0,vw0, ...],
  "adjacency_matrix": [n1,n2,n3,-1,-1,-1,-1,-1, ...],
  "mirrors": [-1,-1,-1,...],
  "mirror2s": [-1,-1,-1,...],
  "params": {
    "attract": 1.0,
    "repel": 1.0,
    "decay": 0.85,
    "iterations": 300,
    "dimension": 3,
    "mirror_force": 0.0
  }
}
```

Import JSON structure:
```json
{
  "num_nodes": 1234,
  "positions": [x0,y0,z0, x1,y1,z1, ...]
}
```

