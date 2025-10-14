// Klotski Game Logic and State Management

class KlotskiState {
    constructor(blocks, width = 4, height = 5, depth = 1) {
        // blocks: array of {id, x, y, z, width, height, depth}
        // Board dimensions (default: standard 4x5 Klotski, depth 1 for 2D)
        this.blocks = blocks.map(b => ({...b}));
        this.width = width;
        this.height = height;
        this.depth = depth || 1; // depth 1 means 2D puzzle
        this.is3D = depth > 1;
    }

    // Create initial standard Klotski configuration
    static createInitial() {
        return new KlotskiState([
            // Big red block (2x2) - the one we need to get out
            {id: 0, x: 1, y: 0, width: 2, height: 2, name: 'big'},
            // Vertical blocks (1x2)
            {id: 1, x: 0, y: 0, width: 1, height: 2, name: 'v1'},
            {id: 2, x: 3, y: 0, width: 1, height: 2, name: 'v2'},
            {id: 3, x: 0, y: 2, width: 1, height: 2, name: 'v3'},
            {id: 4, x: 3, y: 2, width: 1, height: 2, name: 'v4'},
            // Horizontal blocks (2x1)
            {id: 5, x: 1, y: 2, width: 2, height: 1, name: 'h1'},
            // Small blocks (1x1)
            {id: 6, x: 1, y: 3, width: 1, height: 1, name: 's1'},
            {id: 7, x: 2, y: 3, width: 1, height: 1, name: 's2'},
            {id: 8, x: 1, y: 4, width: 1, height: 1, name: 's3'},
            {id: 9, x: 2, y: 4, width: 1, height: 1, name: 's4'},
        ], 4, 5);
    }

    // Get hash string for state comparison
    // Treats identical-shaped pieces as indistinguishable (canonical form)
    // Note: Does NOT apply geometric symmetries (mirror/rotation) as most puzzles
    // have asymmetric goals. Geometric symmetry reduction should be optional.
    // VERSION: 2024-fix (no geometric symmetry)
    getHash() {
        // Group blocks by shape (width, height, depth for 3D)
        const groups = {};
        for (const block of this.blocks) {
            const blockDepth = block.depth || 1;
            const key = this.is3D ? `${block.width}x${block.height}x${blockDepth}` : `${block.width}x${block.height}`;
            if (!groups[key]) groups[key] = [];
            const pos = this.is3D ? {x: block.x, y: block.y, z: block.z || 0} : {x: block.x, y: block.y};
            groups[key].push(pos);
        }
        
        // Sort positions within each group and then sort groups
        const parts = [];
        for (const key of Object.keys(groups).sort()) {
            const positions = groups[key].sort((a, b) => {
                if (this.is3D && a.z !== b.z) return a.z - b.z;
                if (a.y !== b.y) return a.y - b.y;
                return a.x - b.x;
            });
            const posStr = this.is3D ? 
                positions.map(p => `${p.x},${p.y},${p.z}`).join(';') :
                positions.map(p => `${p.x},${p.y}`).join(';');
            parts.push(`${key}:${posStr}`);
        }
        
        return parts.join('|');
    }

    // Check if position is occupied
    isOccupied(x, y, z = 0, excludeId = -1) {
        for (const block of this.blocks) {
            if (block.id === excludeId) continue;
            const blockZ = block.z || 0;
            const blockDepth = block.depth || 1;
            
            if (x >= block.x && x < block.x + block.width &&
                y >= block.y && y < block.y + block.height &&
                z >= blockZ && z < blockZ + blockDepth) {
                return true;
            }
        }
        return false;
    }

    // Check if block can move to new position
    canMove(blockId, newX, newY, newZ = null) {
        const block = this.blocks.find(b => b.id === blockId);
        if (!block) return false;

        // For 2D puzzles, newZ is always 0 or undefined
        if (newZ === null) newZ = block.z || 0;

        // Check bounds (use state dimensions, default to 4x5 if not set)
        const boardWidth = this.width || 4;
        const boardHeight = this.height || 5;
        const boardDepth = this.depth || 1;
        const blockDepth = block.depth || 1;
        
        if (newX < 0 || newY < 0 || newZ < 0 ||
            newX + block.width > boardWidth || 
            newY + block.height > boardHeight ||
            newZ + blockDepth > boardDepth) {
            return false;
        }

        // Check collision with other blocks
        for (let dz = 0; dz < blockDepth; dz++) {
            for (let dy = 0; dy < block.height; dy++) {
                for (let dx = 0; dx < block.width; dx++) {
                    if (this.isOccupied(newX + dx, newY + dy, newZ + dz, blockId)) {
                        return false;
                    }
                }
            }
        }

        return true;
    }

