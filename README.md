# Klotski State-Space Graph Visualization

An interactive 3D visualization of the Klotski sliding puzzle's complete state-space graph using Three.js and InstancedMesh for optimized rendering.

## What is Klotski?

Klotski is a classic sliding block puzzle where the goal is to move the large 2×2 block to the exit position at the bottom center of a 4×5 board. The puzzle has 10 blocks of varying sizes that can only slide (not rotate or lift).

## What is a State-Space Graph?

A state-space graph represents all possible configurations (states) of the puzzle as nodes, with edges connecting states that differ by a single legal move. This visualization shows:

- **Nodes**: Each unique puzzle configuration
- **Edges**: Legal moves between configurations
- **Initial State**: Red node (starting configuration)
- **Winning States**: Green nodes (configurations where the puzzle is solved)

## Features

### Optimized Rendering
- **InstancedMesh**: Uses Three.js InstancedMesh to efficiently render thousands of nodes
- **LineSegments**: Optimized edge rendering for smooth performance
- **Dynamic Fog**: Depth perception for large graphs

### Interactive Controls
- **Mouse Controls**: Orbit, zoom, and pan with mouse/trackpad
- **Node Selection**: Click nodes to view state details and board configuration
- **Hover Effects**: Real-time highlighting of nodes under cursor
- **Edge Highlighting**: Selected nodes show their connections in yellow
- **Board Visualization**: Visual 4×5 grid showing the actual block positions
- **Camera Reset**: Quick return to default view
- **Parameter Sliders**: Tweak all power-law repulsion parameters in real-time
  - Repulsion Exponent n (0 to 2) - Controls shape via 1/r^n force law
  - Repulsion Scale (0.1-5.0) - Uniform scaling, preserves shape
  - Edge Constraint (0.0-1.0) - Soft constraint for fixed edge length (3 units)
  - **Planarity Bias (0.0-2.0)** - NEW! Reduces curvature to create flatter grids
  - Dampening (0.5-0.98)
  - Iterations (50-500)
  - Initial Radius (50-300)
  - Sample Size (20-200)
  - Max Speed (1-20)
- **Custom Board Editor**: Create custom starting configurations
  - **Starts with blank board**
  - **Click buttons to add unlimited pieces** (Big 2×2, Vertical 1×2, Horizontal 2×1, Small 1×1)
  - Click pieces on board to remove them
  - Load default preset or clear all
  - Generate graphs from any valid board state
- **Improved Board State Display**: Smaller, dismissable panel
  - Click the ✕ to close
  - Compact grid visualization
  - Supports custom boards with many pieces

### Layout Algorithms

#### 1. Power-Law Repulsion (Default, Recommended)
- **Pure repulsion-based layout with power-law force: F = k/r^n**
- Fixed edge length constraint (3 units) - no attractive forces
- Adjustable exponent n controls force falloff and graph shape
- Repulsion scale k provides uniform scaling without changing shape
- Simulated annealing for gradual convergence
- Reveals natural topological structure through pure repulsion
- Allows exploration of different force laws (gravitational n=2, coulombic, etc.)

#### 2. Level-Based (BFS)
- Organizes nodes by their distance from the initial state
- Vertical layers represent move depth
- Spiral arrangement within each level
- Best for understanding solution paths and depth

### Visual Encoding
- 🔴 **Red**: Initial state
- 🔵 **Blue**: Normal states
- 🟢 **Green**: Winning states (goal configurations)
- 🟡 **Yellow**: Selected state
- 🟠 **Orange**: Hovered state

## Files

- `index.html` - Main HTML file with UI and Three.js setup
- `klotski.js` - Game logic and state-space generation
- `visualization.js` - 3D visualization and layout algorithms

## Usage

1. Open `index.html` in a modern web browser
2. Wait for the graph to generate (automatic on load)
3. Use mouse to explore:
   - **Left Click + Drag**: Rotate view
   - **Right Click + Drag**: Pan view
   - **Scroll**: Zoom in/out
4. **Click nodes** to:
   - Select and highlight the node (yellow)
   - Show connected edges (yellow lines)
   - Display the actual board state configuration
   - View state statistics
5. **Create custom board** (optional):
   - Click "Edit Starting Board" to open the board editor
   - Click pieces on the board to remove them
   - Use preset buttons for quick configurations
   - Click "Generate Graph from This Board" to explore that configuration's state space
6. **Adjust parameters** (Power-Law Repulsion):
   - Click "Power-Law Repulsion Parameters" to expand sliders
   - Drag sliders to adjust values in real-time
   - Click "Apply Parameters" to regenerate layout with new settings
   - Click "Reset to Default" to restore original values
7. **Experiment** to find optimal visualization:
   - **Repulsion Exponent (n)**: Lower (0.5-1.0) = more spread, Higher (1.5-2.0) = tighter clusters
   - **Repulsion Scale**: Adjust overall size without changing shape
   - **Edge Constraint**: Higher = stricter 3-unit edge length enforcement
   - **Planarity Bias**: Higher (1.0-2.0) = flatter grids/planes, prevents toroidal warping
   - More iterations = better convergence
   
### Tips for Grid-Like Structures:
- Set **Planarity Bias to 1.0-1.5** to flatten toroidal warping
- Use **Edge Constraint 0.5-0.8** for uniform edge lengths within clusters
- Try **n = 1.5** for balanced repulsion
- Increase **Iterations to 400-500** for clean convergence

## Technical Details

### State Space Size
The standard Klotski configuration has approximately **25,000-65,000 states** depending on the exact configuration used. This implementation generates all reachable states via breadth-first search.

### Performance
- InstancedMesh allows rendering 10,000+ nodes at 60 FPS
- Layout computation is optimized with sampling for force-directed algorithm
- Edge rendering uses single LineSegments geometry for efficiency

### Algorithms
- **BFS**: Guarantees finding all reachable states
- **Hash-based deduplication**: Efficient state comparison
- **Force-directed layout**: Iterative physics simulation
- **Level-based layout**: Mathematical positioning by BFS depth

## Browser Requirements

- Modern browser with WebGL support
- Recommended: Chrome, Firefox, Safari, or Edge (latest versions)

## Future Enhancements

Possible additions:
- Path highlighting to winning states
- Animation of state transitions
- Miniature board visualization for each state
- Different Klotski configurations
- Shortest path highlighting
- Community detection in state clusters

## Credits

Built with:
- [Three.js](https://threejs.org/) - 3D rendering
- Pure JavaScript - Game logic and algorithms

---

Enjoy exploring the mathematical beauty of Klotski's state space!

