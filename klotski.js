// Klotski Game Logic and State Management

// Expose a build marker in the browser to confirm the latest file is loaded.
if (typeof window !== 'undefined') {
    window.__KLOTSKI_JS_BUILD__ = 'compound-fix-2026-03-13-7';
    console.log('[Klotski] Build loaded:', window.__KLOTSKI_JS_BUILD__);
    console.log('[Klotski] Fixes applied: parity-groupPositions, skipPositions-parity-check, transitive-closure');
}

// Triangular Lattice System - Simple Row/Column Based
// Each cell is identified by (row, col), where:
// - row: vertical row index (0, 1, 2, ...)
// - col: horizontal column index (0, 1, 2, ...)
// - Triangles alternate orientation: even cells point up (△), odd cells point down (▽)
// - Parity = (row + col) % 2: 0 = up-pointing, 1 = down-pointing

class TriGrid {
    constructor(cellSize = 40) {
        this.cellSize = cellSize;
        // Height of equilateral triangle
        this.height = cellSize * Math.sqrt(3) / 2;
    }
    
    // Convert grid coordinates (row, col) to pixel coordinates (x, y)
    // Returns the top-left corner of the triangle's bounding box
    gridToPixel(row, col) {
        const x = col * (this.cellSize / 2);
        const y = row * this.height;
        return { x, y };
    }
    
    // Convert pixel coordinates to grid coordinates
    // Returns the triangle cell at that pixel location
    pixelToGrid(pixelX, pixelY) {
        // Approximate row and column
        const row = Math.floor(pixelY / this.height);
        const col = Math.floor(pixelX / (this.cellSize / 2));
        
        // Get local coordinates within the cell
        const { x: cellX, y: cellY } = this.gridToPixel(row, col);
        const localX = pixelX - cellX;
        const localY = pixelY - cellY;
        
        // Determine which triangle we're in based on parity and position
        const parity = this.getParity(row, col);
        const halfWidth = this.cellSize / 2;
        
        // Check if we're in this cell or need to adjust
        if (parity === 0) { // Up-pointing triangle
            // Check if we're below the hypotenuse
            if (localY > this.height * (1 - localX / halfWidth)) {
                return { row: row + 1, col: col };
            }
            if (localX > halfWidth && localY > this.height * (localX / halfWidth - 1)) {
                return { row: row + 1, col: col + 1 };
            }
        } else { // Down-pointing triangle
            // Check if we're above the hypotenuse
            if (localY < this.height * (localX / halfWidth)) {
                return { row: row, col: col - 1 };
            }
            if (localX > halfWidth && localY < this.height * (2 - localX / halfWidth)) {
                return { row: row, col: col + 1 };
            }
        }
        
        return { row, col };
    }
    
    // Get triangle parity (0 = up △, 1 = down ▽)
    getParity(row, col) {
        return (row + col) % 2;
    }
    
    // Get vertices of a triangle for rendering
    getTriangleVertices(row, col) {
        const { x, y } = this.gridToPixel(row, col);
        const parity = this.getParity(row, col);
        const halfWidth = this.cellSize / 2;
        
        if (parity === 0) { // Up-pointing △
            return [
                { x: x, y: y + this.height },           // Bottom-left
                { x: x + halfWidth, y: y },             // Top
                { x: x + this.cellSize, y: y + this.height }  // Bottom-right
            ];
        } else { // Down-pointing ▽
            return [
                { x: x, y: y },                         // Top-left
                { x: x + halfWidth, y: y + this.height },      // Bottom
                { x: x + this.cellSize, y: y }          // Top-right
            ];
        }
    }
    
    // Get adjacent cells (neighbors that share an edge)
    getAdjacentCells(row, col) {
        const parity = this.getParity(row, col);
        
        if (parity === 0) { // Up-pointing △
            return [
                { row: row, col: col - 2 },      // Left (same orientation)
                { row: row, col: col + 2 },      // Right (same orientation)
                { row: row - 1, col: col - 1 },  // Top-left (opposite)
                { row: row - 1, col: col + 1 },  // Top-right (opposite)
                { row: row + 1, col: col - 1 },  // Bottom-left (opposite)
                { row: row + 1, col: col + 1 }   // Bottom-right (opposite)
            ];
        } else { // Down-pointing ▽
            return [
                { row: row, col: col - 2 },      // Left (same orientation)
                { row: row, col: col + 2 },      // Right (same orientation)
                { row: row - 1, col: col - 1 },  // Top-left (opposite)
                { row: row - 1, col: col + 1 },  // Top-right (opposite)
                { row: row + 1, col: col - 1 },  // Bottom-left (opposite)
                { row: row + 1, col: col + 1 }   // Bottom-right (opposite)
            ];
        }
    }
    
