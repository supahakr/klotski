// 3D Graph Visualization using Three.js

class GraphLayout {
    // Generate 3D positions using CUDA-style forces
    static forceDirected(graph, params = {}) {
        // Default parameters (matching CUDA implementation)
        const {
            iterations = 1000,
            repulsionScale = 10.0,    // Scaling factor for repulsion
            attractionScale = 0.3,    // Scaling factor for edge attraction
            dampening = 0.99,         // Velocity decay (like CUDA's decay)
            speedLimit = 5.0,         // Hard speed limit (from CUDA)
            distanceExponent = 2.0,   // Power of distance in repulsion formula
            forceConstant = 2.0,      // Constant added to denominator
            initialRadius = 200,
            sampleSize = 150
        } = params;

        const nodeCount = graph.getStateCount();
        const positions = new Float32Array(nodeCount * 3);
        const velocities = new Float32Array(nodeCount * 3);

        // Initialize in larger sphere to start more spread out
        for (let i = 0; i < nodeCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = initialRadius * (0.8 + Math.random() * 0.4);
            
            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);
        }

        console.log(`Computing layout with exponent=${distanceExponent}, constant=${forceConstant}...`);
        
        // Detect symmetries once before layout
        let symmetries = null;
        const useSymmetry = params.enforceSymmetry !== false;
        if (useSymmetry && typeof SymmetryDetector !== 'undefined') {
            symmetries = SymmetryDetector.detectAllSymmetries(graph);
        }

        for (let iter = 0; iter < iterations; iter++) {
            // Step 1: Repulsion forces (CUDA naive kernel style)
            // Reset velocity deltas for this iteration
            const deltaV = new Float32Array(nodeCount * 3);
            
            for (let i = 0; i < nodeCount; i++) {
                let deltax = 0, deltay = 0, deltaz = 0;
                
                // Sample random nodes for repulsion (CUDA samples all in naive, we sample for speed)
                const actualSampleSize = Math.min(sampleSize, nodeCount);
                for (let j = 0; j < actualSampleSize; j++) {
                    const k = Math.floor(Math.random() * nodeCount);
                    if (i === k) continue;

                    const dx = positions[i * 3] - positions[k * 3];
                    const dy = positions[i * 3 + 1] - positions[k * 3 + 1];
                    const dz = positions[i * 3 + 2] - positions[k * 3 + 2];
                    const distSq = dx * dx + dy * dy + dz * dz + 1.0;
                    const dist = Math.sqrt(distSq);
                    
                    // Customizable repulsion formula: 1 / (dist^exponent * 10 + constant)
                    const force = 1.0 / (Math.pow(dist, distanceExponent) * 10.0 + forceConstant);
                    const nx = dx / dist;
                    const ny = dy / dist;
                    const nz = dz / dist;
                    
                    deltax += nx * force;
                    deltay += ny * force;
                    deltaz += nz * force;
                }
                
                velocities[i * 3] += deltax * repulsionScale;
                velocities[i * 3 + 1] += deltay * repulsionScale;
                velocities[i * 3 + 2] += deltaz * repulsionScale;
            }

            // Step 2: Attraction forces (CUDA mirror_kernel style with adjacency)
            // Build neighbor map from edges
            const neighbors = new Array(nodeCount).fill(0).map(() => []);
            for (const edge of graph.edges) {
                neighbors[edge.from].push(edge.to);
                neighbors[edge.to].push(edge.from);
            }
            
            for (let i = 0; i < nodeCount; i++) {
                let deltax = 0, deltay = 0, deltaz = 0;
                
                for (const j of neighbors[i]) {
                    const dx = positions[i * 3] - positions[j * 3];
                    const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
                    const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
                    const distSq = dx * dx + dy * dy + dz * dz + 1.0;
                    
                    // CUDA get_attraction_force
                    const dist6th = distSq * distSq * distSq * 0.05;
                    const attractForce = (dist6th - 1.0) / (dist6th + 1.0) * 0.2 - 0.1;
                    
                    deltax += dx * attractForce;
                    deltay += dy * attractForce;
                    deltaz += dz * attractForce;
                }
                
                velocities[i * 3] -= deltax * attractionScale;
                velocities[i * 3 + 1] -= deltay * attractionScale;
                velocities[i * 3 + 2] -= deltaz * attractionScale;
            }

            // Apply dampening, speed limit, and update positions (CUDA-style)
            for (let i = 0; i < nodeCount; i++) {
                // Check for NaN and reset if needed
                if (isNaN(velocities[i * 3]) || isNaN(velocities[i * 3 + 1]) || isNaN(velocities[i * 3 + 2])) {
                    velocities[i * 3] = 0;
                    velocities[i * 3 + 1] = 0;
                    velocities[i * 3 + 2] = 0;
                }
                
                // Hard speed limit (CUDA-style)
                const vx = velocities[i * 3];
                const vy = velocities[i * 3 + 1];
                const vz = velocities[i * 3 + 2];
                const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
                
                if (speed > speedLimit) {
                    const scale = speedLimit / speed;
                    velocities[i * 3] *= scale;
                    velocities[i * 3 + 1] *= scale;
                    velocities[i * 3 + 2] *= scale;
                }
                
                // Apply dampening
                velocities[i * 3] *= dampening;
                velocities[i * 3 + 1] *= dampening;
                velocities[i * 3 + 2] *= dampening;
                
                // Update positions
                positions[i * 3] += velocities[i * 3];
                positions[i * 3 + 1] += velocities[i * 3 + 1];
                positions[i * 3 + 2] += velocities[i * 3 + 2];
            }
            
            // Enforce symmetries every few iterations
            if (symmetries && symmetries.all.length > 0 && iter % 5 === 0) {
                const symmetryStrength = params.symmetryStrength || 0.3;
                if (typeof SymmetricLayout !== 'undefined') {
                    SymmetricLayout.enforceAllSymmetries(positions, symmetries, symmetryStrength);
                }
            }

            if (iter % 25 === 0) {
                console.log(`Layout iteration ${iter}/${iterations}`);
            }
        }

