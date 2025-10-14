// Symmetry Detection and Enforcement for Graph Layouts

class SymmetryDetector {
    // Detect horizontal mirror symmetry pairs
    static detectMirrorPairs(graph) {
        const pairs = [];
        const processed = new Set();
        
        for (let i = 0; i < graph.getStateCount(); i++) {
            if (processed.has(i)) continue;
            
            const state = graph.getStateById(i);
            const mirrored = this.mirrorStateHorizontal(state);
            
            if (!mirrored) continue;
            
            const mirrorHash = mirrored.getHash();
            
            // Find the mirrored state in the graph
            const stateData = graph.states.get(mirrorHash);
            if (stateData && stateData.id !== i) {
                const mirrorId = stateData.id;
                pairs.push({
                    node1: i, 
                    node2: mirrorId, 
                    type: 'horizontal'
                });
                processed.add(i);
                processed.add(mirrorId);
            }
        }
        
        return pairs;
    }
    
    // Detect vertical mirror symmetry pairs
    static detectVerticalMirrorPairs(graph) {
        const pairs = [];
        const processed = new Set();
        
        for (let i = 0; i < graph.getStateCount(); i++) {
            if (processed.has(i)) continue;
            
            const state = graph.getStateById(i);
            const mirrored = this.mirrorStateVertical(state);
            
            if (!mirrored) continue;
            
            const mirrorHash = mirrored.getHash();
            
            // Find the mirrored state in the graph
            const stateData = graph.states.get(mirrorHash);
            if (stateData && stateData.id !== i) {
                const mirrorId = stateData.id;
                pairs.push({
                    node1: i, 
                    node2: mirrorId, 
                    type: 'vertical'
                });
                processed.add(i);
                processed.add(mirrorId);
            }
        }
        
        return pairs;
    }
    
    // Detect 180-degree rotational symmetry
    static detectRotationalSymmetry(graph) {
        const pairs = [];
        const processed = new Set();
        
        for (let i = 0; i < graph.getStateCount(); i++) {
            if (processed.has(i)) continue;
            
            const state = graph.getStateById(i);
            const rotated = this.rotateState180(state);
            
            if (!rotated) continue;
            
            const rotatedHash = rotated.getHash();
            
            // Find the rotated state in the graph
            const stateData = graph.states.get(rotatedHash);
            if (stateData && stateData.id !== i) {
                const rotatedId = stateData.id;
                pairs.push({
                    node1: i, 
                    node2: rotatedId, 
                    type: 'rotation180'
                });
                processed.add(i);
                processed.add(rotatedId);
            }
        }
        
        return pairs;
    }
    
    // Mirror state horizontally (flip across vertical axis)
    static mirrorStateHorizontal(state) {
        try {
            const mirrored = state.clone();
            for (const block of mirrored.blocks) {
                block.x = state.width - block.x - block.width;
            }
            return mirrored;
        } catch (e) {
            return null;
        }
    }
    
    // Mirror state vertically (flip across horizontal axis)
    static mirrorStateVertical(state) {
        try {
            const mirrored = state.clone();
            for (const block of mirrored.blocks) {
                block.y = state.height - block.y - block.height;
            }
            return mirrored;
        } catch (e) {
            return null;
        }
    }
    
    // Rotate state 180 degrees
    static rotateState180(state) {
        try {
            const rotated = state.clone();
            for (const block of rotated.blocks) {
                block.x = state.width - block.x - block.width;
                block.y = state.height - block.y - block.height;
            }
            return rotated;
        } catch (e) {
            return null;
        }
    }
    
    // Detect all symmetries
    static detectAllSymmetries(graph) {
        console.log('Detecting graph symmetries...');
        
        const horizontal = this.detectMirrorPairs(graph);
        const vertical = this.detectVerticalMirrorPairs(graph);
        const rotational = this.detectRotationalSymmetry(graph);
        
        console.log(`Found ${horizontal.length} horizontal mirror pairs`);
        console.log(`Found ${vertical.length} vertical mirror pairs`);
        console.log(`Found ${rotational.length} rotational symmetry pairs`);
        
        return {
            horizontal,
            vertical,
            rotational,
            all: [...horizontal, ...vertical, ...rotational]
        };
    }
}