    // Get move directions for triangular lattice
    // In a triangular lattice, pieces can only slide along edges
    // There are 3 directions of edges (0°, 60°, 120°)
    // To maintain parity (orientation), we need (row + col) % 2 constant
    // Valid moves that maintain parity:
    // - Horizontal: (0, ±2) - same parity since row unchanged
    // - 60° diagonal: (1, 1) or (-1, -1) - parity changes by (1+1)%2 = 0
    // - 120° diagonal: (1, -1) or (-1, 1) - parity changes by (1-1)%2 = 0
    getMoveDirections() {
        return [
            // Horizontal direction (slide left/right along row)
            { row: 0, col: 2, name: 'right' },
            { row: 0, col: -2, name: 'left' },
            // 60° diagonal (down-right / up-left)
            { row: 1, col: 1, name: 'down-right' },
            { row: -1, col: -1, name: 'up-left' },
            // 120° diagonal (down-left / up-right)
            { row: 1, col: -1, name: 'down-left' },
            { row: -1, col: 1, name: 'up-right' }
        ];
    }
}

// Triangular Board Representation
class TriBoard {
    constructor(rows, cols, customCells = null, cellSize = 40, shape = 'rhombus') {
        this.rows = rows;
        this.cols = cols;
        this.grid = new TriGrid(cellSize);
        this.shape = shape;
        
        // Default board shape
        if (customCells === null) {
            this.validCells = new Set();
            
            if (shape === 'rhombus') {
                // Create a rhombus with flush edges
                const size = Math.min(rows, cols);
                const halfSize = Math.floor(size / 2);
                
                for (let row = 0; row < rows; row++) {
                    let trianglesInRow;
                    if (row < halfSize) {
                        trianglesInRow = 2 * (row + 1) - 1;
                    } else if (row < rows - halfSize) {
                        trianglesInRow = 2 * halfSize - 1;
                    } else {
                        trianglesInRow = 2 * (rows - row) - 1;
                    }
                    
                    let centerCol = Math.floor(cols / 2);
                    if (centerCol % 2 !== 0) {
                        centerCol -= 1;
                    }
                    const startCol = centerCol - Math.floor(trianglesInRow / 2);
                    const endCol = startCol + trianglesInRow - 1;
                    
                    for (let col = startCol; col <= endCol; col++) {
                        this.validCells.add(`${row},${col}`);
                    }
                }
            } else if (shape === 'triangle') {
                // Create a triangle (half of rhombus) - upper half
                const size = Math.min(rows, cols);
                const halfSize = Math.floor(size / 2);
                
                for (let row = 0; row < halfSize; row++) {
                    const trianglesInRow = 2 * (row + 1) - 1;
                    
                    let centerCol = Math.floor(cols / 2);
                    if (centerCol % 2 !== 0) {
                        centerCol -= 1;
                    }
                    const startCol = centerCol - Math.floor(trianglesInRow / 2);
                    const endCol = startCol + trianglesInRow - 1;
                    
                    for (let col = startCol; col <= endCol; col++) {
                        this.validCells.add(`${row},${col}`);
                    }
                }
            } else if (shape === 'hexagon') {
                // Create a hexagon: rhombus with top and bottom tips cut off
                const size = Math.min(rows, cols);
                const halfSize = Math.floor(size / 2);
                const cutoff = Math.floor(halfSize / 3); // Cut off 1/3 of tips
                
                for (let row = cutoff; row < rows - cutoff; row++) {
                    let trianglesInRow;
                    const adjustedRow = row - cutoff;
                    const adjustedMax = rows - 2 * cutoff;
                    const adjustedHalf = Math.floor(adjustedMax / 2);
                    
                    if (adjustedRow < adjustedHalf) {
                        trianglesInRow = 2 * halfSize - 1; // Max width
                    } else {
                        trianglesInRow = 2 * halfSize - 1; // Keep max width
                    }
                    
                    let centerCol = Math.floor(cols / 2);
                    if (centerCol % 2 !== 0) {
                        centerCol -= 1;
                    }
                    const startCol = centerCol - Math.floor(trianglesInRow / 2);
                    const endCol = startCol + trianglesInRow - 1;
                    
                    for (let col = startCol; col <= endCol; col++) {
                        this.validCells.add(`${row},${col}`);
                    }
                }
            } else {
                // Rectangular board: all cells
                for (let row = 0; row < rows; row++) {
                    for (let col = 0; col < cols; col++) {
                        this.validCells.add(`${row},${col}`);
                    }
                }
            }
        } else {
            this.validCells = customCells;
        }
    }
    
    // Static method to create a rhombus board
    static createRhombus(size, cellSize = 40) {
        // Create a rhombus with 'size' rows along each edge
        return new TriBoard(size * 2, size * 2, null, cellSize, 'rhombus');
    }
    
    // Check if a cell is on the board
    contains(row, col) {
        return this.validCells.has(`${row},${col}`);
    }
    
