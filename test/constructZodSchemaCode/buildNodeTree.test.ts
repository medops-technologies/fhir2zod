import { testModules } from '../../src/constructZodSchemaCode';
import { ElementDefinitionSchemaR4 } from '../../src/types/StructureDefinitions/r4';
import { z } from 'zod';
import { describe, expect, test } from 'vitest';

const { buildNodeTree } = testModules;
type ElementDefinition = z.infer<typeof ElementDefinitionSchemaR4>;

describe('buildNodeTree', () => {
    // Helper function to create element definitions with minimal required properties
    const createElementDefinition = (path: string, min = 0, max = "1"): ElementDefinition => ({
        path,
        min,
        max,
        id: path
    } as ElementDefinition);

    test('should throw an error when given an empty array', () => {
        expect(() => buildNodeTree([])).toThrow('elementDefinitions is empty');
    });

    test('should create a single node with no children for a single element', () => {
        const element = createElementDefinition('Root');
        const result = buildNodeTree([element]);

        expect(result).toEqual({
            id: 'Root',
            element,
            children: []
        });
    });

    test('should correctly build a simple parent-child relationship', () => {
        const root = createElementDefinition('Root');
        const child = createElementDefinition('Root.child');
        const result = buildNodeTree([root, child]);

        expect(result).toEqual({
            id: 'Root',
            element: root,
            children: [
                {
                    id: 'Root.child',
                    element: child,
                    children: []
                }
            ]
        });
    });

    test('should correctly build a multi-level hierarchy', () => {
        const root = createElementDefinition('Root');
        const child = createElementDefinition('Root.child');
        const grandchild = createElementDefinition('Root.child.grandchild');
        const result = buildNodeTree([root, child, grandchild]);

        expect(result).toEqual({
            id: 'Root',
            element: root,
            children: [
                {
                    id: 'Root.child',
                    element: child,
                    children: [
                        {
                            id: 'Root.child.grandchild',
                            element: grandchild,
                            children: []
                        }
                    ]
                }
            ]
        });
    });

    test('should correctly handle sibling elements', () => {
        const root = createElementDefinition('Root');
        const child1 = createElementDefinition('Root.child1');
        const child2 = createElementDefinition('Root.child2');
        const result = buildNodeTree([root, child1, child2]);

        expect(result).toEqual({
            id: 'Root',
            element: root,
            children: [
                {
                    id: 'Root.child1',
                    element: child1,
                    children: []
                },
                {
                    id: 'Root.child2',
                    element: child2,
                    children: []
                }
            ]
        });
    });

    test('should correctly handle complex mixed hierarchies', () => {
        const root = createElementDefinition('Root');
        const childA = createElementDefinition('Root.A');
        const childAA1 = createElementDefinition('Root.A.A1');
        const childB = createElementDefinition('Root.B');
        const childB1 = createElementDefinition('Root.B.B1');

        const result = buildNodeTree([root, childA, childAA1, childB, childB1]);

        expect(result).toEqual({
            id: 'Root',
            element: root,
            children: [
                {
                    id: 'Root.A',
                    element: childA,
                    children: [
                        {
                            id: 'Root.A.A1',
                            element: childAA1,
                            children: []
                        }
                    ]
                },
                {
                    id: 'Root.B',
                    element: childB,
                    children: [
                        {
                            id: 'Root.B.B1',
                            element: childB1,
                            children: []
                        }
                    ]
                }
            ]
        });
    });

    test('should correctly handle non-contiguous elements', () => {
        // Test a case where we go Root -> Root.A -> Root.A.A1 -> Root.B
        // This requires correct stack management to go back up the tree
        const root = createElementDefinition('Root');
        const childA = createElementDefinition('Root.A');
        const childAA1 = createElementDefinition('Root.A.A1');
        const childB = createElementDefinition('Root.B');

        const result = buildNodeTree([root, childA, childAA1, childB]);

        expect(result).toEqual({
            id: 'Root',
            element: root,
            children: [
                {
                    id: 'Root.A',
                    element: childA,
                    children: [
                        {
                            id: 'Root.A.A1',
                            element: childAA1,
                            children: []
                        }
                    ]
                },
                {
                    id: 'Root.B',
                    element: childB,
                    children: []
                }
            ]
        });
    });

    test('should correctly handle complex stack management', () => {
        // Test a case with multiple level changes requiring stack management
        const elements = [
            createElementDefinition('Root'),
            createElementDefinition('Root.A'),
            createElementDefinition('Root.A.A1'),
            createElementDefinition('Root.A.A2'),
            createElementDefinition('Root.B'),
            createElementDefinition('Root.B.B1'),
            createElementDefinition('Root.B.B1.B11'),
            createElementDefinition('Root.B.B2'),
            createElementDefinition('Root.C')
        ];

        const result = buildNodeTree(elements);

        // Verify the complete structure
        expect(result).toEqual({
            id: 'Root',
            element: elements[0],
            children: [
                {
                    id: 'Root.A',
                    element: elements[1],
                    children: [
                        {
                            id: 'Root.A.A1',
                            element: elements[2],
                            children: []
                        },
                        {
                            id: 'Root.A.A2',
                            element: elements[3],
                            children: []
                        }
                    ]
                },
                {
                    id: 'Root.B',
                    element: elements[4],
                    children: [
                        {
                            id: 'Root.B.B1',
                            element: elements[5],
                            children: [
                                {
                                    id: 'Root.B.B1.B11',
                                    element: elements[6],
                                    children: []
                                }
                            ]
                        },
                        {
                            id: 'Root.B.B2',
                            element: elements[7],
                            children: []
                        }
                    ]
                },
                {
                    id: 'Root.C',
                    element: elements[8],
                    children: []
                }
            ]
        });
    });
});
