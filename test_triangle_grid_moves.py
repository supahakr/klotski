# Triangle Grid Compound Moves Test Suite

This test suite verifies the functionality of triangle grid compound moves in the klotski game.

## Overview

The following tests ensure that:
1. Horizontal gate blocking bugs are caught.
2. Diagonal gate blocking bugs are caught.
3. Parity anchoring bugs are caught.

The suite specifically tests the following scenarios:
- **Single Moves**: Ensure that individual moves function correctly.
- **Compound Moves**: Ensure that valid compound moves are generated when needed.
- **False Compound Generation**: Verify that incorrect compounds are not generated.

## Test Cases

### 1. Horizontal Gate Blocking Bug
- **Test Case 1.1**: Move A to Block Horizontal Gate
    - **Pre-conditions**: Setup a board where A blocks the horizontal gate.
    - **Expected Result**: A should not be able to move through the gate.

- **Test Case 1.2**: B moves allowing A to pass
    - **Setup**: B moves out of the way.
    - **Expected Result**: A moves through the gate successfully.

### 2. Diagonal Gate Blocking Bug
- **Test Case 2.1**: Move C to Block Diagonal Gate
    - **Pre-conditions**: Setup the board with C blocking the diagonal path.
    - **Expected Result**: C should not be able to obstruct the movement through the diagonal gate.

- **Test Case 2.2**: D moves to allow C to pass
    - **Setup**: D moves away from the diagonal gate.
    - **Expected Result**: C travels through the gate without hindrance.

### 3. Parity Anchoring Bug
- **Test Case 3.1**: Test Parity Anchoring
    - **Pre-conditions**: Initially arrange pieces to create a parity issue.
    - **Expected Result**: Moves should conform to parity rules, and pieces should not generate incorrect states.

### 4. Interlocks and Chain Movements
- **Test Case 4.1**: Test 2-Piece Interlocks
    - **Setup**: Configure two pieces that lock together.
    - **Expected Result**: They should move in unison as a compound move.

- **Test Case 4.2**: Test 3-Piece Chains
    - **Setup**: Arrange three interconnected pieces in a chain.
    - **Expected Result**: Movement of one should correctly trigger movement of interconnected pieces as needed.

- **Test Case 4.3**: Multiple Triangles
    - **Setup**: A piece with multiple triangle attachments should behave in a specific manner when moved.
    - **Expected Result**: Ensure that the movements respect the triangular grid rules without generating false compounds.

## Conclusion
This test suite is crucial for maintaining the integrity of the triangle grid moves in the klotski game, aiming to provide comprehensive coverage of potential issues that could arise during gameplay.