    // Get all valid cells
    getAllCells() {
        return Array.from(this.validCells).map(cell => {
            const [row, col] = cell.split(',').map(Number);
            return { row, col };
        });
    }
    
    // Get pixel bounds for rendering
    getPixelBounds() {
        const cells = this.getAllCells();
        if (cells.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
        
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        
        for (const { row, col } of cells) {
            const vertices = this.grid.getTriangleVertices(row, col);
            for (const vertex of vertices) {
                minX = Math.min(minX, vertex.x);
                maxX = Math.max(maxX, vertex.x);
                minY = Math.min(minY, vertex.y);
                maxY = Math.max(maxY, vertex.y);
            }
        }
        
        return { minX, maxX, minY, maxY };
    }
}

// Triangular Piece Representation (Polyiamond)
class TriPiece {
    constructor(id, offsets, name = '') {
        this.id = id;
        this.name = name;
        // Offsets store the RELATIVE parity of each triangle
        // Each offset is [drow, dcol] where the piece occupies (row0+drow, col0+dcol)
        // The relative parity is (drow + dcol) % 2: 
        //   0 = same orientation as anchor, 1 = opposite orientation
        this.offsets = offsets.map(([drow, dcol]) => {
            const relativeParity = (drow + dcol) % 2;
            return { drow, dcol, relativeParity };
        });
    }
    
    // Get all cells occupied by this piece at position (row0, col0, baseParity)
    // baseParity determines the orientation of the anchor triangle
    getOccupiedCells(row0, col0, baseParity = 0) {
        return this.offsets.map(({ drow, dcol, relativeParity }) => {
            const actualRow = row0 + drow;
            const actualCol = col0 + dcol;
            // The actual parity of this triangle is baseParity XOR relativeParity
            const actualParity = (baseParity + relativeParity) % 2;
            return {
                row: actualRow,
                col: actualCol,
                parity: actualParity
            };
        });
    }
    
    // Check if this piece can be placed at (row0, col0, baseParity) on the given board
    canPlaceAt(row0, col0, baseParity, board, occupiedCells, excludeId = -1, forbiddenCells = null) {
        const cells = this.getOccupiedCells(row0, col0, baseParity);
        
        for (const { row, col, parity } of cells) {
            // Check if cell is on the board
            if (!board.contains(row, col)) {
                return false;
            }
            
            // CRITICAL: Check if the triangle's parity matches the grid cell's parity
            // The grid determines which orientation (△ or ▽) exists at (row, col)
            const gridParity = board.grid.getParity(row, col);
            if (parity !== gridParity) {
                return false; // Can't place △ where ▽ should be (or vice versa)
            }
            
            // Check if cell is forbidden
            if (forbiddenCells && forbiddenCells.length > 0) {
                const isForbidden = forbiddenCells.some(fc => fc.row === row && fc.col === col);
                if (isForbidden) {
                    return false;
                }
            }
            
            // Check if cell is already occupied by another piece
            // In triangular lattice, only ONE triangle (of either parity) can occupy a (row,col) location
            // So we need to check BOTH parities
            const cellKey = `${row},${col},${parity}`;
            const oppositeParity = 1 - parity;
            const cellKeyOpposite = `${row},${col},${oppositeParity}`;
            
            const occupyingPiece = occupiedCells.get(cellKey);
            const occupyingPieceOpposite = occupiedCells.get(cellKeyOpposite);
            
            if ((occupyingPiece !== undefined && occupyingPiece !== excludeId) ||
                (occupyingPieceOpposite !== undefined && occupyingPieceOpposite !== excludeId)) {
                return false;
            }
        }
        
        return true;
    }
    
    // Get the bounding box of this piece
    getBounds() {
        if (this.offsets.length === 0) return { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 };
        
        const rows = this.offsets.map(({ drow }) => drow);
        const cols = this.offsets.map(({ dcol }) => dcol);
        
        return {
            minRow: Math.min(...rows),
            maxRow: Math.max(...rows),
            minCol: Math.min(...cols),
            maxCol: Math.max(...cols)
        };
    }
}

// Triangular State for triangular lattice puzzles
class TriKlotskiState {
    constructor(pieces, board, forbiddenCells = []) {
        this.pieces = pieces.map(p => ({...p})); // Array of {id, row, col, baseParity, piece}
        this.board = board;
        this.forbiddenCells = forbiddenCells.map(c => ({...c})); // Array of {row, col}
        this.grid = board.grid;
        
        // Spatial hash for O(1) occupancy tests: (row,col,parity) -> pieceId
        this.spatialHash = new Map();
        this.updateSpatialHash();
    }
    
