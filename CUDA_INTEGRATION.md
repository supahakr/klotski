# CUDA Integration Guide

This guide explains how to integrate our Klotski visualization with your existing CUDA force-directed layout code.

## Option A: Export Data to CUDA, Import Results

### Step 1: Export Graph Data

Add this function to `index.html`:

```javascript
function exportGraphForCUDA() {
    if (!currentGraph) {
        console.log('No graph generated yet');
        return;
    }
    
    const nodeCount = currentGraph.getStateCount();
    
    // Build adjacency list
    const adjacency = [];
    let maxDegree = 0;
    const neighbors = new Array(nodeCount).fill(0).map(() => []);
    
    for (const edge of currentGraph.edges) {
        neighbors[edge.from].push(edge.to);
        neighbors[edge.to].push(edge.from);
        maxDegree = Math.max(maxDegree, neighbors[edge.from].length, neighbors[edge.to].length);
    }
    
    // Create fixed-size adjacency matrix (padded with -1)
    const adjacencyMatrix = [];
    for (let i = 0; i < nodeCount; i++) {
        const row = [...neighbors[i]];
        while (row.length < maxDegree) {
            row.push(-1);
        }
        adjacencyMatrix.push(...row);
    }
    
    // Initial positions (random sphere)
    const positions = [];
    const velocities = [];
    for (let i = 0; i < nodeCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 125;
        positions.push(
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.sin(phi) * Math.sin(theta),
            r * Math.cos(phi),
            0
        );
        velocities.push(0, 0, 0, 0);
    }
    
    // Export as JSON
    const exportData = {
        num_nodes: nodeCount,
        max_degree: maxDegree,
        positions: positions,
        velocities: velocities,
        adjacency_matrix: adjacencyMatrix,
        mirrors: new Array(nodeCount).fill(-1),  // No mirroring for Klotski
        mirror2s: new Array(nodeCount).fill(-1),
        params: {
            attract: layoutParams.attractionScale,
            repel: layoutParams.repulsionScale,
            decay: layoutParams.dampening,
            iterations: layoutParams.iterations,
            dimension: 3
        }
    };
    
    // Download as JSON
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'klotski_graph.json';
    a.click();
    
    console.log('Exported graph data:', exportData);
}
```

### Step 2: Create C++ Bridge Program

Create `klotski_cuda_bridge.cpp`:

```cpp
#include <iostream>
#include <fstream>
#include <vector>
#include <glm/glm.hpp>
#include "json.hpp"  // nlohmann/json

using json = nlohmann::json;

extern "C" void compute_repulsion_cuda(
    glm::vec4* h_positions, 
    glm::vec4* h_velocities, 
    const int* h_adjacency_matrix, 
    const int* h_mirrors, 
    const int* h_mirror2s, 
    int num_nodes, 
    int max_degree, 
    float attract, 
    float repel, 
    float mirror_force, 
    float decay, 
    float dimension, 
    int iterations
);

int main(int argc, char** argv) {
    if (argc < 2) {
        std::cerr << "Usage: " << argv[0] << " <input.json>" << std::endl;
        return 1;
    }
    
    // Read JSON
    std::ifstream input(argv[1]);
    json data;
    input >> data;
    
    int num_nodes = data["num_nodes"];
    int max_degree = data["max_degree"];
    
    // Convert to glm::vec4 arrays
    std::vector<glm::vec4> positions(num_nodes);
    std::vector<glm::vec4> velocities(num_nodes);
    
    for (int i = 0; i < num_nodes; i++) {
        positions[i] = glm::vec4(
            data["positions"][i*4 + 0],
            data["positions"][i*4 + 1],
            data["positions"][i*4 + 2],
            data["positions"][i*4 + 3]
        );
        velocities[i] = glm::vec4(
            data["velocities"][i*4 + 0],
            data["velocities"][i*4 + 1],
            data["velocities"][i*4 + 2],
            data["velocities"][i*4 + 3]
        );
    }
    
    std::vector<int> adjacency_matrix = data["adjacency_matrix"].get<std::vector<int>>();
    std::vector<int> mirrors = data["mirrors"].get<std::vector<int>>();
    std::vector<int> mirror2s = data["mirror2s"].get<std::vector<int>>();
    
    float attract = data["params"]["attract"];
    float repel = data["params"]["repel"];
    float decay = data["params"]["decay"];
    int iterations = data["params"]["iterations"];
    int dimension = data["params"]["dimension"];
    
    std::cout << "Running CUDA layout for " << num_nodes << " nodes..." << std::endl;
    
    // Run CUDA
    compute_repulsion_cuda(
        positions.data(),
        velocities.data(),
        adjacency_matrix.data(),
        mirrors.data(),
        mirror2s.data(),
        num_nodes,
        max_degree,
        attract,
        repel,
        0.0f,  // mirror_force
        decay,
        dimension,
        iterations
    );
    
    // Export results
    json output;
    output["num_nodes"] = num_nodes;
    output["positions"] = std::vector<float>();
    for (const auto& p : positions) {
        output["positions"].push_back(p.x);
        output["positions"].push_back(p.y);
        output["positions"].push_back(p.z);
    }
    
    std::ofstream out("klotski_layout.json");
    out << output.dump(2);
    
    std::cout << "Layout saved to klotski_layout.json" << std::endl;
    
    return 0;
}
```

### Step 3: Import Results

Add to `index.html`:

```javascript
function importCUDALayout() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            const data = JSON.parse(event.target.result);
            const positions = new Float32Array(data.positions);
            
            // Apply to visualizer
            if (visualizer && currentGraph) {
                visualizer.positions = positions;
                visualizer.updateNodePositions();
                console.log('CUDA layout imported!');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}
```

## Option B: Call CUDA via WebAssembly

For real-time integration, compile your CUDA code to WebAssembly using:
1. Emscripten + WebGPU as CUDA backend
2. Or use WebGPU compute shaders (similar to CUDA)

## Build Instructions

```bash
# Compile bridge program
g++ -o klotski_cuda_bridge klotski_cuda_bridge.cpp force.cu -I/usr/local/cuda/include -L/usr/local/cuda/lib64 -lcudart -lglm

# Run
./klotski_cuda_bridge klotski_graph.json
```

## Usage Flow

1. In browser: Generate graph → Export via "Export for CUDA" button
2. Command line: `./klotski_cuda_bridge klotski_graph.json`
3. In browser: Import via "Import CUDA Layout" button

