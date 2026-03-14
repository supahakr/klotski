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