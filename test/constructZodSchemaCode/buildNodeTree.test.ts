import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { testModules } from '../../src/constructZodSchemaCode';
import { ElementDefinitionSchemaR4 } from '../../src/types/StructureDefinitions/r4';

const { buildNodeTree } = testModules;
type ElementDefinition = z.infer<typeof ElementDefinitionSchemaR4>;

describe('buildNodeTree', () => {
    // Helper function to create element definitions with minimal required properties
    const createElementDefinition = (path: string, type?: any[], min = 0, max = "1"): ElementDefinition => ({
        path,
        min,
        max,
        id: path,
        type
    } as ElementDefinition);

    // Helper function to create type definitions
    const createType = (code: string): ElementDefinition['type'][0] => ({
        code
    } as ElementDefinition['type'][0]);

    test('should throw an error when given an empty array', () => {
        expect(() => buildNodeTree([], 'resource')).toThrow('elementDefinitions is empty');
    });

    test('should create a single node with no children for a single element', () => {
        const element = createElementDefinition('Root');
        const result = buildNodeTree([element], 'resource');

        expect(result).toEqual({
            id: 'Root',
            element,
            children: [{
                id: 'Root.resourceType',
                element: {
                    path: 'Root.resourceType',
                    id: 'Root.resourceType',
                    type: [{ code: 'string' }],
                    min: 0,
                },
                children: []
            }]
        });
    });

    test('should correctly build a simple parent-child relationship', () => {
        const root = createElementDefinition('Root');
        const child = createElementDefinition('Root.child');
        const result = buildNodeTree([root, child], 'resource');

        expect(result).toEqual({
            id: 'Root',
            element: root,
            children: [
                {
                    id: 'Root.resourceType',
                    element: {
                        path: 'Root.resourceType',
                        id: 'Root.resourceType',
                        type: [{ code: 'string' }],
                        min: 0,
                    },
                    children: []
                },
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
        const result = buildNodeTree([root, child, grandchild], 'resource');

        expect(result).toEqual({
            id: 'Root',
            element: root,
            children: [
                {
                    id: 'Root.resourceType',
                    element: {
                        path: 'Root.resourceType',
                        id: 'Root.resourceType',
                        type: [{ code: 'string' }],
                        min: 0,
                    },
                    children: []
                },
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
        const result = buildNodeTree([root, child1, child2], 'resource');

        expect(result).toEqual({
            id: 'Root',
            element: root,
            children: [
                {
                    id: 'Root.resourceType',
                    element: {
                        path: 'Root.resourceType',
                        id: 'Root.resourceType',
                        type: [{ code: 'string' }],
                        min: 0,
                    },
                    children: []
                },
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

        const result = buildNodeTree([root, childA, childAA1, childB, childB1], 'resource');

        expect(result).toEqual({
            id: 'Root',
            element: root,
            children: [
                {
                    id: 'Root.resourceType',
                    element: {
                        path: 'Root.resourceType',
                        id: 'Root.resourceType',
                        type: [{ code: 'string' }],
                        min: 0,
                    },
                    children: []
                },
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

        const result = buildNodeTree([root, childA, childAA1, childB], 'resource');

        expect(result).toEqual({
            id: 'Root',
            element: root,
            children: [
                {
                    id: 'Root.resourceType',
                    element: {
                        path: 'Root.resourceType',
                        id: 'Root.resourceType',
                        type: [{ code: 'string' }],
                        min: 0,
                    },
                    children: []
                },
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

        const result = buildNodeTree(elements, 'resource');

        // Verify the complete structure
        expect(result).toEqual({
            id: 'Root',
            element: elements[0],
            children: [
                {
                    id: 'Root.resourceType',
                    element: {
                        path: 'Root.resourceType',
                        id: 'Root.resourceType',
                        type: [{ code: 'string' }],
                        min: 0,
                    },
                    children: []
                },
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

    describe('Choice Type Tests', () => {
        test('should expand [x] form paths into concrete paths with correct min/max values', () => {
            const elements = [
                createElementDefinition('Patient'),
                createElementDefinition('Patient.value[x]', [
                    createType('string'),
                    createType('boolean'),
                    createType('CodeableConcept')
                ], 0, "1")
            ];

            const result = buildNodeTree(elements, 'resource');

            expect(result).toEqual({
                id: 'Patient',
                element: elements[0],
                children: [
                    {
                        id: 'Patient.resourceType',
                        element: {
                            path: 'Patient.resourceType',
                            id: 'Patient.resourceType',
                            type: [{ code: 'string' }],
                            min: 0,
                        },
                        children: []
                    },
                    {
                        id: 'Patient.valueString',
                        element: expect.objectContaining({
                            path: 'Patient.valueString',
                            type: [createType('string')],
                            min: 0,
                            max: "1"
                        }),
                        children: []
                    },
                    {
                        id: 'Patient.valueBoolean',
                        element: expect.objectContaining({
                            path: 'Patient.valueBoolean',
                            type: [createType('boolean')],
                            min: 0,
                            max: "1"
                        }),
                        children: []
                    },
                    {
                        id: 'Patient.valueCodeableConcept',
                        element: expect.objectContaining({
                            path: 'Patient.valueCodeableConcept',
                            type: [createType('CodeableConcept')],
                            min: 0,
                            max: "1"
                        }),
                        children: []
                    }
                ]
            });
        });

        test('should prioritize concrete paths over [x] form paths', () => {
            const elements = [
                createElementDefinition('Patient'),
                createElementDefinition('Patient.value[x]', [
                    createType('string'),
                    createType('boolean'),
                    createType('CodeableConcept')
                ], 0, "1"),
                createElementDefinition('Patient.valueCodeableConcept', [
                    createType('CodeableConcept')
                ], 1, "*"),  // Required and multiple
                createElementDefinition('Patient.valueCodeableConcept.coding', [
                    createType('Coding')
                ], 0, "*")
            ];

            const result = buildNodeTree(elements, 'resource');

            expect(result).toEqual({
                id: 'Patient',
                element: elements[0],
                children: [
                    {
                        id: 'Patient.resourceType',
                        element: {
                            path: 'Patient.resourceType',
                            id: 'Patient.resourceType',
                            type: [{ code: 'string' }],
                            min: 0,
                        },
                        children: []
                    },
                    {
                        id: 'Patient.valueString',
                        element: expect.objectContaining({
                            path: 'Patient.valueString',
                            type: [createType('string')],
                            min: 0,
                            max: "1"
                        }),
                        children: []
                    },
                    {
                        id: 'Patient.valueBoolean',
                        element: expect.objectContaining({
                            path: 'Patient.valueBoolean',
                            type: [createType('boolean')],
                            min: 0,
                            max: "1"
                        }),
                        children: []
                    },
                    {
                        id: 'Patient.valueCodeableConcept',
                        element: expect.objectContaining({
                            path: 'Patient.valueCodeableConcept',
                            type: [createType('CodeableConcept')],
                            min: 1,
                            max: "*"
                        }),
                        children: [
                            {
                                id: 'Patient.valueCodeableConcept.coding',
                                element: expect.objectContaining({
                                    path: 'Patient.valueCodeableConcept.coding',
                                    type: [createType('Coding')],
                                    min: 0,
                                    max: "*"
                                }),
                                children: []
                            }
                        ]
                    }
                ]
            });
        });

        test('should handle multiple [x] forms with different min/max values in concrete paths', () => {
            const elements = [
                createElementDefinition('Patient'),
                createElementDefinition('Patient.value[x]', [
                    createType('string'),
                    createType('boolean'),
                    createType('CodeableConcept'),
                    createType('Reference')
                ], 0, "1"),
                createElementDefinition('Patient.valueCodeableConcept', [
                    createType('CodeableConcept')
                ], 1, "*"),  // Required and multiple
                createElementDefinition('Patient.valueReference', [
                    createType('Reference')
                ], 0, "1"),  // Optional and single
                createElementDefinition('Patient.valueReference.reference', [
                    createType('string')
                ], 1, "1")   // Required and single
            ];

            const result = buildNodeTree(elements, 'resource');

            expect(result).toEqual({
                id: 'Patient',
                element: elements[0],
                children: [
                    {
                        id: 'Patient.resourceType',
                        element: {
                            path: 'Patient.resourceType',
                            id: 'Patient.resourceType',
                            type: [{ code: 'string' }],
                            min: 0,
                        },
                        children: []
                    },
                    {
                        id: 'Patient.valueString',
                        element: expect.objectContaining({
                            path: 'Patient.valueString',
                            type: [createType('string')],
                            min: 0,
                            max: "1"
                        }),
                        children: []
                    },
                    {
                        id: 'Patient.valueBoolean',
                        element: expect.objectContaining({
                            path: 'Patient.valueBoolean',
                            type: [createType('boolean')],
                            min: 0,
                            max: "1"
                        }),
                        children: []
                    },
                    {
                        id: 'Patient.valueCodeableConcept',
                        element: expect.objectContaining({
                            path: 'Patient.valueCodeableConcept',
                            type: [createType('CodeableConcept')],
                            min: 1,
                            max: "*"
                        }),
                        children: []
                    },
                    {
                        id: 'Patient.valueReference',
                        element: expect.objectContaining({
                            path: 'Patient.valueReference',
                            type: [createType('Reference')],
                            min: 0,
                            max: "1"
                        }),
                        children: [
                            {
                                id: 'Patient.valueReference.reference',
                                element: expect.objectContaining({
                                    path: 'Patient.valueReference.reference',
                                    type: [createType('string')],
                                    min: 1,
                                    max: "1"
                                }),
                                children: []
                            }
                        ]
                    }
                ]
            });
        });
        test('nested [x]', () => {
            const elements = [
                createElementDefinition('Patient'),
                createElementDefinition('Patient.value[x]', [
                    createType('CodeableConcept')
                ], 0, "1"),
                createElementDefinition('Patient.value[x].coding', [
                    createType('Coding')
                ], 0, "*")
            ];

            const result = buildNodeTree(elements, 'resource');

            expect(result).toEqual({
                id: 'Patient',
                element: elements[0],
                children: [
                    {
                        id: 'Patient.resourceType',
                        element: {
                            path: 'Patient.resourceType',
                            id: 'Patient.resourceType',
                            type: [{ code: 'string' }],
                            min: 0,
                        },
                        children: []
                    },
                    {
                        id: 'Patient.valueCodeableConcept',
                        element: expect.objectContaining({
                            path: 'Patient.valueCodeableConcept',
                            type: [createType('CodeableConcept')],
                            min: 0,
                            max: "1"
                        }),
                        children: [
                            {
                                id: 'Patient.valueCodeableConcept.coding',
                                element: expect.objectContaining({
                                    path: 'Patient.valueCodeableConcept.coding',
                                    type: [createType('Coding')],
                                    min: 0,
                                    max: "*"
                                }),
                                children: []
                            }
                        ]
                    }
                ]
            });
        });
        test('nested [x] with other choice of types elements', () => {
            const elements = [
                createElementDefinition('Patient'),
                createElementDefinition('Patient.value[x]', [
                    createType('CodeableConcept')
                ], 0, "1"),
                createElementDefinition('Patient.value[x].coding', [
                    createType('Coding')
                ], 0, "*"),
                createElementDefinition('Patient.abc', [
                    createType('CodeableConcept')
                ], 0, "1"),
                createElementDefinition('Patient.abc.value[x]', [
                    createType('CodeableConcept')
                ], 0, "1"),
                createElementDefinition('Patient.abc.value[x].coding', [
                    createType('Coding')
                ], 0, "*")
            ];

            const result = buildNodeTree(elements, 'resource');

            expect(result).toEqual({
                id: 'Patient',
                element: elements[0],
                children: [
                    {
                        id: 'Patient.resourceType',
                        element: {
                            path: 'Patient.resourceType',
                            id: 'Patient.resourceType',
                            type: [{ code: 'string' }],
                            min: 0,
                        },
                        children: []
                    },
                    {
                        id: 'Patient.valueCodeableConcept',
                        element: expect.objectContaining({
                            path: 'Patient.valueCodeableConcept',
                            type: [createType('CodeableConcept')],
                            min: 0,
                            max: "1"
                        }),
                        children: [
                            {
                                id: 'Patient.valueCodeableConcept.coding',
                                element: expect.objectContaining({
                                    path: 'Patient.valueCodeableConcept.coding',
                                    type: [createType('Coding')],
                                    min: 0,
                                    max: "*"
                                }),
                                children: []
                            }
                        ]
                    },
                    {
                        id: 'Patient.abc',
                        element: expect.objectContaining({
                            id: 'Patient.abc',
                            path: 'Patient.abc',
                            type: [createType('CodeableConcept')],
                            max: "1",
                            min: 0,
                        }),
                        children: [
                            {
                                id: 'Patient.abc.valueCodeableConcept',
                                element: expect.objectContaining({
                                    path: 'Patient.abc.valueCodeableConcept',
                                    type: [createType('CodeableConcept')],
                                    min: 0,
                                    max: "1"
                                }),
                                children: [
                                    {
                                        id: 'Patient.abc.valueCodeableConcept.coding',
                                        element: expect.objectContaining({
                                            path: 'Patient.abc.valueCodeableConcept.coding',
                                            type: [createType('Coding')],
                                            min: 0,
                                            max: "*"
                                        }),
                                        children: []
                                    }
                                ]
                            }
                        ]
                    }
                ]
            });
        });
        test('nested [x] with multiple types should throw an error', () => {
            const elements = [
                createElementDefinition('Patient'),
                createElementDefinition('Patient.value[x]', [
                    createType('CodeableConcept'),
                    createType('string'),
                ], 0, "1"),
                createElementDefinition('Patient.value[x].coding', [
                    createType('Coding'),
                ], 0, "*"),
            ];

            expect(() => buildNodeTree(elements, 'resource')).toThrow('path Patient.value[x].coding has multiple type definitions of basePath: Patient.value');
        });
    });
});
