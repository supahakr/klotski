// Klotski Game Logic and State Management

class KlotskiState {
    constructor(blocks, width = 4, height = 5, depth = 1, forbiddenCells = []) {
        // blocks: array of {id, x, y, z, width, height, depth} for rectangles
        //         OR {id, x, y, z, cells: [[dx,dy,dz], ...]} for custom shapes
        //         where cells are relative to (x,y,z) origin
        // Board dimensions (default: standard 4x5 Klotski, depth 1 for 2D)
        this.blocks = blocks.map(b => ({...b}));
        this.width = width;
        this.height = height;
        this.depth = depth || 1; // depth 1 means 2D puzzle
        this.is3D = depth > 1;
        this.forbiddenCells = forbiddenCells.map(c => ({...c})); // Array of {x, y, z} positions
        
        // Spatial hash for O(1) occupancy tests: cell -> pieceId
        this.spatialHash = new Map();
        this.updateSpatialHash();
        
        // Empty space labeling for cavity detection
        this.emptySpaceLabels = null;
        this.updateEmptySpaceLabels();
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

    // Update spatial hash for O(1) occupancy tests
    updateSpatialHash() {
        this.spatialHash.clear();
        for (const block of this.blocks) {
            const cells = this.getBlockCells(block);
            for (const cell of cells) {
                const key = `${cell.x},${cell.y},${cell.z}`;
                this.spatialHash.set(key, block.id);
            }
        }
    }
    
    // Check if a cell is occupied (O(1) lookup)
    isCellOccupied(x, y, z) {
        const key = `${x},${y},${z}`;
        return this.spatialHash.has(key);
    }
    
    // Check if a cell is forbidden
    isCellForbidden(x, y, z) {
        return this.forbiddenCells.some(cell => 
            cell.x === x && cell.y === y && cell.z === (z || 0)
        );
    }
    
    // Get piece ID occupying a cell, or null if empty
    getPieceAtCell(x, y, z) {
        const key = `${x},${y},${z}`;
        return this.spatialHash.get(key) || null;
    }
    
    // Update empty space labeling with flood-fill
    updateEmptySpaceLabels() {
        this.emptySpaceLabels = new Map();
        const visited = new Set();
        
        // Directions for flood-fill (6-connected in 3D, 4-connected in 2D)
        const directions = this.is3D ? 
            [[1,0,0], [-1,0,0], [0,1,0], [0,-1,0], [0,0,1], [0,0,-1]] :
            [[1,0,0], [-1,0,0], [0,1,0], [0,-1,0]];
        
        let labelId = 0;
        
        // Flood-fill from boundary cells (connected to outside)
        const boundaryCells = [];
        for (let z = 0; z < this.depth; z++) {
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    if (x === 0 || x === this.width - 1 || 
                        y === 0 || y === this.height - 1 ||
                        (this.is3D && (z === 0 || z === this.depth - 1))) {
                        if (!this.isCellOccupied(x, y, z)) {
                            boundaryCells.push([x, y, z]);
                        }
                    }
                }
            }
        }
        
        // Flood-fill from boundary
        const queue = [...boundaryCells];
        while (queue.length > 0) {
            const [x, y, z] = queue.shift();
            const key = `${x},${y},${z}`;
            
            if (visited.has(key) || this.isCellOccupied(x, y, z)) continue;
            
            visited.add(key);
            this.emptySpaceLabels.set(key, 'outside'); // Connected to outside
            
            // Add neighbors to queue
            for (const [dx, dy, dz] of directions) {
                const nx = x + dx;
                const ny = y + dy;
                const nz = z + dz;
                
                if (nx >= 0 && nx < this.width && 
                    ny >= 0 && ny < this.height && 
                    nz >= 0 && nz < this.depth) {
                    const neighborKey = `${nx},${ny},${nz}`;
                    if (!visited.has(neighborKey) && !this.isCellOccupied(nx, ny, nz)) {
                        queue.push([nx, ny, nz]);
                    }
                }
            }
        }
        
