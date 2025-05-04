import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { testModules } from '../../src/merger'
import { ElementDefinitionSchemaR4 } from '../../src/types/StructureDefinitions/r4'

const { expandTree, buildTree, buildHasChildren, buildElementMap } = testModules
type ElementDefinition = z.infer<typeof ElementDefinitionSchemaR4>

describe('ExpandTree', () => {
    const createType = (code: string, extension?: any[]): ElementDefinition['type'][0] => ({
        code,
        extension
    } as ElementDefinition['type'][0]);

    // Helper function to create an extension for FHIR type
    const createFhirTypeExtension = (valueUrl: string) => ({
        url: "http://hl7.org/fhir/StructureDefinition/structuredefinition-fhir-type",
        valueUrl
    });

    // Helper function to create a non-FHIR extension
    const createOtherExtension = (url: string, valueString: string) => ({
        url,
        valueString
    });

    // テスト用のモックデータ
    const createElementDefinition = (path: string, min = 0, max = "1", type = [{ code: 'Element' }]) => ({
        path,
        id: path,
        min,
        max,
        type,
        short: `Short description for ${path}`,
        definition: `Definition for ${path}`,
        comment: `Comment for ${path}`,
        requirements: `Requirements for ${path}`,
        alias: [`alias1-${path}`, `alias2-${path}`],
        mapping: [
            { identity: 'map1', map: `map1-${path}` },
            { identity: 'map2', map: `map2-${path}` }
        ]
    })

    const createStructureDefinition = (id: string, type: string, elements: any[]) => ({
        resourceType: 'StructureDefinition' as const,
        id,
        url: `http://hl7.org/fhir/StructureDefinition/${id}`,
        name: id,
        status: 'active' as const,
        date: '2024-01-01',
        fhirVersion: '4.0.1',
        kind: 'complex-type' as const,
        abstract: false,
        type,
        baseDefinition: 'http://hl7.org/fhir/StructureDefinition/Element',
        derivation: 'specialization' as const,
        snapshot: {
            element: elements
        }
    })

    it('should expand a simple tree with no choice types', () => {
        const baseElements = [
            { path: 'root', type: [{ code: 'Element' }] },
            { path: 'root.child1', type: [{ code: 'Element' }] }
        ]
        const diffElements = [
            { path: 'root.child1', type: [{ code: 'Element' }] }
        ]
        const structureDefinitionMap = new Map()
        structureDefinitionMap.set('Element', {
            snapshot: {
                element: [
                    { path: 'Element', type: [{ code: 'Element' }] },
                    { path: 'Element.value', type: [{ code: 'string' }] }
                ]
            }
        })

        const baseTree = buildTree(baseElements)
        const hasChildren = buildHasChildren(diffElements)
        const expandedTree = expandTree(baseTree, hasChildren, structureDefinitionMap)

        expect(expandedTree.children.size).toBe(1)
        expect(expandedTree.children.get('root.child1')?.children.size).toBe(0)
        expect(expandedTree.children.get('root.child1')?.children.get('root.child1.value')).toBeUndefined()
    })

    it('should handle choice type with [x] in diff', () => {
        const baseElements = [
            { path: 'root', type: [{ code: 'Element' }] },
            { path: 'root.value[x]', type: [{ code: 'Element' }] }
        ]
        const diffElements = [
            { path: 'root.value[x]', type: [{ code: 'Element' }] }
        ]
        const structureDefinitionMap = new Map()
        structureDefinitionMap.set('Element', {
            snapshot: {
                element: [
                    { path: 'Element', type: [{ code: 'Element' }] },
                    { path: 'Element.value[x]', type: [{ code: 'string' }] }
                ]
            }
        })

        const baseTree = buildTree(baseElements)
        const hasChildren = buildHasChildren(diffElements)
        const expandedTree = expandTree(baseTree, hasChildren, structureDefinitionMap)

        expect(expandedTree.children.get('root.value[x]')).toBeDefined()
        expect(expandedTree.children.get('root.value[x]')?.children.size).toBe(0)
    })

    it('should handle choice type with specific type in diff', () => {
        const baseElements = [
            { path: 'root', type: [{ code: 'Element' }] },
            { path: 'root.a', type: [{ code: 'CodeableConcept' }] },
        ]
        const diffElements = [
            { path: 'root.a.coding.valueString', type: [{ code: 'string' }], min: 1},
            { path: 'root.a.coding.valueBoolean', type: [{ code: 'boolean' }], min: 2 }
        ]
        const structureDefinitionMap = new Map()
        structureDefinitionMap.set('CodeableConcept', {
            snapshot: {
                element: [
                    { path: 'CodeableConcept', type: [{ code: 'CodeableConcept' }] },
                    { path: 'CodeableConcept.coding', type: [{ code: 'Coding' }] },
                ]
            }
        })
        structureDefinitionMap.set('Coding', {
            snapshot: {
                element: [
                    { path: 'Coding', type: [{ code: 'Coding' }] },
                    { path: 'Coding.code', type: [{ code: 'string' }] },
                    { path: 'Coding.display', type: [{ code: 'string' }] },
                    { path: 'Coding.system', type: [{ code: 'string' }] },
                    { path: 'Coding.value[x]', type: [{ code: 'string' }, { code: 'boolean' }], min: 0 },
                ]
            }
        })

        const baseTree = buildTree(baseElements)
        const hasChildren = buildHasChildren(diffElements)
        const expandedTree = expandTree(baseTree, hasChildren, structureDefinitionMap)

        expect(expandedTree.children.get('root.a')).toBeDefined()
        const a = expandedTree.children.get('root.a')
        expect(a?.children.get('root.a')).toBeUndefined()
        expect(a?.children.get('root.a.coding')).toBeDefined()
        const coding = a?.children.get('root.a.coding')
        expect(coding?.children.get('root.a.coding.code')).toBeDefined()
        expect(coding?.children.get('root.a.coding.valueString')).toBeDefined()
        expect(coding?.children.get('root.a.coding.valueString')?.element.min).toBe(0) // because ExpandTree does not merge the content of the element. It just expands the element tree.
        expect(coding?.children.get('root.a.coding.valueString')?.children.size).toBe(0)
        expect(coding?.children.get('root.a.coding.valueBoolean')).toBeDefined()
        expect(coding?.children.get('root.a.coding.valueBoolean')?.children.size).toBe(0)
        expect(coding?.children.get('root.a.coding.value[x]')).toBeDefined()
    })

    it('should handle multiple choice types in diff', () => {
        const baseElements = [
            { path: 'root', type: [{ code: 'Element' }] },
            { path: 'root.value[x]', type: [{ code: 'string' }, { extension: [{ url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-fhir-type', valueUrl: 'integer' }] }] }
        ]
        const diffElements = [
            { path: 'root.valueString', type: [{ code: 'string' }] },
            { path: 'root.valueInteger', type: [{ code: 'integer' }] }
        ]
        const structureDefinitionMap = new Map()
        structureDefinitionMap.set('Element', {
            snapshot: {
                element: [
                    { path: 'Element', type: [{ code: 'Element' }] },
                    { path: 'Element.value[x]', type: [{ code: 'string' }] }
                ]
            }
        })

        const baseTree = buildTree(baseElements)
        const hasChildren = buildHasChildren(diffElements)
        const expandedTree = expandTree(baseTree, hasChildren, structureDefinitionMap)

        expect(expandedTree.children.get('root.valueString')).toBeDefined()
        expect(expandedTree.children.get('root.valueInteger')).toBeDefined()
        expect(expandedTree.children.get('root.value[x]')).toBeDefined()
    })

    it('should handle mixed choice types and normal elements', () => {
        const baseElements = [
            { path: 'root', type: [{ code: 'Element' }] },
            { path: 'root.value[x]', type: [{ code: 'string' }] },
            { path: 'root.normal', type: [{ code: 'Element' }] }
        ]
        const diffElements = [
            { path: 'root.valueString', type: [{ code: 'string' }] },
            { path: 'root.normal', type: [{ code: 'Element' }] }
        ]
        const structureDefinitionMap = new Map()
        structureDefinitionMap.set('Element', {
            snapshot: {
                element: [
                    { path: 'Element', type: [{ code: 'Element' }] },
                    { path: 'Element.value[x]', type: [{ code: 'string' }] },
                    { path: 'Element.normal', type: [{ code: 'string' }] }
                ]
            }
        })

        const baseTree = buildTree(baseElements)
        const hasChildren = buildHasChildren(diffElements)
        const expandedTree = expandTree(baseTree, hasChildren, structureDefinitionMap)

        expect(expandedTree.children.get('root.valueString')).toBeDefined()
        expect(expandedTree.children.get('root.normal')).toBeDefined()
    })

    it('should throw error when structure definition is not found', () => {
        const baseElements = [
            { path: 'root', type: [{ code: 'NonExistentType' }] }
        ]
        const diffElements = [
            { path: 'root.id', type: [{ code: 'string' }] }
        ]
        const structureDefinitionMap = new Map()

        const baseTree = buildTree(baseElements)
        const hasChildren = buildHasChildren(diffElements)

        expect(() => {
            expandTree(baseTree, hasChildren, structureDefinitionMap)
        }).toThrow('currentElementDefinition not found: NonExistentType')
    })

    it('should throw error when multiple types are specified', () => {
        const baseElements = [
            { path: 'root', type: [{ code: 'Type1' }, { code: 'Type2' }] }
        ]
        const diffElements = [
            { path: 'root.id', type: [{ code: 'string' }] }
        ]
        const structureDefinitionMap = new Map()
        structureDefinitionMap.set('Type1', {
            snapshot: { element: [] }
        })
        structureDefinitionMap.set('Type2', {
            snapshot: { element: [] }
        })

        const baseTree = buildTree(baseElements)
        const hasChildren = buildHasChildren(diffElements)

        expect(() => {
            expandTree(baseTree, hasChildren, structureDefinitionMap)
        }).toThrow('currentElementTypes.length > 1')
    })

    it('should expand valueCodeableConcept with its children', () => {
        const baseDefinitions = [
            createElementDefinition('SomeResource'),
            createElementDefinition('SomeResource.value[x]', 0, '1', [{ code: 'CodeableConcept' }])
        ]

        const diffDefinitions = [
            createElementDefinition('SomeResource.valueCodeableConcept'),
            createElementDefinition('SomeResource.valueCodeableConcept.coding'),
            createElementDefinition('SomeResource.valueCodeableConcept.coding.system'),
            createElementDefinition('SomeResource.valueCodeableConcept.coding.code'),
            createElementDefinition('SomeResource.valueCodeableConcept.text')
        ]

        const structureDefinitionMap = new Map([
            ['CodeableConcept', createStructureDefinition('CodeableConcept', 'CodeableConcept', [
                createElementDefinition('CodeableConcept'),
                createElementDefinition('CodeableConcept.coding', 0, '1', [{ code: 'Coding' }]),
                createElementDefinition('CodeableConcept.text', 0, '1', [{ code: 'string' }])
            ])],
            ['Coding', createStructureDefinition('Coding', 'Coding', [
                createElementDefinition('Coding'),
                createElementDefinition('Coding.system', 0, '1', [{ code: 'uri' }]),
                createElementDefinition('Coding.code', 0, '1', [{ code: 'code' }]),
                createElementDefinition('Coding.display', 0, '1', [{ code: 'string' }])
            ])]
        ])

        const baseTree = buildTree(baseDefinitions)
        const hasChildren = buildHasChildren(diffDefinitions)
        const result = expandTree(baseTree, hasChildren, structureDefinitionMap)
        
        // valueCodeableConceptが展開されていることを確認
        const valueCodeableConcept = result.children.get('SomeResource.valueCodeableConcept')
        expect(valueCodeableConcept).toBeDefined()
        expect(valueCodeableConcept?.element.type).toEqual([{ code: 'CodeableConcept' }])

        // 子要素が展開されていることを確認
        const coding = valueCodeableConcept?.children.get('SomeResource.valueCodeableConcept.coding')
        expect(coding).toBeDefined()
        expect(coding?.element.type).toEqual([{ code: 'Coding' }])

        const codingSystem = coding?.children.get('SomeResource.valueCodeableConcept.coding.system')
        expect(codingSystem).toBeDefined()
        expect(codingSystem?.element.type).toEqual([{ code: 'uri' }])

        const text = valueCodeableConcept?.children.get('SomeResource.valueCodeableConcept.text')
        expect(text).toBeDefined()
        expect(text?.element.type).toEqual([{ code: 'string' }])
    })

    it('should throw error when parent type does not match child type', () => {
        const baseDefinitions = [
            createElementDefinition('SomeResource'),
            createElementDefinition('SomeResource.value[x]', 0, '1', [{ code: 'string' }])
        ]

        const diffDefinitions = [
            createElementDefinition('SomeResource.valueCodeableConcept'),
            createElementDefinition('SomeResource.valueCodeableConcept.coding')
        ]

        const structureDefinitionMap = new Map([
            ['CodeableConcept', createStructureDefinition('CodeableConcept', 'CodeableConcept', [
                createElementDefinition('CodeableConcept'),
                createElementDefinition('CodeableConcept.coding')
            ])]
        ])

        const baseTree = buildTree(baseDefinitions)
        const hasChildren = buildHasChildren(diffDefinitions)

        expect(() => {
            expandTree(baseTree, hasChildren, structureDefinitionMap)
        }).toThrow()
    })

    it('should handle multiple choice types with different value types', () => {
        const baseDefinitions = [
            createElementDefinition('SomeResource'),
            createElementDefinition('SomeResource.value[x]', 0, '1', [
                { code: 'CodeableConcept' },
                { code: 'string' },
                { code: 'boolean' }
            ])
        ]

        const diffDefinitions = [
            createElementDefinition('SomeResource.valueCodeableConcept'),
            createElementDefinition('SomeResource.valueCodeableConcept.coding'),
            createElementDefinition('SomeResource.valueString'),
            createElementDefinition('SomeResource.valueBoolean')
        ]

        const structureDefinitionMap = new Map([
            ['CodeableConcept', createStructureDefinition('CodeableConcept', 'CodeableConcept', [
                createElementDefinition('CodeableConcept'),
                createElementDefinition('CodeableConcept.coding')
            ])]
        ])

        const baseTree = buildTree(baseDefinitions)
        const hasChildren = buildHasChildren(diffDefinitions)
        const result = expandTree(baseTree, hasChildren, structureDefinitionMap)
        
        // 各選択型が正しく展開されていることを確認
        const valueCodeableConcept = result.children.get('SomeResource.valueCodeableConcept')
        expect(valueCodeableConcept).toBeDefined()
        expect(valueCodeableConcept?.element.type).toEqual([{ code: 'CodeableConcept' }])

        const valueString = result.children.get('SomeResource.valueString')
        expect(valueString).toBeDefined()
        expect(valueString?.element.type).toEqual([{ code: 'string' }])

        const valueBoolean = result.children.get('SomeResource.valueBoolean')
        expect(valueBoolean).toBeDefined()
        expect(valueBoolean?.element.type).toEqual([{ code: 'boolean' }])
    })

    it('should handle nested complex types', () => {
        const baseDefinitions = [
            createElementDefinition('SomeResource'),
            createElementDefinition('SomeResource.value[x]', 0, '1', [{ code: 'CodeableConcept' }])
        ]

        const diffDefinitions = [
            createElementDefinition('SomeResource.valueCodeableConcept'),
            createElementDefinition('SomeResource.valueCodeableConcept.coding'),
            createElementDefinition('SomeResource.valueCodeableConcept.coding.system'),
            createElementDefinition('SomeResource.valueCodeableConcept.coding.code'),
            createElementDefinition('SomeResource.valueCodeableConcept.coding.display')
        ]

        const structureDefinitionMap = new Map([
            ['CodeableConcept', createStructureDefinition('CodeableConcept', 'CodeableConcept', [
                createElementDefinition('CodeableConcept'),
                createElementDefinition('CodeableConcept.coding', 0, '1', [{ code: 'Coding' }])
            ])],
            ['Coding', createStructureDefinition('Coding', 'Coding', [
                createElementDefinition('Coding'),
                createElementDefinition('Coding.system', 0, '1', [{ code: 'uri' }]),
                createElementDefinition('Coding.code', 0, '1', [{ code: 'code' }]),
                createElementDefinition('Coding.display', 0, '1', [{ code: 'string' }])
            ])]
        ])

        const baseTree = buildTree(baseDefinitions)
        const hasChildren = buildHasChildren(diffDefinitions)
        const result = expandTree(baseTree, hasChildren, structureDefinitionMap)
        
        // 複雑な型の入れ子が正しく展開されていることを確認
        const valueCodeableConcept = result.children.get('SomeResource.valueCodeableConcept')
        expect(valueCodeableConcept).toBeDefined()
        expect(valueCodeableConcept?.element.type).toEqual([{ code: 'CodeableConcept' }])

        const coding = valueCodeableConcept?.children.get('SomeResource.valueCodeableConcept.coding')
        expect(coding).toBeDefined()
        expect(coding?.element.type).toEqual([{ code: 'Coding' }])

        const codingSystem = coding?.children.get('SomeResource.valueCodeableConcept.coding.system')
        expect(codingSystem).toBeDefined()
        expect(codingSystem?.element.type).toEqual([{ code: 'uri' }])

        const codingCode = coding?.children.get('SomeResource.valueCodeableConcept.coding.code')
        expect(codingCode).toBeDefined()
        expect(codingCode?.element.type).toEqual([{ code: 'code' }])

        const codingDisplay = coding?.children.get('SomeResource.valueCodeableConcept.coding.display')
        expect(codingDisplay).toBeDefined()
        expect(codingDisplay?.element.type).toEqual([{ code: 'string' }])
    })

    it('should expand choice type when constrained in differential', () => {
        const baseDefinitions = [
            createElementDefinition('SomeResource'),
            createElementDefinition('SomeResource.value[x]', 0, '1', [
                { code: 'string' },
                { code: 'CodeableConcept' }
            ])
        ]

        const diffDefinitions = [
            createElementDefinition('SomeResource.value[x]', 0, '1', [{ code: 'CodeableConcept' }]),
            createElementDefinition('SomeResource.value[x].coding'),
            createElementDefinition('SomeResource.value[x].coding.system'),
            createElementDefinition('SomeResource.value[x].coding.code'),
            createElementDefinition('SomeResource.value[x].text')
        ]

        const structureDefinitionMap = new Map([
            ['string', createStructureDefinition('string', 'string', [
                createElementDefinition('string')
            ])],
            ['CodeableConcept', createStructureDefinition('CodeableConcept', 'CodeableConcept', [
                createElementDefinition('CodeableConcept'),
                createElementDefinition('CodeableConcept.coding', 0, '1', [{ code: 'Coding' }]),
                createElementDefinition('CodeableConcept.text', 0, '1', [{ code: 'string' }])
            ])],
            ['Coding', createStructureDefinition('Coding', 'Coding', [
                createElementDefinition('Coding'),
                createElementDefinition('Coding.system', 0, '1', [{ code: 'uri' }]),
                createElementDefinition('Coding.code', 0, '1', [{ code: 'code' }]),
                createElementDefinition('Coding.display', 0, '1', [{ code: 'string' }])
            ])],
            ['uri', createStructureDefinition('uri', 'uri', [
                createElementDefinition('uri')
            ])],
            ['code', createStructureDefinition('code', 'code', [
                createElementDefinition('code')
            ])]
        ])

        const baseTree = buildTree(baseDefinitions)
        const hasChildren = buildHasChildren(diffDefinitions)
        const diffElementMap = buildElementMap(diffDefinitions)
        const result = expandTree(baseTree, hasChildren, structureDefinitionMap, diffElementMap)
        
        // valueCodeableConceptが展開されていることを確認
        const valueCodeableConcept = result.children.get('SomeResource.value[x]')
        expect(valueCodeableConcept).toBeDefined()
        expect(valueCodeableConcept?.element.type).toEqual([{ code: 'CodeableConcept' }])

        // 子要素が展開されていることを確認
        const coding = valueCodeableConcept?.children.get('SomeResource.value[x].coding')
        expect(coding).toBeDefined()
        expect(coding?.element.type).toEqual([{ code: 'Coding' }])

        const codingSystem = coding?.children.get('SomeResource.value[x].coding.system')
        expect(codingSystem).toBeDefined()
        expect(codingSystem?.element.type).toEqual([{ code: 'uri' }])

        const codingCode = coding?.children.get('SomeResource.value[x].coding.code')
        expect(codingCode).toBeDefined()
        expect(codingCode?.element.type).toEqual([{ code: 'code' }])

        const text = valueCodeableConcept?.children.get('SomeResource.value[x].text')
        expect(text).toBeDefined()
        expect(text?.element.type).toEqual([{ code: 'string' }])
    })

    it('should handle multiple constrained choice types in differential', () => {
        const baseDefinitions = [
            createElementDefinition('SomeResource'),
            createElementDefinition('SomeResource.value[x]', 0, '1', [
                { code: 'string' },
                { code: 'CodeableConcept' },
                { code: 'boolean' }
            ])
        ]

        const diffDefinitions = [
            createElementDefinition('SomeResource.value[x]', 0, '1', [{ code: 'CodeableConcept' }]),
            createElementDefinition('SomeResource.value[x].coding'),
            createElementDefinition('SomeResource.value[x].coding.system'),
            createElementDefinition('SomeResource.value[x].coding.code'),
            createElementDefinition('SomeResource.value[x].text')
        ]

        const structureDefinitionMap = new Map([
            ['string', createStructureDefinition('string', 'string', [
                createElementDefinition('string')
            ])],
            ['boolean', createStructureDefinition('boolean', 'boolean', [
                createElementDefinition('boolean')
            ])],
            ['CodeableConcept', createStructureDefinition('CodeableConcept', 'CodeableConcept', [
                createElementDefinition('CodeableConcept'),
                createElementDefinition('CodeableConcept.coding', 0, '1', [{ code: 'Coding' }])
            ])],
            ['Coding', createStructureDefinition('Coding', 'Coding', [
                createElementDefinition('Coding'),
                createElementDefinition('Coding.system', 0, '1', [{ code: 'uri' }]),
                createElementDefinition('Coding.code', 0, '1', [{ code: 'code' }])
            ])],
            ['uri', createStructureDefinition('uri', 'uri', [
                createElementDefinition('uri')
            ])],
            ['code', createStructureDefinition('code', 'code', [
                createElementDefinition('code')
            ])]
        ])

        const baseTree = buildTree(baseDefinitions)
        const hasChildren = buildHasChildren(diffDefinitions)
        const diffElementMap = buildElementMap(diffDefinitions)
        const result = expandTree(baseTree, hasChildren, structureDefinitionMap, diffElementMap)
        
        // 各制約された選択型が正しく展開されていることを確認
        const valueCodeableConcept = result.children.get('SomeResource.value[x]')
        expect(valueCodeableConcept).toBeDefined()
        expect(valueCodeableConcept?.element.type).toEqual([{ code: 'CodeableConcept' }])

        const coding = valueCodeableConcept?.children.get('SomeResource.value[x].coding')
        expect(coding).toBeDefined()
        expect(coding?.element.type).toEqual([{ code: 'Coding' }])

        const codingSystem = coding?.children.get('SomeResource.value[x].coding.system')
        expect(codingSystem).toBeDefined()
        expect(codingSystem?.element.type).toEqual([{ code: 'uri' }])

        const codingCode = coding?.children.get('SomeResource.value[x].coding.code')
        expect(codingCode).toBeDefined()
        expect(codingCode?.element.type).toEqual([{ code: 'code' }])
    })

    it('should throw error when constrained choice type does not match base type', () => {
        const baseDefinitions = [
            createElementDefinition('SomeResource'),
            createElementDefinition('SomeResource.value[x]', 0, '1', [
                { code: 'string' },
                { code: 'boolean' }
            ])
        ]

        const diffDefinitions = [
            createElementDefinition('SomeResource.value[x]', 0, '1', [{ code: 'CodeableConcept' }]),
            createElementDefinition('SomeResource.value[x].coding')
        ]

        const structureDefinitionMap = new Map([
            ['CodeableConcept', createStructureDefinition('CodeableConcept', 'CodeableConcept', [
                createElementDefinition('CodeableConcept'),
                createElementDefinition('CodeableConcept.coding')
            ])]
        ])

        const baseTree = buildTree(baseDefinitions)
        const hasChildren = buildHasChildren(diffDefinitions)
        const diffElementMap = buildElementMap(diffDefinitions)
        expect(() => {
            expandTree(baseTree, hasChildren, structureDefinitionMap, diffElementMap)
        }).toThrow()
    })
}) 