// Symmetry Enforcement in Layouts
class SymmetricLayout {
    // Enforce mirror symmetry constraints
    static enforceMirrorSymmetry(positions, mirrorPairs, strength = 1.0) {
        for (const {node1, node2, type} of mirrorPairs) {
            const x1 = positions[node1 * 3];
            const y1 = positions[node1 * 3 + 1];
            const z1 = positions[node1 * 3 + 2];
            
            const x2 = positions[node2 * 3];
            const y2 = positions[node2 * 3 + 1];
            const z2 = positions[node2 * 3 + 2];
            
            if (type === 'horizontal') {
                // Mirror across YZ plane (X-axis symmetry)
                const centerX = (x1 + x2) / 2;
                const offsetX = Math.abs(x1 - centerX);
                
                // Blend current position with symmetric position
                positions[node1 * 3] = x1 * (1 - strength) + (centerX - offsetX) * strength;
                positions[node2 * 3] = x2 * (1 - strength) + (centerX + offsetX) * strength;
                
                // Y and Z should be the same
                const avgY = (y1 + y2) / 2;
                const avgZ = (z1 + z2) / 2;
                
                positions[node1 * 3 + 1] = y1 * (1 - strength) + avgY * strength;
                positions[node2 * 3 + 1] = y2 * (1 - strength) + avgY * strength;
                
                positions[node1 * 3 + 2] = z1 * (1 - strength) + avgZ * strength;
                positions[node2 * 3 + 2] = z2 * (1 - strength) + avgZ * strength;
                
            } else if (type === 'vertical') {
                // Mirror across XZ plane (Y-axis symmetry)
                const centerY = (y1 + y2) / 2;
                const offsetY = Math.abs(y1 - centerY);
                
                positions[node1 * 3 + 1] = y1 * (1 - strength) + (centerY - offsetY) * strength;
                positions[node2 * 3 + 1] = y2 * (1 - strength) + (centerY + offsetY) * strength;
                
                // X and Z should be the same
                const avgX = (x1 + x2) / 2;
                const avgZ = (z1 + z2) / 2;
                
                positions[node1 * 3] = x1 * (1 - strength) + avgX * strength;
                positions[node2 * 3] = x2 * (1 - strength) + avgX * strength;
                
                positions[node1 * 3 + 2] = z1 * (1 - strength) + avgZ * strength;
                positions[node2 * 3 + 2] = z2 * (1 - strength) + avgZ * strength;
                
            } else if (type === 'rotation180') {
                // 180-degree rotation around center
                const centerX = (x1 + x2) / 2;
                const centerY = (y1 + y2) / 2;
                const centerZ = (z1 + z2) / 2;
                
                const offsetX1 = x1 - centerX;
                const offsetY1 = y1 - centerY;
                const offsetZ1 = z1 - centerZ;
                
                positions[node1 * 3] = x1 * (1 - strength) + (centerX + offsetX1) * strength;
                positions[node1 * 3 + 1] = y1 * (1 - strength) + (centerY + offsetY1) * strength;
                positions[node1 * 3 + 2] = z1 * (1 - strength) + (centerZ + offsetZ1) * strength;
                
                positions[node2 * 3] = x2 * (1 - strength) + (centerX - offsetX1) * strength;
                positions[node2 * 3 + 1] = y2 * (1 - strength) + (centerY - offsetY1) * strength;
                positions[node2 * 3 + 2] = z2 * (1 - strength) + (centerZ - offsetZ1) * strength;
            }
        }
    }
    
    // Enforce all symmetries
    static enforceAllSymmetries(positions, symmetries, strength = 1.0) {
        if (symmetries.horizontal && symmetries.horizontal.length > 0) {
            this.enforceMirrorSymmetry(positions, symmetries.horizontal, strength);
        }
        if (symmetries.vertical && symmetries.vertical.length > 0) {
            this.enforceMirrorSymmetry(positions, symmetries.vertical, strength);
        }
        if (symmetries.rotational && symmetries.rotational.length > 0) {
            this.enforceMirrorSymmetry(positions, symmetries.rotational, strength);
        }
    }
}