    // Get all valid moves from current state
    getValidMoves() {
        const moves = [];
        // 2D: up, down, left, right
        // 3D: add forward and backward in Z
        const directions = this.is3D ? 
            [{dx: 0, dy: -1, dz: 0}, {dx: 0, dy: 1, dz: 0}, {dx: -1, dy: 0, dz: 0}, {dx: 1, dy: 0, dz: 0}, {dx: 0, dy: 0, dz: -1}, {dx: 0, dy: 0, dz: 1}] :
            [{dx: 0, dy: -1, dz: 0}, {dx: 0, dy: 1, dz: 0}, {dx: -1, dy: 0, dz: 0}, {dx: 1, dy: 0, dz: 0}];

        for (const block of this.blocks) {
            const blockZ = block.z || 0;
            for (const dir of directions) {
                const newX = block.x + dir.dx;
                const newY = block.y + dir.dy;
                const newZ = blockZ + dir.dz;
                
                if (this.canMove(block.id, newX, newY, newZ)) {
                    const move = {
                        blockId: block.id,
                        fromX: block.x,
                        fromY: block.y,
                        toX: newX,
                        toY: newY
                    };
                    if (this.is3D) {
                        move.fromZ = blockZ;
                        move.toZ = newZ;
                    }
                    moves.push(move);
                }
            }
        }

        return moves;
    }

    // Apply a move and return new state
    applyMove(move) {
        const newBlocks = this.blocks.map(b => {
            if (b.id === move.blockId) {
                const updated = {...b, x: move.toX, y: move.toY};
                if (this.is3D && move.toZ !== undefined) {
                    updated.z = move.toZ;
                }
                return updated;
            }
            return {...b};
        });
        return new KlotskiState(newBlocks, this.width, this.height, this.depth);
    }

    // Check if this is a winning state (big block at exit position)
    isWinning() {
        const bigBlock = this.blocks.find(b => b.id === 0);
        return bigBlock && bigBlock.x === 1 && bigBlock.y === 3;
    }

    clone() {
        return new KlotskiState(this.blocks, this.width, this.height, this.depth);
    }
}

class StateSpaceGraph {
    constructor() {
        this.states = new Map(); // hash -> {state, id, neighbors}
        this.stateList = []; // array of states for indexed access
        this.edges = []; // array of {from, to}
    }

    // Generate the complete state space graph using BFS
    generate(initialState, maxStates = 100000) {
        const queue = [initialState];
        const visited = new Set();
        const startHash = initialState.getHash();
        
        visited.add(startHash);
        this.addState(initialState);

        let processed = 0;
        let duplicatesFound = 0;
        console.log('Generating state space graph...');
        console.log('Max states limit:', maxStates);
        console.log('Initial state is3D:', initialState.is3D);
        console.log('Initial state hash:', startHash.substring(0, 60) + (startHash.length > 60 ? '...' : ''));
        console.log('Initial state blocks:', initialState.blocks.map(b => `${b.width}x${b.height}@(${b.x},${b.y})`).join(', '));

        while (queue.length > 0 && this.stateList.length < maxStates) {
            const currentState = queue.shift();
            const currentHash = currentState.getHash();
            const currentId = this.states.get(currentHash).id;

            const moves = currentState.getValidMoves();
            
            // Debug: log moves for first state
            if (processed === 0) {
                console.log(`First state has ${moves.length} valid moves`);
                if (currentState.is3D) {
                    const zMoves = moves.filter(m => m.fromZ !== m.toZ);
                    console.log(`  Including ${zMoves.length} Z-axis moves`);
                }
            }
            
            for (const move of moves) {
                const newState = currentState.applyMove(move);
                const newHash = newState.getHash();

                if (!visited.has(newHash)) {
                    visited.add(newHash);
                    this.addState(newState);
                    queue.push(newState);
                } else {
                    duplicatesFound++;
                }

                // Add edge
                const newId = this.states.get(newHash).id;
                if (!this.states.get(currentHash).neighbors.includes(newId)) {
                    this.states.get(currentHash).neighbors.push(newId);
                    this.edges.push({from: currentId, to: newId});
                }
            }

            processed++;
            if (processed % 1000 === 0) {
                console.log(`Processed ${processed} states, found ${this.stateList.length} unique states, ${duplicatesFound} duplicates filtered`);
            }
        }

        console.log(`Complete! Generated ${this.stateList.length} states with ${this.edges.length} edges`);
        console.log(`Duplicates filtered: ${duplicatesFound}`);
        console.log(`Ratio of duplicates: ${(duplicatesFound / (this.stateList.length + duplicatesFound) * 100).toFixed(1)}%`);
        return this;
    }

    addState(state) {
        const hash = state.getHash();
        if (!this.states.has(hash)) {
            const id = this.stateList.length;
            this.states.set(hash, {
                state: state,
                id: id,
                neighbors: []
            });
            this.stateList.push(state);
        }
    }

    getStateById(id) {
        return this.stateList[id];
    }

    getStateCount() {
        return this.stateList.length;
    }

    getEdgeCount() {
        return this.edges.length;
    }

    // Calculate BFS levels from initial state
    calculateLevels() {
        const levels = new Array(this.stateList.length).fill(-1);
        levels[0] = 0;
        
        const queue = [0];
        while (queue.length > 0) {
            const currentId = queue.shift();
            const currentLevel = levels[currentId];
            const hash = this.stateList[currentId].getHash();
            const neighbors = this.states.get(hash).neighbors;

            for (const neighborId of neighbors) {
                if (levels[neighborId] === -1) {
                    levels[neighborId] = currentLevel + 1;
                    queue.push(neighborId);
                }
            }
        }

        return levels;
    }
}