    // Update spatial hash for O(1) occupancy tests
    updateSpatialHash() {
        this.spatialHash.clear();
        
        // Add pieces to spatial hash
        for (const pieceState of this.pieces) {
            const cells = pieceState.piece.getOccupiedCells(pieceState.row, pieceState.col, pieceState.baseParity || 0);
            for (const { row, col, parity } of cells) {
                const key = `${row},${col},${parity}`;
                this.spatialHash.set(key, pieceState.id);
            }
        }
        
        // Add forbidden cells to spatial hash (they block like immovable pieces)
        // Use a special ID 'FORBIDDEN' that will block all pieces
        for (const forbiddenCell of this.forbiddenCells) {
            // Forbidden cells block BOTH parities at that location
            for (let parity = 0; parity <= 1; parity++) {
                const key = `${forbiddenCell.row},${forbiddenCell.col},${parity}`;
                this.spatialHash.set(key, 'FORBIDDEN');
            }
        }
    }
    
    // Check if a cell is occupied
    isCellOccupied(row, col) {
        const key = `${row},${col}`;
        return this.spatialHash.has(key);
    }
    
    // Check if a cell is forbidden
    isCellForbidden(row, col) {
        return this.forbiddenCells.some(cell => 
            cell.row === row && cell.col === col
        );
    }
    
    // Get piece ID occupying a cell, or null if empty
    getPieceAtCell(row, col) {
        const key = `${row},${col}`;
        return this.spatialHash.get(key) || null;
    }