        // Label remaining empty spaces as cavities
        for (let z = 0; z < this.depth; z++) {
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    if (!this.isCellOccupied(x, y, z)) {
                        const key = `${x},${y},${z}`;
                        if (!this.emptySpaceLabels.has(key)) {
                            // This is an internal cavity
                            this.emptySpaceLabels.set(key, `cavity_${labelId++}`);
                        }
                    }
                }
            }
        }
    }
    
    // Check if a cell is in an internal cavity
    isInCavity(x, y, z) {
        const key = `${x},${y},${z}`;
        const label = this.emptySpaceLabels.get(key);
        return label && label.startsWith('cavity_');
    }
    
    // Check if a cell is connected to outside
    isConnectedToOutside(x, y, z) {
        const key = `${x},${y},${z}`;
        return this.emptySpaceLabels.get(key) === 'outside';
    }

    // Get all cells occupied by a block
    // Returns array of {x, y, z} absolute positions
    getBlockCells(block) {
        const cells = [];
        if (block.cells) {
            // Custom shape: cells are relative to block origin
            for (const [dx, dy, dz = 0] of block.cells) {
                cells.push({
                    x: block.x + dx,
                    y: block.y + dy,
                    z: (block.z || 0) + dz
                });
            }
        } else {
            // Rectangle: generate cells from width/height/depth
            const blockDepth = block.depth || 1;
            for (let dz = 0; dz < blockDepth; dz++) {
                for (let dy = 0; dy < block.height; dy++) {
                    for (let dx = 0; dx < block.width; dx++) {
                        cells.push({
                            x: block.x + dx,
                            y: block.y + dy,
                            z: (block.z || 0) + dz
                        });
                    }
                }
            }
        }
        return cells;
    }

    // Get normalized shape signature for a block (for hashing)
    // Returns sorted list of relative cells
    getBlockShape(block) {
        if (block.cells) {
            // Custom shape: normalize and sort
            const cells = block.cells.map(([dx, dy, dz = 0]) => [dx, dy, dz]);
            cells.sort((a, b) => {
                if (a[2] !== b[2]) return a[2] - b[2]; // z
                if (a[1] !== b[1]) return a[1] - b[1]; // y
                return a[0] - b[0]; // x
            });
            return cells.map(c => c.join(',')).join(';');
        } else {
            // Rectangle: use width x height x depth
            const blockDepth = block.depth || 1;
            return this.is3D ? `${block.width}x${block.height}x${blockDepth}` : `${block.width}x${block.height}`;
        }
    }

    // Get hash string for state comparison
    // Treats identical-shaped pieces as indistinguishable (canonical form)
    // Note: Does NOT apply geometric symmetries (mirror/rotation) as most puzzles
    // have asymmetric goals. Geometric symmetry reduction should be optional.
    // VERSION: 2024-fix (no geometric symmetry)
    getHash(treatShapesAsUnique = false) {
        if (treatShapesAsUnique) {
            // Treat each piece as unique based on ID
            const parts = [];
            // Sort blocks by ID for consistent ordering
            const sortedBlocks = [...this.blocks].sort((a, b) => a.id - b.id);
            for (const block of sortedBlocks) {
                const shape = this.getBlockShape(block);
                const pos = this.is3D ? `${block.x},${block.y},${block.z || 0}` : `${block.x},${block.y}`;
                parts.push(`${block.id}[${shape}]:${pos}`);
            }
            return parts.join('|');
        }
        
        // Group blocks by shape signature
        const groups = {};
        for (const block of this.blocks) {
            const key = this.getBlockShape(block);
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
            
            // Get all cells occupied by this block
            const cells = this.getBlockCells(block);
            for (const cell of cells) {
                if (cell.x === x && cell.y === y && cell.z === z) {
                    return true;
                }
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

        // Calculate offset from current position
        const dx = newX - block.x;
        const dy = newY - block.y;
        const dz = newZ - (block.z || 0);

        // Check bounds and collision for each cell
        const boardWidth = this.width || 4;
        const boardHeight = this.height || 5;
        const boardDepth = this.depth || 1;

        const cells = this.getBlockCells(block);
        for (const cell of cells) {
            const newCellX = cell.x + dx;
            const newCellY = cell.y + dy;
            const newCellZ = cell.z + dz;

            // Check bounds
            if (newCellX < 0 || newCellY < 0 || newCellZ < 0 ||
                newCellX >= boardWidth || 
                newCellY >= boardHeight ||
                newCellZ >= boardDepth) {
                return false;
            }

            // Check if target cell is forbidden
            if (this.isCellForbidden(newCellX, newCellY, newCellZ)) {
                return false;
            }

            // Check collision with other blocks
            if (this.isOccupied(newCellX, newCellY, newCellZ, blockId)) {
                return false;
            }
        }

        return true;
    }

    // Get only single-piece moves (used for reachability checking)
    getSingleMoves() {
        const moves = [];
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
                        type: 'single',
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

    // Get all valid moves from current state
    getValidMoves() {
        const moves = [];
        
        // Generate single-piece moves
        const singleMoves = this.getSingleMoves();
        moves.push(...singleMoves);
        
        // Generate compound moves using dependency analysis
        const compoundMoves = this.generateCompoundMoves();
        moves.push(...compoundMoves);
        
        return moves;
    }

    // Apply a move and return new state
    applyMove(move) {
        if (move.type === 'compound') {
            return this.applyCompoundMove(move);
        }
        
        // Single piece move (existing logic)
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
        return new KlotskiState(newBlocks, this.width, this.height, this.depth, this.forbiddenCells);
    }

    // Check if this is a winning state (big block at exit position)
    isWinning() {
        const bigBlock = this.blocks.find(b => b.id === 0);
        return bigBlock && bigBlock.x === 1 && bigBlock.y === 3;
    }

    clone() {
        return new KlotskiState(this.blocks, this.width, this.height, this.depth, this.forbiddenCells);
    }
    
    // ===== COMPOUND MOVE DETECTION =====
    
    // Build dependency graph for a specific direction
    buildDependencyGraph(direction) {
        const [dx, dy, dz] = direction;
        const dependencies = new Map(); // pieceId -> Set of pieces it depends on
        
        // Initialize dependency map
        for (const block of this.blocks) {
            dependencies.set(block.id, new Set());
        }
        
        // Check each piece's target cells
        for (const block of this.blocks) {
            const cells = this.getBlockCells(block);
            
            for (const cell of cells) {
                const targetX = cell.x + dx;
                const targetY = cell.y + dy;
                const targetZ = cell.z + dz;
                
                // Check bounds
                if (targetX < 0 || targetX >= this.width ||
                    targetY < 0 || targetY >= this.height ||
                    targetZ < 0 || targetZ >= this.depth) {
                    // This piece hits a wall - mark as anchored
                    dependencies.set(block.id, new Set(['ANCHORED']));
                    break;
                }
                
                // Check if target cell is occupied by another piece
                const occupyingPiece = this.getPieceAtCell(targetX, targetY, targetZ);
                if (occupyingPiece !== null && occupyingPiece !== block.id) {
                    // Check if this is a mutual collision (both pieces would collide)
                    const occupyingBlock = this.blocks.find(b => b.id === occupyingPiece);
                    const occupyingCells = this.getBlockCells(occupyingBlock);
                    
                    // Check if the occupying piece would also hit the current piece
                    let mutualCollision = false;
                    for (const occCell of occupyingCells) {
                        const occTargetX = occCell.x + dx;
                        const occTargetY = occCell.y + dy;
                        const occTargetZ = occCell.z + dz;
                        
                        // Check if occupying piece's target position would overlap with current piece
                        if (occTargetX >= 0 && occTargetX < this.width &&
                            occTargetY >= 0 && occTargetY < this.height &&
                            occTargetZ >= 0 && occTargetZ < this.depth) {
                            
                            // Check if any of the occupying piece's target cells would overlap
                            // with any of the current piece's current cells
                            for (const currentCell of cells) {
                                if (occTargetX === currentCell.x && 
                                    occTargetY === currentCell.y && 
                                    occTargetZ === currentCell.z) {
                                    mutualCollision = true;
                                    break;
                                }
                            }
                            if (mutualCollision) break;
                        }
                    }
                    
                    if (mutualCollision) {
                        dependencies.get(block.id).add(occupyingPiece);
                    }
                }
            }
        }
        
        return dependencies;
    }
    
    // Find strongly connected components using Tarjan's algorithm
    findStronglyConnectedComponents(dependencies) {
        const visited = new Set();
        const onStack = new Set();
        const low = new Map();
        const ids = new Map();
        const sccs = [];
        let idCounter = 0;
        
        const dfs = (node) => {
            ids.set(node, idCounter);
            low.set(node, idCounter);
            idCounter++;
            visited.add(node);
            onStack.add(node);
            
            const dependents = dependencies.get(node) || new Set();
            for (const dependent of dependents) {
                if (dependent === 'ANCHORED') continue;
                
                if (!visited.has(dependent)) {
                    dfs(dependent);
                }
                if (onStack.has(dependent)) {
                    low.set(node, Math.min(low.get(node), low.get(dependent)));
                }
            }
            
            if (ids.get(node) === low.get(node)) {
                const scc = [];
                let w;
                do {
                    w = Array.from(onStack).pop();
                    onStack.delete(w);
                    scc.push(w);
                } while (w !== node);
                sccs.push(scc);
            }
        };
        
        for (const pieceId of dependencies.keys()) {
            if (!visited.has(pieceId)) {
                dfs(pieceId);
            }
        }
        
        return sccs;
    }
    
    // Generate compound moves using dependency analysis
    generateCompoundMoves() {
        const moves = [];
        
        // First, get all states reachable by single moves
        const singleMoveStates = new Set();
        const singleMoves = this.getSingleMoves();
        
        for (const move of singleMoves) {
            const newState = this.applyMove(move);
            const hash = newState.getHash(this.treatShapesAsUnique);
            singleMoveStates.add(hash);
        }
        
        // Directions: 6 in 3D, 4 in 2D
        const directions = this.is3D ? 
            [[1,0,0], [-1,0,0], [0,1,0], [0,-1,0], [0,0,1], [0,0,-1]] :
            [[1,0,0], [-1,0,0], [0,1,0], [0,-1,0]];
        
        for (const direction of directions) {
            const dependencies = this.buildDependencyGraph(direction);
            const sccs = this.findStronglyConnectedComponents(dependencies);
            
            // Mark anchored SCCs
            const anchoredSCCs = new Set();
            for (const scc of sccs) {
                for (const pieceId of scc) {
                    if (dependencies.get(pieceId)?.has('ANCHORED')) {
                        anchoredSCCs.add(scc);
                        break;
                    }
                }
            }
            
            // Build reachability graph between SCCs
            const sccMap = new Map(); // pieceId -> scc index
            for (let i = 0; i < sccs.length; i++) {
                for (const pieceId of sccs[i]) {
                    sccMap.set(pieceId, i);
                }
            }
            
            const reachable = new Map(); // scc index -> Set of reachable scc indices
            for (let i = 0; i < sccs.length; i++) {
                reachable.set(i, new Set([i]));
                
                for (const pieceId of sccs[i]) {
                    const dependents = dependencies.get(pieceId) || new Set();
                    for (const dependent of dependents) {
                        if (dependent !== 'ANCHORED' && sccMap.has(dependent)) {
                            const dependentSCC = sccMap.get(dependent);
                            reachable.get(i).add(dependentSCC);
                        }
                    }
                }
            }
            
            // Transitive closure
            let changed = true;
            while (changed) {
                changed = false;
                for (let i = 0; i < sccs.length; i++) {
                    const currentReachable = reachable.get(i);
                    const sizeBefore = currentReachable.size;
                    
                    for (const j of currentReachable) {
                        for (const k of reachable.get(j)) {
                            currentReachable.add(k);
                        }
                    }
                    
                    if (currentReachable.size > sizeBefore) {
                        changed = true;
                    }
                }
            }
            
            // Generate moves for each SCC
            for (let i = 0; i < sccs.length; i++) {
                if (anchoredSCCs.has(sccs[i])) continue;
                
                const group = new Set();
                for (const j of reachable.get(i)) {
                    for (const pieceId of sccs[j]) {
                        group.add(pieceId);
                    }
                }
                
                // Check if group intersects with any anchored SCC
                let intersectsAnchored = false;
                for (const anchoredSCC of anchoredSCCs) {
                    for (const pieceId of anchoredSCC) {
                        if (group.has(pieceId)) {
                            intersectsAnchored = true;
                            break;
                        }
                    }
                    if (intersectsAnchored) break;
                }
                
                if (!intersectsAnchored && this.canTranslateGroup(Array.from(group), direction)) {
                    // Additional check: ensure this compound move is truly necessary
                    // by verifying that individual pieces in the group cannot move in this direction
                    let trulyInterlocked = false;
                    
                    for (const pieceId of group) {
                        const block = this.blocks.find(b => b.id === pieceId);
                        const blockZ = block.z || 0;
                        const newX = block.x + direction[0];
                        const newY = block.y + direction[1];
                        const newZ = blockZ + direction[2];
                        
                        // If any piece in the group can move individually, it's not truly interlocked
                        if (this.canMove(pieceId, newX, newY, newZ)) {
                            trulyInterlocked = false;
                            break;
                        }
                        trulyInterlocked = true;
                    }
                    
                    if (trulyInterlocked) {
                        const compoundMove = {
                            type: 'compound',
                            pieces: Array.from(group),
                            direction: direction,
                            fromPositions: Array.from(group).map(id => {
                                const block = this.blocks.find(b => b.id === id);
                                return {id, x: block.x, y: block.y, z: block.z || 0};
                            }),
                            toPositions: Array.from(group).map(id => {
                                const block = this.blocks.find(b => b.id === id);
                                return {
                                    id, 
                                    x: block.x + direction[0], 
                                    y: block.y + direction[1], 
                                    z: (block.z || 0) + direction[2]
                                };
                            })
                        };
                        
                        // Check if this compound move reaches a new state
                        const newState = this.applyCompoundMove(compoundMove);
                        const newHash = newState.getHash(this.treatShapesAsUnique);
                        
                        if (!singleMoveStates.has(newHash)) {
                            moves.push(compoundMove);
                        }
                    }
                }
            }
        }
        
        return moves;
    }
    
    // Check if a group of pieces can be translated together
    canTranslateGroup(pieceIds, direction) {
        const [dx, dy, dz] = direction;
        
        // Create temporary spatial hash excluding the moving pieces
        const tempHash = new Map();
        for (const block of this.blocks) {
            if (!pieceIds.includes(block.id)) {
                const cells = this.getBlockCells(block);
                for (const cell of cells) {
                    const key = `${cell.x},${cell.y},${cell.z}`;
                    tempHash.set(key, block.id);
                }
            }
        }
        
        // Check if all target positions are free
        for (const pieceId of pieceIds) {
            const block = this.blocks.find(b => b.id === pieceId);
            const cells = this.getBlockCells(block);
            
            for (const cell of cells) {
                const targetX = cell.x + dx;
                const targetY = cell.y + dy;
                const targetZ = cell.z + dz;
                
                // Check bounds
                if (targetX < 0 || targetX >= this.width ||
                    targetY < 0 || targetY >= this.height ||
                    targetZ < 0 || targetZ >= this.depth) {
                    return false;
                }
                
                // Check if target cell is forbidden
                if (this.isCellForbidden(targetX, targetY, targetZ)) {
                    return false;
                }
                
                // Check collision with non-moving pieces
                const key = `${targetX},${targetY},${targetZ}`;
                if (tempHash.has(key)) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    // Apply a compound move to create a new state
    applyCompoundMove(move) {
        const newBlocks = this.blocks.map(block => {
            const newPos = move.toPositions.find(p => p.id === block.id);
            if (newPos) {
                return {
                    ...block,
                    x: newPos.x,
                    y: newPos.y,
                    z: newPos.z
                };
            }
            return {...block};
        });
        
        return new KlotskiState(newBlocks, this.width, this.height, this.depth, this.forbiddenCells);
    }
}

class StateSpaceGraph {
    constructor() {
        this.states = new Map(); // hash -> {state, id, neighbors}
        this.stateList = []; // array of states for indexed access
        this.edges = []; // array of {from, to}
    }

    // Generate the complete state space graph using BFS
    generate(initialState, maxStates = 100000, treatShapesAsUnique = false) {
        this.treatShapesAsUnique = treatShapesAsUnique;
        const queue = [initialState];
        const visited = new Set();
        const startHash = initialState.getHash(treatShapesAsUnique);
        
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
            const currentHash = currentState.getHash(treatShapesAsUnique);
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
                const newHash = newState.getHash(treatShapesAsUnique);

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
        const hash = state.getHash(this.treatShapesAsUnique);
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
    
    exportState() {
        return {
            states: Array.from(this.states.entries()).map(([hash, stateData]) => ({
                id: stateData.id,
                state: stateData.state,
                neighbors: Array.from(stateData.neighbors)
            })),
            edges: Array.from(this.edges),
            initialStateId: this.initialStateId,
            treatShapesAsUnique: this.treatShapesAsUnique
        };
    }
    
    static importState(data) {
        const graph = new StateSpaceGraph();
        graph.treatShapesAsUnique = data.treatShapesAsUnique || false;
        
        // Add all states first
        data.states.forEach(stateData => {
            const state = new KlotskiState(
                stateData.state.blocks,
                stateData.state.width,
                stateData.state.height,
                stateData.state.depth
            );
            state.id = stateData.id;
            graph.states.set(state.getHash(graph.treatShapesAsUnique), {
                id: state.id,
                state: state,
                neighbors: new Set(stateData.neighbors)
            });
        });
        
        // Rebuild stateList in the correct order
        graph.stateList = Array(graph.states.size);
        for (const [hash, stateData] of graph.states.entries()) {
            graph.stateList[stateData.id] = stateData.state;
        }
        
        // Add all edges
        data.edges.forEach(edge => {
            graph.addEdge(edge[0], edge[1]);
        });
        
        graph.initialStateId = data.initialStateId;
        return graph;
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
            const hash = this.stateList[currentId].getHash(this.treatShapesAsUnique);
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