        console.log('CUDA-style layout complete!');
        return positions;
    }

    // Generate level-based layout (BFS levels)
    static levelBased(graph) {
        const nodeCount = graph.getStateCount();
        const positions = new Float32Array(nodeCount * 3);
        const levels = graph.calculateLevels();
        
        const maxLevel = Math.max(...levels);
        const nodesPerLevel = new Array(maxLevel + 1).fill(0).map(() => []);
        
        // Group nodes by level
        for (let i = 0; i < nodeCount; i++) {
            nodesPerLevel[levels[i]].push(i);
        }

        console.log('Computing level-based layout...');
        console.log(`Max depth: ${maxLevel} levels`);

        // Position nodes
        const levelSpacing = 30;
        for (let level = 0; level <= maxLevel; level++) {
            const nodes = nodesPerLevel[level];
            const count = nodes.length;
            const radius = Math.max(20, Math.sqrt(count) * 5);

            for (let i = 0; i < count; i++) {
                const nodeId = nodes[i];
                const angle = (i / count) * Math.PI * 2;
                
                // Spiral pattern
                const spiralRadius = radius * Math.sqrt(i / count);
                
                positions[nodeId * 3] = Math.cos(angle) * spiralRadius;
                positions[nodeId * 3 + 1] = level * levelSpacing - (maxLevel * levelSpacing) / 2;
                positions[nodeId * 3 + 2] = Math.sin(angle) * spiralRadius;
            }
        }

        return positions;
    }
}