    // Direction-aware single-step blocking check for triangular lattice moves.
    // Returns { anchored: boolean, blockers: Set<number> } where anchored means the move is invalid
    // due to walls/forbidden/parity mismatch, and blockers are piece IDs that obstruct the move.
    _getTriStepBlockers(currCell, targetCell, movingPieceId, occupancyMap, skipPositions = null) {
        const blockers = new Set();

        const dr = targetCell.row - currCell.row;
        const dc = targetCell.col - currCell.col;

        // Only the 6 lattice step vectors are valid.
        const isHorizontal = dr === 0 && Math.abs(dc) === 2;
        const isDiagonal = Math.abs(dr) === 1 && Math.abs(dc) === 1;
        if (!isHorizontal && !isDiagonal) {
            return { anchored: true, blockers };
        }

        const checkOccupancyAt = (row, col, isDestination = false) => {
            // For destination, check skipPositions with specific parity
            if (isDestination && skipPositions) {
                const skipKey = `${row},${col},${targetCell.parity}`;
                if (skipPositions.has(skipKey)) return { anchored: false };
            }
            if (!this.board.contains(row, col)) return { anchored: false }; // Outside board can't be occupied

            for (let parity = 0; parity <= 1; parity++) {
                const key = `${row},${col},${parity}`;
                const blockingId = occupancyMap.get(key);
                if (blockingId === undefined || blockingId === movingPieceId) continue;
                if (blockingId === 'FORBIDDEN') return { anchored: true };
                blockers.add(blockingId);
            }

            return { anchored: false };
        };

        // For horizontal single-step moves (0, ±2), the piece slides past the triangle at (row, col±1).
        // That intermediate "gate" location must be empty (otherwise we'd pass through another triangle).
        if (isHorizontal) {
            const midCol = currCell.col + (dc / 2);
            const gateResult = checkOccupancyAt(currCell.row, midCol, false);
            if (gateResult.anchored) return { anchored: true, blockers };
        }

        // For diagonal single-step moves (±1,±1), check the two gate cells that the moving
        // edge sweeps through. For a move (dr, dc) = (±1, ±1):
        //   - gate1: (currCell.row + dr, currCell.col)  — shares a vertex with current, edge with dest
        //   - gate2: (currCell.row,      currCell.col + dc) — shares a vertex with current, edge with dest
        // Both must be empty (or part of the same moving group via skipPositions).
        if (isDiagonal) {
            const gate1 = { row: currCell.row + dr, col: currCell.col };
            const gate2 = { row: currCell.row,      col: currCell.col + dc };
            for (const gate of [gate1, gate2]) {
                if (!this.board.contains(gate.row, gate.col)) continue; // off-board = no obstruction
                if (skipPositions) {
                    // Allow if either parity of this gate cell is in the moving group
                    const skip0 = skipPositions.has(`${gate.row},${gate.col},0`);
                    const skip1 = skipPositions.has(`${gate.row},${gate.col},1`);
                    if (skip0 || skip1) continue;
                }
                const gateResult = checkOccupancyAt(gate.row, gate.col, false);
                if (gateResult.anchored) return { anchored: true, blockers };
            }
        }
        // Finally, check occupancy at destination (collision with other pieces / forbidden).
        const destResult = checkOccupancyAt(targetCell.row, targetCell.col, true);
        if (destResult.anchored) return { anchored: true, blockers };

        return { anchored: false, blockers };
    }
static regressionTestRhombus3() {
    console.group('[Regression] Length-3 rhombus two-piece interlock');

    // Board: 5-cell row.  Cells: (0,0)△ (0,1)▽ (0,2)△ (0,3)▽ (0,4)△
    // Piece A at (0,0), Piece B at (0,2), empty space at (0,4)
    // A can't move right alone (B blocks), B can't move right alone (would be fine actually)
    // Better test: diagonal interlock on a 2-row board
    //
    // Board (2 rows):
    //   row0: (0,0)△ (0,1)▽ (0,2)△
    //   row1: (1,1)▽ (1,2)△ (1,3)▽
    // Piece A at (0,1) parity 1, Piece B at (1,2) parity 0
    // They interlock diagonally: A moving down-right lands on (1,2) = blocked by B
    //                            B moving up-left  lands on (0,1) = blocked by A
    // Neither can move alone; together they should be able to move down-right
    // if there is room.

    const cells = new Set(['0,0','0,1','0,2','0,3','1,1','1,2','1,3','1,4']);
    const board = new TriBoard(2, 5, cells, 40, 'custom');

    const pieceA = new TriPiece(0, [[0,0]], 'A');
    const pieceB = new TriPiece(1, [[0,0]], 'B');

    // A at (0,1) parity=1, B at (1,2) parity=0
    // A's down-right target: (1,2) — occupied by B  → blocked alone
    // B's up-left target:    (0,1) — occupied by A  → blocked alone
    // Together down-right: A→(1,2), B→(2,3) — need (2,3) on board; it's not, so they're anchored
    // Let's instead put them where there IS room:
    // A at (0,1), B at (1,2), empty at (1,4) and (2,3)
    // Actually simplest: A at (0,1) parity1, B at (1,2) parity0
    // board has (2,3) so add it
    const cells2 = new Set(['0,0','0,1','0,2','0,3','1,1','1,2','1,3','1,4','2,2','2,3','2,4']);
    const board2 = new TriBoard(3, 5, cells2, 40, 'custom');

    const state = new TriKlotskiState(
        [
            { id: 0, row: 0, col: 1, baseParity: 1, piece: pieceA },
            { id: 1, row: 1, col: 2, baseParity: 1, piece: pieceB }
        ],
        board2
    );

    const singleMoves = state.getSingleMoves();
    const diagonalSingles = singleMoves.filter(m =>
        ['down-right','up-left','down-left','up-right'].includes(m.direction)
    );

    console.log('Single moves:', singleMoves.length, singleMoves.map(m => `piece${m.pieceId}:${m.direction}`));
    console.log('Diagonal singles:', diagonalSingles.length);

    // Neither piece should be able to move diagonally into the other's cell alone
    const aDownRight = singleMoves.find(m => m.pieceId === 0 && m.direction === 'down-right');
    const bUpLeft    = singleMoves.find(m => m.pieceId === 1 && m.direction === 'up-left');
    console.assert(!aDownRight, 'FAIL: A should not be able to move down-right alone (B is there)');
    console.assert(!bUpLeft,    'FAIL: B should not be able to move up-left alone (A is there)');
    if (!aDownRight) console.log('✅ A correctly blocked from down-right alone');
    if (!bUpLeft)    console.log('✅ B correctly blocked from up-left alone');

    const compoundMoves = state.generateCompoundMoves();
    console.log('Compound moves:', compoundMoves.length, compoundMoves.map(m => `[${m.pieceIds}]:${m.direction}`));

    const abDownRight = compoundMoves.find(m =>
        m.direction === 'down-right' &&
        m.pieceIds.includes(0) && m.pieceIds.includes(1)
    );
    console.assert(abDownRight, 'FAIL: {A,B} should have a compound down-right move');
    if (abDownRight) console.log('✅ {A,B} compound down-right move found');

    console.groupEnd();
    return { singleMoves, compoundMoves };
}
    // Check if a piece can move to a new position
    canMove(pieceId, newRow, newCol, newBaseParity = null) {
        const pieceState = this.pieces.find(p => p.id === pieceId);
        if (!pieceState) return false;
        
        // Use existing baseParity if not specified
        const baseParity = newBaseParity !== null ? newBaseParity : (pieceState.baseParity || 0);
        
        const deltaRow = newRow - pieceState.row;
        const deltaCol = newCol - pieceState.col;
        
        // For ANY non-zero move, check if path is blocked (single-step triangular physics)
        if (deltaRow !== 0 || deltaCol !== 0) {
            // Get current piece cells
            const currentCells = pieceState.piece.getOccupiedCells(
                pieceState.row,
                pieceState.col,
                baseParity
            );
            
            // Get destination cells
            const destCells = pieceState.piece.getOccupiedCells(
                newRow,
                newCol,
                baseParity
            );
            
            // For each cell in the piece, check if moving from current to dest is blocked
            for (let i = 0; i < currentCells.length; i++) {
                const currCell = currentCells[i];
                const destCell = destCells[i];

                const { anchored, blockers } = this._getTriStepBlockers(
                    currCell,
                    destCell,
                    pieceId,
                    this.spatialHash
                );

                if (anchored || blockers.size > 0) return false;
            }
        }
        
        // Check destination (after path check)
        if (!pieceState.piece.canPlaceAt(newRow, newCol, baseParity, this.board, this.spatialHash, pieceId, this.forbiddenCells)) {
            return false;
        }
        
        return true;
    }
    
    // Get all valid moves from current state
    getValidMoves() {
        const moves = this.getSingleMoves();
        
        // Add compound moves (for interlocked pieces)
        const compoundMoves = this.generateCompoundMoves();
        moves.push(...compoundMoves);
        
        return moves;
    }
    
    // Get single piece moves only
    getSingleMoves() {
        const moves = [];
        const directions = this.grid.getMoveDirections();
        
        for (const pieceState of this.pieces) {
            const baseParity = pieceState.baseParity || 0;
            for (const dir of directions) {
                const newRow = pieceState.row + dir.row;
                const newCol = pieceState.col + dir.col;
                
                // Explicitly pass baseParity to canMove
                if (this.canMove(pieceState.id, newRow, newCol, baseParity)) {
                    moves.push({
                        type: 'single',
                        pieceId: pieceState.id,
                        fromRow: pieceState.row,
                        fromCol: pieceState.col,
                        toRow: newRow,
                        toCol: newCol,
                        direction: dir.name
                    });
                }
            }
        }
        
        return moves;
    }
    
    // Generate compound moves for interlocked pieces
    generateCompoundMoves() {
        const moves = [];
        
        // Get all states reachable by single moves
        const singleMoveStates = new Set();
        const singleMoves = this.getSingleMoves();
        
        for (const move of singleMoves) {
            const newState = this.applyMove(move);
            const hash = newState.getHash();
            singleMoveStates.add(hash);
        }
        
        // All directions for triangular lattice
        const directions = this.grid.getMoveDirections();
        
        for (const direction of directions) {
            const dependencies = this.buildDependencyGraph(direction);
            const sccs = this.findStronglyConnectedComponents(dependencies);
            
            // Mark anchored SCCs (those that hit walls or forbidden cells)
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
            
            // Generate moves for each SCC using reachability
            const processedGroups = new Set();
            
            for (let i = 0; i < sccs.length; i++) {
                if (anchoredSCCs.has(sccs[i])) continue;
                
                // Build the full group from reachable SCCs
                const group = new Set();
                for (const j of reachable.get(i)) {
                    for (const pieceId of sccs[j]) {
                        group.add(pieceId);
                    }
                }
                
                // Skip single-piece groups (not compound moves)
                if (group.size <= 1) continue;
                
                // Create a canonical representation of the group for deduplication
                const groupKey = Array.from(group).sort((a, b) => a - b).join(',');
                if (processedGroups.has(groupKey)) {
                    continue; // Already processed this group
                }
                processedGroups.add(groupKey);
                // Skip if all pieces in the group can already move independently in this direction
                const allCanMoveSingly = Array.from(group).every(id => {
                    const ps = this.pieces.find(p => p.id === id);
                    const newRow = ps.row + direction.row;
                    const newCol = ps.col + direction.col;
                    return this.canMove(id, newRow, newCol, ps.baseParity || 0);
                });
                if (allCanMoveSingly) continue;
                // First check if the group can move together
                if (!this.canTranslateGroup(Array.from(group), direction)) {
                    continue;
                }
                
                // Generate compound move
                const move = {
                    type: 'compound',
                    pieceIds: Array.from(group),
                    direction: direction.name,
                    deltaRow: direction.row,
                    deltaCol: direction.col
                };
                
                // Only add if this compound move reaches a new state
                const newState = this.applyCompoundMove(move);
                const newHash = newState.getHash();
                
                if (!singleMoveStates.has(newHash)) {
                    moves.push(move);
                }
            }
        }
        
        return moves;
    }
    