class GraphVisualizer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.graph = null;
        this.positions = null;
        
        this.initScene();
        this.initLights();
        this.initControls();
        this.setupEventListeners();
        
        this.nodeInstancedMesh = null;
        this.edgeLines = null;
        this.highlightedEdges = null;
        
        this.selectedNode = -1;
        this.hoveredNode = -1;
        this.showAllNodes = false; // Toggle for showing all nodes
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);
        this.scene.fog = new THREE.Fog(0x0a0a0a, 200, 800);

        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(150, 150, 250);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);
    }

    initLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight1.position.set(10, 10, 5);
        this.scene.add(directionalLight1);

        const directionalLight2 = new THREE.DirectionalLight(0x8888ff, 0.3);
        directionalLight2.position.set(-10, -5, -5);
        this.scene.add(directionalLight2);
    }

    initControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 20;
        this.controls.maxDistance = 1000;
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize(), false);
        this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e), false);
        this.renderer.domElement.addEventListener('click', (e) => this.onClick(e), false);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onMouseMove(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    onClick(event) {
        if (this.hoveredNode >= 0) {
            // Clicking on a node - select it
            this.selectedNode = this.hoveredNode;
            this.updateNodeColors();
            this.highlightConnectedEdges(this.selectedNode);
            this.displayStateInfo(this.selectedNode);
            this.displayBoardState(this.selectedNode);
        } else {
            // Clicking on background - deselect
            this.selectedNode = -1;
            this.updateNodeColors();
            
            // Clear highlighted edges
            if (this.highlightedEdges) {
                this.scene.remove(this.highlightedEdges);
                this.highlightedEdges.geometry.dispose();
                this.highlightedEdges.material.dispose();
                this.highlightedEdges = null;
            }
            
            // Hide board state panel
            const boardElement = document.getElementById('boardState');
            if (boardElement) {
                boardElement.classList.add('hidden');
            }
        }
    }

    highlightConnectedEdges(nodeId) {
        if (!this.edgeLines || nodeId < 0) return;

        // Get the hash and neighbors for the selected node
        const state = this.graph.getStateById(nodeId);
        const hash = state.getHash(this.graph.treatShapesAsUnique);
        const stateData = this.graph.states.get(hash);
        const neighbors = stateData ? stateData.neighbors : [];

        // Create highlighted edges for connected nodes
        if (this.highlightedEdges) {
            this.scene.remove(this.highlightedEdges);
            this.highlightedEdges.geometry.dispose();
            this.highlightedEdges.material.dispose();
        }

        const positions = [];
        for (const neighborId of neighbors) {
            positions.push(
                this.positions[nodeId * 3],
                this.positions[nodeId * 3 + 1],
                this.positions[nodeId * 3 + 2]
            );
            positions.push(
                this.positions[neighborId * 3],
                this.positions[neighborId * 3 + 1],
                this.positions[neighborId * 3 + 2]
            );
        }

        if (positions.length > 0) {
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            
            const material = new THREE.LineBasicMaterial({
                color: 0xffffff,
                opacity: 1.0,
                transparent: false,
                linewidth: 2
            });
            
            this.highlightedEdges = new THREE.LineSegments(geometry, material);
            this.scene.add(this.highlightedEdges);
        }
    }

    visualizeGraph(graph, layoutType = 'force', params = null) {
        this.graph = graph;
        
        // Clear existing visualization
        if (this.nodeInstancedMesh) {
            this.scene.remove(this.nodeInstancedMesh);
            this.nodeInstancedMesh.geometry.dispose();
            this.nodeInstancedMesh.material.dispose();
            this.nodeInstancedMesh = null;
        }
        if (this.edgeLines) {
            this.scene.remove(this.edgeLines);
            this.edgeLines.geometry.dispose();
            this.edgeLines.material.dispose();
            this.edgeLines = null;
        }
        if (this.highlightedEdges) {
            this.scene.remove(this.highlightedEdges);
            this.highlightedEdges.geometry.dispose();
            this.highlightedEdges.material.dispose();
            this.highlightedEdges = null;
        }
        
        this.selectedNode = -1;
        this.hoveredNode = -1;
        
        // Generate layout or use custom positions
        if (params instanceof Float32Array) {
            // If params is a Float32Array, it's custom positions
            console.log('Using custom positions array');
            this.positions = params;
        } else if (layoutType === 'force') {
            // Use global layoutParams if available, otherwise use defaults
            const layoutParameters = params || (typeof layoutParams !== 'undefined' ? layoutParams : {});
            this.positions = GraphLayout.forceDirected(graph, layoutParameters);
        } else if (layoutType === 'level') {
            this.positions = GraphLayout.levelBased(graph);
        } else if (layoutType === 'custom') {
            // Custom layout type with no positions provided
            console.log('Custom layout type but no positions provided, using force directed');
            const layoutParameters = params || (typeof layoutParams !== 'undefined' ? layoutParams : {});
            this.positions = GraphLayout.forceDirected(graph, layoutParameters);
        }

        this.createNodes();
        this.createEdges();
        this.updateStats();
    }

    createNodes() {
        const nodeCount = this.graph.getStateCount();
        
        // Create instanced mesh for nodes (invisible but still clickable)
        const geometry = new THREE.SphereGeometry(1.2, 16, 16);
        const material = new THREE.MeshPhongMaterial({
            color: 0x4488ff,
            emissive: 0x112244,
            shininess: 30,
            transparent: true,
            opacity: 0
        });

        this.nodeInstancedMesh = new THREE.InstancedMesh(geometry, material, nodeCount);
        this.nodeInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        
        const matrix = new THREE.Matrix4();
        const color = new THREE.Color();
        
        for (let i = 0; i < nodeCount; i++) {
            const x = this.positions[i * 3];
            const y = this.positions[i * 3 + 1];
            const z = this.positions[i * 3 + 2];
            
            matrix.setPosition(x, y, z);
            this.nodeInstancedMesh.setMatrixAt(i, matrix);
            
            // Color winning states differently
            const state = this.graph.getStateById(i);
            if (state.isWinning()) {
                color.setHex(0x00ff00);
            } else if (i === 0) {
                color.setHex(0xff4444); // Initial state
            } else {
                color.setHex(0x4488ff);
            }
            this.nodeInstancedMesh.setColorAt(i, color);
        }
        
        this.nodeInstancedMesh.instanceMatrix.needsUpdate = true;
        if (this.nodeInstancedMesh.instanceColor) {
            this.nodeInstancedMesh.instanceColor.needsUpdate = true;
        }
        
        this.scene.add(this.nodeInstancedMesh);
        
        console.log(`Created ${nodeCount} nodes using InstancedMesh`);
    }

    createEdges() {
        // Create lines for edges (use LineSegments for performance)
        const positions = [];
        
        for (const edge of this.graph.edges) {
            const fromX = this.positions[edge.from * 3];
            const fromY = this.positions[edge.from * 3 + 1];
            const fromZ = this.positions[edge.from * 3 + 2];
            
            const toX = this.positions[edge.to * 3];
            const toY = this.positions[edge.to * 3 + 1];
            const toZ = this.positions[edge.to * 3 + 2];
            
            positions.push(fromX, fromY, fromZ);
            positions.push(toX, toY, toZ);
        }
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        
        const material = new THREE.LineBasicMaterial({
            color: 0xffffff,
            opacity: 1.0,
            transparent: false
        });
        
        this.edgeLines = new THREE.LineSegments(geometry, material);
        this.scene.add(this.edgeLines);
        
        console.log(`Created ${this.graph.edges.length} edges`);
    }

    setShowAllNodes(show) {
        this.showAllNodes = show;
        this.updateNodeColors();
    }

    updateNodeColors() {
        if (!this.nodeInstancedMesh) return;

        const color = new THREE.Color();
        const matrix = new THREE.Matrix4();
        const nodeCount = this.graph.getStateCount();

        for (let i = 0; i < nodeCount; i++) {
            const state = this.graph.getStateById(i);
            
            // Get current position
            const x = this.positions[i * 3];
            const y = this.positions[i * 3 + 1];
            const z = this.positions[i * 3 + 2];
            
            let scale = 1.2; // Keep normal size for raycasting
            
            if (i === this.selectedNode) {
                color.setHex(0xff0000); // Red for selected (reverted)
                // Calculate scale based on distance to camera for constant screen size
                const dx = x - this.camera.position.x;
                const dy = y - this.camera.position.y;
                const dz = z - this.camera.position.z;
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                scale = distance * 0.01; // Smaller constant screen size
            } else if (i === this.hoveredNode) {
                color.setHex(0xff8800); // Orange for hovered
                scale = 1.4;
            } else if (state.isWinning()) {
                color.setHex(0x00ff00); // Green for winning
            } else if (i === 0) {
                color.setHex(0xff4444); // Red for initial
            } else {
                color.setHex(0x4488ff); // Blue for normal
            }
            
            matrix.makeScale(scale, scale, scale);
            matrix.setPosition(x, y, z);
            this.nodeInstancedMesh.setMatrixAt(i, matrix);
            this.nodeInstancedMesh.setColorAt(i, color);
        }
        
        // Update opacity based on toggle and selection
        if (this.showAllNodes) {
            // Show all nodes when toggle is on
            this.nodeInstancedMesh.material.opacity = 1.0;
        } else {
            // Only show selected/hovered nodes when toggle is off
            if (this.selectedNode >= 0 || this.hoveredNode >= 0) {
                this.nodeInstancedMesh.material.opacity = 1.0;
            } else {
                this.nodeInstancedMesh.material.opacity = 0;
            }
        }
        
        this.nodeInstancedMesh.instanceMatrix.needsUpdate = true;
        this.nodeInstancedMesh.instanceColor.needsUpdate = true;
    }

    updateNodePositions() {
        if (!this.nodeInstancedMesh || !this.positions) return;

        const matrix = new THREE.Matrix4();
        const nodeCount = this.graph.getStateCount();

        // Update instance matrices with new positions
        for (let i = 0; i < nodeCount; i++) {
            const x = this.positions[i * 3];
            const y = this.positions[i * 3 + 1];
            const z = this.positions[i * 3 + 2];
            
            let scale = 1.2; // Default size
            
            // Apply special scaling for selected/hovered nodes
            if (i === this.selectedNode) {
                const dx = x - this.camera.position.x;
                const dy = y - this.camera.position.y;
                const dz = z - this.camera.position.z;
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                scale = distance * 0.01;
            } else if (i === this.hoveredNode) {
                scale = 1.4;
            }
            
            matrix.makeScale(scale, scale, scale);
            matrix.setPosition(x, y, z);
            this.nodeInstancedMesh.setMatrixAt(i, matrix);
        }
        
        this.nodeInstancedMesh.instanceMatrix.needsUpdate = true;
        
        // Update edges
        if (this.edgeLines) {
            const edgePositions = this.edgeLines.geometry.attributes.position.array;
            for (let i = 0; i < this.graph.edges.length; i++) {
                const edge = this.graph.edges[i];
                const idx = i * 6;
                
                edgePositions[idx] = this.positions[edge.from * 3];
                edgePositions[idx + 1] = this.positions[edge.from * 3 + 1];
                edgePositions[idx + 2] = this.positions[edge.from * 3 + 2];
                
                edgePositions[idx + 3] = this.positions[edge.to * 3];
                edgePositions[idx + 4] = this.positions[edge.to * 3 + 1];
                edgePositions[idx + 5] = this.positions[edge.to * 3 + 2];
            }
            this.edgeLines.geometry.attributes.position.needsUpdate = true;
        }
        
        console.log('Node positions updated from CUDA layout');
    }

    updateStats() {
        const statsElement = document.getElementById('stats');
        if (statsElement) {
            statsElement.innerHTML = `
                <strong>Graph Statistics</strong><br>
                States: ${this.graph.getStateCount()}<br>
                Transitions: ${this.graph.getEdgeCount()}<br>
                Avg. degree: ${(this.graph.getEdgeCount() * 2 / this.graph.getStateCount()).toFixed(2)}
            `;
        }
    }

    displayStateInfo(nodeId) {
        const infoElement = document.getElementById('stateInfo');
        if (!infoElement || nodeId < 0) return;

        const state = this.graph.getStateById(nodeId);
        const hash = state.getHash(this.graph.treatShapesAsUnique);
        const stateData = this.graph.states.get(hash);
        
        let html = `
            <strong>State #${nodeId}</strong><br>
            Neighbors: ${stateData.neighbors.length}<br>
            ${state.isWinning() ? '<span style="color: #00ff00;">★ WINNING STATE ★</span><br>' : ''}
            ${nodeId === 0 ? '<span style="color: #ff4444;">★ INITIAL STATE ★</span><br>' : ''}
            <br>
            <em>Click to view board state →</em>
        `;
        
        infoElement.innerHTML = html;
    }

    displayBoardState(nodeId) {
        const boardElement = document.getElementById('boardState');
        const contentElement = document.getElementById('boardStateContent');
        if (!boardElement || !contentElement || nodeId < 0) return;

        const state = this.graph.getStateById(nodeId);
        
        // Show the panel
        boardElement.classList.remove('hidden');
        
        // Use actual board dimensions
        const boardWidth = state.width || 4;
        const boardHeight = state.height || 5;
        
        // Get normalized shape signature for consistent coloring
        const getShapeSignature = (block) => {
            if (block.cells) {
                // Custom shape: normalize to origin and sort
                const cells = block.cells.map(([dx, dy, dz = 0]) => [dx, dy, dz]);
                const minX = Math.min(...cells.map(c => c[0]));
                const minY = Math.min(...cells.map(c => c[1]));
                const minZ = Math.min(...cells.map(c => c[2]));
                const normalized = cells.map(([x, y, z]) => [x - minX, y - minY, z - minZ]);
                normalized.sort((a, b) => {
                    if (a[2] !== b[2]) return a[2] - b[2];
                    if (a[1] !== b[1]) return a[1] - b[1];
                    return a[0] - b[0];
                });
                return `custom:${normalized.map(c => c.join(',')).join(';')}`;
            } else {
                // Rectangle: use width x height x depth
                const depth = block.depth || 1;
                return state.is3D ? `rect:${block.width}x${block.height}x${depth}` : `rect:${block.width}x${block.height}`;
            }
        };

        // Color selection for blocks
        const getColorByShape = (block, usePerId = false) => {
            if (!block) return '#1a1a2e';
            if (usePerId) {
                const hue = ((block.id || 0) * 137.5) % 360;
                return `hsl(${hue}, 70%, 55%)`;
            }
            const signature = getShapeSignature(block);
            // Fixed colors for standard rectangles (default Klotski colors)
            const standardColors = {
                'rect:2x2': '#ff4444',
                'rect:2x2x1': '#ff4444',
                'rect:1x2': '#4488ff',
                'rect:1x2x1': '#4488ff',
                'rect:2x1': '#44ff44',
                'rect:2x1x1': '#44ff44',
                'rect:1x1': '#ffaa00',
                'rect:1x1x1': '#ffaa00'
            };
            if (standardColors[signature]) return standardColors[signature];
            // Hash-based hue for custom shapes
            let hash = 0;
            for (let i = 0; i < signature.length; i++) {
                hash = ((hash << 5) - hash) + signature.charCodeAt(i);
                hash = hash & hash;
            }
            const baseHue = (Math.abs(hash) * 137.5) % 360;
            const avoidRanges = [
                {center: 0, width: 15},
                {center: 35, width: 10},
                {center: 120, width: 15},
                {center: 225, width: 15}
            ];
            let adjustedHue = baseHue;
            for (const {center, width} of avoidRanges) {
                const distance = Math.min(
                    Math.abs(adjustedHue - center),
                    360 - Math.abs(adjustedHue - center)
                );
                if (distance < width) {
                    if (center === 0) adjustedHue = 300;
                    else if (center === 35) adjustedHue = 65;
                    else if (center === 120) adjustedHue = 170;
                    else if (center === 225) adjustedHue = 270;
                    break;
                }
            }
            return `hsl(${adjustedHue}, 70%, 55%)`;
        };

        // Helper function to create a board for a specific layer
        const createLayerBoard = (state, boardWidth, boardHeight, layerZ, currentNodeId) => {
            const boardContainer = document.createElement('div');
            boardContainer.style.cssText = `position: relative; width: ${boardWidth * 27}px; height: ${boardHeight * 27}px; background: #0f0f1e; border-radius: 3px;`;
            
            // Track which cells are occupied by pieces (to not draw grid under them)
            const occupiedCells = new Set();
            
            // First pass: mark occupied cells
            for (const block of state.blocks) {
                const blockZ = block.z || 0;
                let blockDepth = block.depth || 1;
                
                // For custom shapes, calculate depth based on cell dz values
                if (block.cells) {
                    const maxDz = Math.max(...block.cells.map(c => c[2] || 0));
                    blockDepth = maxDz + 1; // Depth is max dz + 1 (since dz starts at 0)
                }
                
                // Check if this block occupies the current layer
                if (layerZ < blockZ || layerZ >= blockZ + blockDepth) {
                    continue; // Block doesn't occupy this layer
                }
                
                if (block.cells) {
                    // Custom shape: mark each cell
                    for (const [dx, dy, dz = 0] of block.cells) {
                        const cellZ = blockZ + dz;
                        if (cellZ === layerZ) {
                            occupiedCells.add(`${block.x + dx},${block.y + dy}`);
                        }
                    }
                } else {
                    // Rectangle: mark all cells
                    for (let dy = 0; dy < block.height; dy++) {
                        for (let dx = 0; dx < block.width; dx++) {
                            occupiedCells.add(`${block.x + dx},${block.y + dy}`);
                        }
                    }
                }
            }
            
            // Draw grid cells only where not occupied
            for (let y = 0; y < boardHeight; y++) {
                for (let x = 0; x < boardWidth; x++) {
                    if (!occupiedCells.has(`${x},${y}`)) {
                        const cell = document.createElement('div');
                        // Check if this cell is forbidden
                        const isForbidden = state.forbiddenCells && state.forbiddenCells.some(fc => 
                            fc.x === x && fc.y === y && fc.z === layerZ
                        );
                        
                        if (isForbidden) {
                            // Forbidden cell - blacked out
                            cell.style.cssText = `position: absolute; left: ${x * 27}px; top: ${y * 27}px; width: 25px; height: 25px; background: #000000; border: 1px solid #ff4444; border-radius: 2px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #ff4444;`;
                            cell.textContent = '🚫';
                        } else {
                            // Normal empty cell
                            cell.style.cssText = `position: absolute; left: ${x * 27}px; top: ${y * 27}px; width: 25px; height: 25px; background: #1a1a2e; border: 1px solid #2a2a3e; border-radius: 2px;`;
                        }
                        boardContainer.appendChild(cell);
                    }
                }
            }
            
            // Draw draggable pieces for this layer
            for (const block of state.blocks) {
                const blockZ = block.z || 0;
                let blockDepth = block.depth || 1;
                
                // For custom shapes, calculate depth based on cell dz values
                if (block.cells) {
                    const maxDz = Math.max(...block.cells.map(c => c[2] || 0));
                    blockDepth = maxDz + 1; // Depth is max dz + 1 (since dz starts at 0)
                }
                
                // Check if this block occupies the current layer
                if (layerZ < blockZ || layerZ >= blockZ + blockDepth) {
                    continue; // Skip blocks not in this layer
                }
                
                const color = getColorByShape(block, this.graph?.treatShapesAsUnique);
                
                // Handle custom shapes
                if (block.cells) {
                    // Filter cells for this layer
                    const cellsInLayer = block.cells.filter(([dx, dy, dz = 0]) => {
                        return blockZ + dz === layerZ;
                    });
                    
                    if (cellsInLayer.length === 0) continue; // No cells in this layer
                    
                    // Create a container div for the custom shape
                    const containerDiv = document.createElement('div');
                    containerDiv.style.position = 'absolute';
                    containerDiv.style.zIndex = '10';
                    containerDiv.style.cursor = 'move';
                    
                    // Calculate bounding box for cells in this layer
                    const minX = Math.min(...cellsInLayer.map(c => c[0]));
                    const maxX = Math.max(...cellsInLayer.map(c => c[0]));
                    const minY = Math.min(...cellsInLayer.map(c => c[1]));
                    const maxY = Math.max(...cellsInLayer.map(c => c[1]));
                    
                    containerDiv.style.left = ((block.x + minX) * 27) + 'px';
                    containerDiv.style.top = ((block.y + minY) * 27) + 'px';
                    containerDiv.style.width = ((maxX - minX + 1) * 27 - 2) + 'px';
                    containerDiv.style.height = ((maxY - minY + 1) * 27 - 2) + 'px';
                    
                    // Create SVG to draw the complex shape
                    const svgNS = 'http://www.w3.org/2000/svg';
                    const svg = document.createElementNS(svgNS, 'svg');
                    svg.setAttribute('width', '100%');
                    svg.setAttribute('height', '100%');
                    svg.style.display = 'block';
                    svg.style.pointerEvents = 'none'; // Let events pass through
                    
                    // Draw each cell as a solid filled rectangle (no grid lines)
                    cellsInLayer.forEach(([dx, dy]) => {
                        const rect = document.createElementNS(svgNS, 'rect');
                        rect.setAttribute('x', (dx - minX) * 27);
                        rect.setAttribute('y', (dy - minY) * 27);
                        rect.setAttribute('width', 25);
                        rect.setAttribute('height', 25);
                        rect.setAttribute('fill', color);
                        rect.setAttribute('stroke', 'rgba(0, 0, 0, 0.3)');
                        rect.setAttribute('stroke-width', '1');
                        rect.setAttribute('rx', '2');
                        svg.appendChild(rect);
                    });
                    
                    containerDiv.appendChild(svg);
                    
                    containerDiv.dataset.blockId = block.id;
                    containerDiv.dataset.customShape = 'true';
                    containerDiv.dataset.cells = JSON.stringify(block.cells);
                    if (state.is3D) {
                        containerDiv.dataset.blockZ = block.z || 0;
                    }
                    
                    containerDiv.style.userSelect = 'none';
                    
                    // Any part can drag the whole shape
                    this.makePieceDraggable(containerDiv, nodeId, boardWidth, boardHeight, state);
                    
                    boardContainer.appendChild(containerDiv);
                    continue; // Skip standard rendering
                }
                
                // Standard rectangular pieces
                // For 3D blocks with depth > 1, render as individual cells in each layer
                if (state.is3D && blockDepth > 1) {
                    // Render each cell of the block in each layer it occupies
                    for (let dz = 0; dz < blockDepth; dz++) {
                        const cellZ = blockZ + dz;
                        if (cellZ === layerZ) {
                            const piece = document.createElement('div');
                            const isBig = block.width === 2 && block.height === 2;
                            const border = isBig ? '2px solid #ffff00' : '1px solid #3a3a4e';
                            
                            // Full opacity for all layers when showing them separately
                            let opacity = 1.0;
                            
                            piece.style.cssText = `
                                position: absolute;
                                left: ${block.x * 27}px;
                                top: ${block.y * 27}px;
                                width: ${block.width * 27 - 2}px;
                                height: ${block.height * 27 - 2}px;
                                background: ${color};
                                border: ${border};
                                border-radius: 2px;
                                cursor: move;
                                z-index: 10;
                                user-select: none;
                                opacity: ${opacity};
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-size: 10px;
                                color: white;
                                font-weight: bold;
                            `;
                            
                            // Show star for big piece
                            if (isBig) {
                                piece.textContent = '★';
                            }
                            
                            piece.dataset.blockId = block.id;
                            piece.dataset.blockWidth = block.width;
                            piece.dataset.blockHeight = block.height;
                            piece.dataset.blockZ = cellZ;
                            piece.dataset.blockDepth = 1; // Each rendered cell is 1 layer deep
                            
                            // Add drag functionality
                            this.makePieceDraggable(piece, nodeId, boardWidth, boardHeight, state);
                            
                            // Add compound move indicator if this piece is part of compound moves
                            this.addCompoundMoveIndicator(piece, block, state);
                            
                            boardContainer.appendChild(piece);
                        }
                    }
                } else {
                    // 2D or single-layer 3D blocks - render as one piece
                    const piece = document.createElement('div');
                    const isBig = block.width === 2 && block.height === 2;
                    const border = isBig ? '2px solid #ffff00' : '1px solid #3a3a4e';
                    
                    // Full opacity for all layers when showing them separately
                    let opacity = 1.0;
                    
                    piece.style.cssText = `
                        position: absolute;
                        left: ${block.x * 27}px;
                        top: ${block.y * 27}px;
                        width: ${block.width * 27 - 2}px;
                        height: ${block.height * 27 - 2}px;
                        background: ${color};
                        border: ${border};
                        border-radius: 2px;
                        cursor: move;
                        z-index: 10;
                        user-select: none;
                        opacity: ${opacity};
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 10px;
                        color: white;
                        font-weight: bold;
                    `;
                    
                    // Show star for big piece
                    if (isBig) {
                        piece.textContent = '★';
                    }
                    
                    piece.dataset.blockId = block.id;
                    piece.dataset.blockWidth = block.width;
                    piece.dataset.blockHeight = block.height;
                    if (state.is3D) {
                        piece.dataset.blockZ = block.z || 0;
                        piece.dataset.blockDepth = block.depth || 1;
                    }
                    
                    // Add drag functionality
                    this.makePieceDraggable(piece, nodeId, boardWidth, boardHeight, state);
                    
                    // Add compound move indicator if this piece is part of compound moves
                    this.addCompoundMoveIndicator(piece, block, state);
                    
                    boardContainer.appendChild(piece);
                }
            }
            
            return boardContainer;
        };
        
        // Clear and create board container
        contentElement.innerHTML = '';
        
        const container = document.createElement('div');
        container.style.cssText = 'display: inline-block; background: #1a1a2e; padding: 8px; border-radius: 5px;';
        
        // For 3D, show layers vertically stacked with scrolling
        if (state.is3D && state.depth > 1) {
            container.style.cssText = 'display: flex; flex-direction: column; gap: 10px; background: #1a1a2e; padding: 8px; border-radius: 5px; max-height: 80vh; overflow-y: auto;';
            
            // Create a board for each layer
            for (let z = 0; z < state.depth; z++) {
                const layerContainer = document.createElement('div');
                layerContainer.style.cssText = 'display: flex; flex-direction: column; align-items: center;';
                
                const layerLabel = document.createElement('div');
                layerLabel.style.cssText = 'color: #4488ff; font-size: 11px; margin-bottom: 4px; font-weight: bold;';
                layerLabel.textContent = `Layer ${z}`;
                layerContainer.appendChild(layerLabel);
                
                const boardContainer = createLayerBoard(state, boardWidth, boardHeight, z, nodeId);
                layerContainer.appendChild(boardContainer);
                container.appendChild(layerContainer);
            }
        } else {
            // 2D board or single layer - show all pieces
            const boardContainer = createLayerBoard(state, boardWidth, boardHeight, 0, nodeId);
            container.appendChild(boardContainer);
        }
        
        const info = document.createElement('div');
        info.style.cssText = 'text-align: center; margin-top: 6px; font-size: 10px; color: #888;';
        const dimensionInfo = state.is3D ? `${boardWidth}×${boardHeight}×${state.depth}` : `${boardWidth}×${boardHeight}`;
        info.textContent = `State #${nodeId} (${dimensionInfo}) - Drag pieces to navigate`;
        
        container.appendChild(info);
        
        // Add 3D movement info
        if (state.is3D) {
            const movementInfo = document.createElement('div');
            movementInfo.style.cssText = 'text-align: center; margin-top: 3px; font-size: 9px; color: #4488ff;';
            const layers = new Set(state.blocks.map(b => b.z || 0));
            movementInfo.textContent = `Pieces can move between layers via dragging in X, Y directions`;
            container.appendChild(movementInfo);
        }
        
        contentElement.appendChild(container);
    }

    // Add visual indicator for pieces that can participate in compound moves
    addCompoundMoveIndicator(piece, block, state) {
        // Check if this piece can participate in compound moves
        const compoundMoves = state.generateCompoundMoves();
        const participatingMoves = compoundMoves.filter(move => 
            move.pieces.includes(block.id)
        );
        
        if (participatingMoves.length > 0) {
            // Add a subtle glow effect to indicate compound move capability
            piece.style.boxShadow = '0 0 8px rgba(255, 255, 0, 0.6)';
            piece.title = `Can participate in ${participatingMoves.length} compound move(s)`;
            
            // Add a small indicator dot
            const indicator = document.createElement('div');
            indicator.style.cssText = `
                position: absolute;
                top: 2px;
                left: 2px;
                width: 6px;
                height: 6px;
                background: #ffff00;
                border-radius: 50%;
                z-index: 15;
                pointer-events: none;
            `;
            piece.appendChild(indicator);
        }
    }

    makePieceDraggable(piece, currentNodeId, boardWidth, boardHeight, state) {
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;
        
        // Check if this is a custom shape
        const isCustomShape = piece.dataset.customShape === 'true';
        
        const onMouseMove = (e) => {
            if (!isDragging) return;
            
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            // Calculate potential grid position
            let newLeft = initialLeft + dx;
            let newTop = initialTop + dy;
            let newX = Math.round(newLeft / 27);
            let newY = Math.round(newTop / 27);
            
            // Get the actual block from state
            const blockId = parseInt(piece.dataset.blockId);
            const currentState = this.graph.getStateById(currentNodeId);
            const currentBlock = currentState.blocks.find(b => b.id === blockId);
            
            // For custom shapes, calculate offset from original position
            if (isCustomShape) {
                const cells = JSON.parse(piece.dataset.cells);
                const minX = Math.min(...cells.map(c => c[0]));
                const minY = Math.min(...cells.map(c => c[1]));
                newX = newX - minX;
                newY = newY - minY;
            }
            
            // Get piece dimensions
            let pieceWidth, pieceHeight;
            if (isCustomShape) {
                pieceWidth = parseInt(piece.style.width);
                pieceHeight = parseInt(piece.style.height);
            } else {
                const blockWidth = parseInt(piece.dataset.blockWidth);
                const blockHeight = parseInt(piece.dataset.blockHeight);
                pieceWidth = blockWidth * 27 - 2;
                pieceHeight = blockHeight * 27 - 2;
                // Constrain to bounds
                newX = Math.max(0, Math.min(newX, boardWidth - blockWidth));
                newY = Math.max(0, Math.min(newY, boardHeight - blockHeight));
            }
            
            const currentZ = state.is3D ? (parseInt(piece.dataset.blockZ) || 0) : 0;
            
            // Check if this position is valid (no collision)
            if (currentState.canMove(blockId, newX, newY, currentZ)) {
                // Valid position - allow the move
                newLeft = newX * 27 + (isCustomShape ? Math.min(...JSON.parse(piece.dataset.cells).map(c => c[0])) * 27 : 0);
                newTop = newY * 27 + (isCustomShape ? Math.min(...JSON.parse(piece.dataset.cells).map(c => c[1])) * 27 : 0);
            } else {
                // Invalid - keep at current position
                newLeft = parseInt(piece.style.left);
                newTop = parseInt(piece.style.top);
            }
            
            // Apply bounds constraint
            const boardPixelWidth = boardWidth * 27;
            const boardPixelHeight = boardHeight * 27;
            newLeft = Math.max(0, Math.min(newLeft, boardPixelWidth - pieceWidth));
            newTop = Math.max(0, Math.min(newTop, boardPixelHeight - pieceHeight));
            
            piece.style.left = newLeft + 'px';
            piece.style.top = newTop + 'px';
        };
        
        const onMouseUp = (e) => {
            if (!isDragging) return;
            isDragging = false;
            piece.style.zIndex = '10';
            
            // Remove global listeners
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            
            // Calculate grid position (snap to grid)
            const finalLeft = parseInt(piece.style.left);
            const finalTop = parseInt(piece.style.top);
            let newX = Math.round(finalLeft / 27);
            let newY = Math.round(finalTop / 27);
            
            // Get the actual block from state
            const blockId = parseInt(piece.dataset.blockId);
            const currentState = this.graph.getStateById(currentNodeId);
            const currentBlock = currentState.blocks.find(b => b.id === blockId);
            
            // For custom shapes, calculate offset from original position
            if (isCustomShape) {
                const cells = JSON.parse(piece.dataset.cells);
                const minX = Math.min(...cells.map(c => c[0]));
                const minY = Math.min(...cells.map(c => c[1]));
                
                // Adjust position to account for cell offsets
                newX = newX - minX;
                newY = newY - minY;
            }
            
            // Ensure position is within valid bounds
            if (!isCustomShape) {
                const blockWidth = parseInt(piece.dataset.blockWidth);
                const blockHeight = parseInt(piece.dataset.blockHeight);
                newX = Math.max(0, Math.min(newX, boardWidth - blockWidth));
                newY = Math.max(0, Math.min(newY, boardHeight - blockHeight));
            }
            
            const currentZ = state.is3D ? (parseInt(piece.dataset.blockZ) || 0) : 0;
            
            // Check if move is valid
            if (currentState.canMove(blockId, newX, newY, currentZ)) {
                // Create new state with the move
                const move = state.is3D ? 
                    {blockId, fromX: currentState.blocks.find(b => b.id === blockId).x, fromY: currentState.blocks.find(b => b.id === blockId).y, fromZ: currentZ, toX: newX, toY: newY, toZ: currentZ} :
                    {blockId, toX: newX, toY: newY};
                const newState = currentState.applyMove(move);
                const newHash = newState.getHash(this.graph.treatShapesAsUnique);
                
                // Check if this state exists in the graph
                const stateData = this.graph.states.get(newHash);
                if (stateData) {
                    // Navigate to this state!
                    this.selectedNode = stateData.id;
                    this.updateNodeColors();
                    this.highlightConnectedEdges(stateData.id);
                    this.displayBoardState(stateData.id);
                    console.log(`Navigated to state #${stateData.id}`);
                } else {
                    console.log('This state is not in the graph');
                    // Snap back to original position
                    const originalBlock = currentState.blocks.find(b => b.id === blockId);
                    piece.style.left = (originalBlock.x * 27) + 'px';
                    piece.style.top = (originalBlock.y * 27) + 'px';
                }
            } else {
                // Invalid move - snap back
                const originalBlock = currentState.blocks.find(b => b.id === blockId);
                piece.style.left = (originalBlock.x * 27) + 'px';
                piece.style.top = (originalBlock.y * 27) + 'px';
            }
        };
        
        const onMouseDown = (e) => {
            isDragging = true;
            piece.style.zIndex = '100';
            startX = e.clientX;
            startY = e.clientY;
            initialLeft = parseInt(piece.style.left);
            initialTop = parseInt(piece.style.top);
            e.preventDefault();
            e.stopPropagation();
            
            // Only attach global listeners when actually dragging
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };
        
        piece.addEventListener('mousedown', onMouseDown);
    }

    checkIntersections() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        if (this.nodeInstancedMesh) {
            const intersects = this.raycaster.intersectObject(this.nodeInstancedMesh);
            
            if (intersects.length > 0) {
                const newHoveredNode = intersects[0].instanceId;
                if (newHoveredNode !== this.hoveredNode) {
                    this.hoveredNode = newHoveredNode;
                    this.updateNodeColors();
                    this.displayStateInfo(this.hoveredNode);
                }
            } else {
                if (this.hoveredNode !== -1) {
                    this.hoveredNode = -1;
                    this.updateNodeColors();
                }
            }
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.controls.update();
        this.checkIntersections();
        this.renderer.render(this.scene, this.camera);
    }

    start() {
        this.animate();
    }
}