    // Build dependency graph for a direction
    buildDependencyGraph(direction) {
        const dependencies = new Map();
        
        // Initialize
        for (const pieceState of this.pieces) {
            dependencies.set(pieceState.id, new Set());
        }
        
        // Check each piece's target cells
        for (const pieceState of this.pieces) {
            const cells = pieceState.piece.getOccupiedCells(
                pieceState.row, 
                pieceState.col, 
                pieceState.baseParity || 0
            );
            
            for (const cell of cells) {
                const targetRow = cell.row + direction.row;
                const targetCol = cell.col + direction.col;
                const targetParity = cell.parity; // Maintain the same parity as the source cell
                const currCell = cell;
                const targetCell = { row: targetRow, col: targetCol, parity: targetParity };
                
                // Check bounds
                if (!this.board.contains(targetRow, targetCol)) {
                    // This piece hits a wall - mark as anchored and stop checking
                    dependencies.set(pieceState.id, new Set(['ANCHORED']));
                    break;
                }
                
                // Check if target cell's grid parity matches piece's parity
                const gridParity = this.grid.getParity(targetRow, targetCol);
                if (targetParity !== gridParity) {
                    // Can't move to a cell with wrong parity - mark as anchored and stop checking
                    dependencies.set(pieceState.id, new Set(['ANCHORED']));
                    break;
                }
                
                // Check forbidden cells
                if (this.isCellForbidden(targetRow, targetCol)) {
                    // This piece hits a forbidden cell - mark as anchored and stop checking
                    dependencies.set(pieceState.id, new Set(['ANCHORED']));
                    break;
                }

                // Add dependencies based on actual single-step blockers (target + diagonal gate cells).
                const { anchored, blockers } = this._getTriStepBlockers(
                    currCell,
                    targetCell,
                    pieceState.id,
                    this.spatialHash
                );

                if (anchored) {
                    dependencies.set(pieceState.id, new Set(['ANCHORED']));
                    break;
                }

                for (const blockerId of blockers) {
                    dependencies.get(pieceState.id).add(blockerId);
                }
            }
        }
        
        return dependencies;
    }
    
    // Find strongly connected components (circular dependencies)
    findStronglyConnectedComponents(dependencies) {
        const visited = new Set();
        const onStack = new Set();
        const low = new Map();
        const ids = new Map();
        const sccs = [];
        let idCounter = 0;
        const stack = [];
        
        const dfs = (node) => {
            ids.set(node, idCounter);
            low.set(node, idCounter);
            idCounter++;
            visited.add(node);
            onStack.add(node);
            stack.push(node);
            
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
            
            // If this is a root node, pop the SCC from stack
            if (ids.get(node) === low.get(node)) {
                const scc = [];
                let w;
                do {
                    w = stack.pop();
                    onStack.delete(w);
                    scc.push(w);
                } while (w !== node);
                if (scc.length > 0) {
                    sccs.push(scc);
                }
            }
        };
        
        for (const pieceId of dependencies.keys()) {
            if (!visited.has(pieceId)) {
                dfs(pieceId);
            }
        }
        
        return sccs;
    }
    
    // Check if a group of pieces can all translate together in a direction
    canTranslateGroup(pieceIds, direction) {
        // Create temporary spatial hash EXCLUDING the moving pieces (key insight from rectangular grid!)
        const tempHash = new Map();
        for (const pieceState of this.pieces) {
            if (!pieceIds.includes(pieceState.id)) {
                const cells = pieceState.piece.getOccupiedCells(
                    pieceState.row,
                    pieceState.col,
                    pieceState.baseParity || 0
                );
                for (const cell of cells) {
                    // Store both parities since only one triangle can exist at (row,col)
                    const key = `${cell.row},${cell.col},${cell.parity}`;
                    tempHash.set(key, pieceState.id);
                    const keyOpp = `${cell.row},${cell.col},${1 - cell.parity}`;
                    tempHash.set(keyOpp, pieceState.id);
                }
            }
        }
        
        // Add forbidden cells to temp hash
        for (const forbiddenCell of this.forbiddenCells) {
            for (let parity = 0; parity <= 1; parity++) {
                const key = `${forbiddenCell.row},${forbiddenCell.col},${parity}`;
                tempHash.set(key, 'FORBIDDEN');
            }
        }
        
        // Build a set of all cells occupied by the moving group
        const groupPositions = new Set();
        for (const id of pieceIds) {
            const pieceState = this.pieces.find(p => p.id === id);
            const cells = pieceState.piece.getOccupiedCells(
                pieceState.row,
                pieceState.col,
                pieceState.baseParity || 0
            );
            for (const cell of cells) {
                groupPositions.add(`${cell.row},${cell.col},${cell.parity}`);
            }
        }
        
        // Check if all pieces in group can move to their new positions
        for (const id of pieceIds) {
            const pieceState = this.pieces.find(p => p.id === id);
            const newRow = pieceState.row + direction.row;
            const newCol = pieceState.col + direction.col;
            
            // Get current cells
            const currentCells = pieceState.piece.getOccupiedCells(
                pieceState.row,
                pieceState.col,
                pieceState.baseParity || 0
            );
            
            // Get target cells
            const targetCells = pieceState.piece.getOccupiedCells(
                newRow,
                newCol,
                pieceState.baseParity || 0
            );
            
            // Check each cell in the piece
            for (let i = 0; i < currentCells.length; i++) {
                const currCell = currentCells[i];
                const targetCell = targetCells[i];
                
                // Check bounds
                if (!this.board.contains(targetCell.row, targetCell.col)) {
                    return false;
                }
                
                // Check if target cell's grid parity matches piece's parity
                const gridParity = this.grid.getParity(targetCell.row, targetCell.col);
                if (targetCell.parity !== gridParity) {
                    return false;
                }

                const { anchored, blockers } = this._getTriStepBlockers(
                    currCell,
                    targetCell,
                    pieceState.id,
                    tempHash,
                    groupPositions
                );

                if (anchored || blockers.size > 0) return false;
            }
        }
        
        return true;
    }
    
    // Apply a compound move
    applyCompoundMove(move) {
        const newPieces = this.pieces.map(p => {
            if (move.pieceIds.includes(p.id)) {
                return {
                    ...p,
                    row: p.row + move.deltaRow,
                    col: p.col + move.deltaCol
                };
            }
            return {...p};
        });
        
        return new TriKlotskiState(newPieces, this.board, this.forbiddenCells);
    }
    
    // Apply a move and return new state
    applyMove(move) {
        if (move.type === 'compound') {
            return this.applyCompoundMove(move);
        }
        
        // Single piece move
        const newPieces = this.pieces.map(p => {
            if (p.id === move.pieceId) {
                return {
                    ...p,
                    row: move.toRow,
                    col: move.toCol
                };
            }
            return {...p};
        });
        
        return new TriKlotskiState(newPieces, this.board, this.forbiddenCells);
    }
    
    // Get hash string for state comparison
    getHash(treatShapesAsUnique = false) {
        if (treatShapesAsUnique) {
            // Treat each piece as unique based on ID
            const parts = [];
            const sortedPieces = [...this.pieces].sort((a, b) => a.id - b.id);
            for (const pieceState of sortedPieces) {
                const shape = this.getPieceShape(pieceState.piece);
                const baseParity = pieceState.baseParity || 0;
                parts.push(`${pieceState.id}[${shape}]:${pieceState.row},${pieceState.col},${baseParity}`);
            }
            return parts.join('|');
        }
        
        // Group pieces by shape signature (default: treat same shapes as identical)
        const groups = {};
        for (const pieceState of this.pieces) {
            const key = this.getPieceShape(pieceState.piece);
            if (!groups[key]) groups[key] = [];
            groups[key].push({
                row: pieceState.row,
                col: pieceState.col,
                baseParity: pieceState.baseParity || 0
            });
        }
        
        // Sort positions within each group, then sort groups
        const parts = [];
        for (const key of Object.keys(groups).sort()) {
            const positions = groups[key].sort((a, b) => {
                if (a.row !== b.row) return a.row - b.row;
                if (a.col !== b.col) return a.col - b.col;
                return a.baseParity - b.baseParity;
            });
            const posStr = positions.map(p => `${p.row},${p.col},${p.baseParity}`).join(';');
            parts.push(`${key}:${posStr}`);
        }
        
        return parts.join('|');
    }
    
    // Get normalized shape signature for a piece
    getPieceShape(piece) {
        const offsets = piece.offsets.map(({ drow, dcol }) => `${drow},${dcol}`);
        return offsets.sort().join(';');
    }
    
    // Check if this is a winning state (override in subclasses)
    isWinning() {
        return false; // Default: no winning condition
    }
    
    clone() {
        return new TriKlotskiState(this.pieces, this.board, this.forbiddenCells);
    }
}

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
        
        // Check if this is triangular or rectangular mode
        const isTriangular = initialState.pieces !== undefined;
        
        if (isTriangular) {
            console.log('Triangular mode - Initial state:');
            console.log('  Board:', initialState.board.rows, 'x', initialState.board.cols, initialState.board.shape);
            console.log('  Pieces:', initialState.pieces.length);
            console.log('  Hash:', startHash.substring(0, 60) + (startHash.length > 60 ? '...' : ''));
        } else {
            console.log('Rectangular mode - Initial state:');
            console.log('  is3D:', initialState.is3D);
            console.log('  Hash:', startHash.substring(0, 60) + (startHash.length > 60 ? '...' : ''));
            console.log('  Blocks:', initialState.blocks.map(b => `${b.width}x${b.height}@(${b.x},${b.y})`).join(', '));
        }

        while (queue.length > 0 && this.stateList.length < maxStates) {
            const currentState = queue.shift();
            const currentHash = currentState.getHash(treatShapesAsUnique);
            const currentId = this.states.get(currentHash).id;

            const moves = currentState.getValidMoves();
            
            // Debug: log moves for first state
            if (processed === 0) {
                console.log(`First state has ${moves.length} valid moves`);
                if (!isTriangular && currentState.is3D) {
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

                // Add edge (only in one direction to avoid duplicates)
                const newId = this.states.get(newHash).id;
                if (!this.states.get(currentHash).neighbors.includes(newId)) {
                    this.states.get(currentHash).neighbors.push(newId);
                    this.states.get(newHash).neighbors.push(currentId); // Add reverse neighbor
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
// Expose regression test globally
if (typeof window !== 'undefined') {
    window.regressionTestRhombus3 = TriKlotskiState.regressionTestRhombus3;
}