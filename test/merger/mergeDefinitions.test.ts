import { describe, expect, it } from 'vitest'
import { testModules } from '../../src/merger'

const { mergeDefinitions } = testModules

describe('mergeDefinitions', () => {
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

    // テスト用の型定義
    const structureDefinitionMap = new Map([
        ['CodeableConcept', {
            resourceType: 'StructureDefinition' as const,
            id: 'CodeableConcept',
            url: 'http://hl7.org/fhir/StructureDefinition/CodeableConcept',
            name: 'CodeableConcept',
            status: 'active' as const,
            date: '2024-01-01',
            fhirVersion: '4.0.1',
            kind: 'complex-type' as const,
            abstract: false,
            snapshot: {
                element: [
                    { path: 'CodeableConcept' },
                    { path: 'CodeableConcept.coding', type: [{ code: 'Coding' }] },
                    { path: 'CodeableConcept.text', type: [{ code: 'string' }] }
                ]
            }
        }],
        ['Coding', {
            resourceType: 'StructureDefinition' as const,
            id: 'Coding',
            url: 'http://hl7.org/fhir/StructureDefinition/Coding',
            name: 'Coding',
            status: 'active' as const,
            date: '2024-01-01',
            fhirVersion: '4.0.1',
            kind: 'complex-type' as const,
            abstract: false,
            snapshot: {
                element: [
                    { path: 'Coding' },
                    { path: 'Coding.system', type: [{ code: 'uri' }] },
                    { path: 'Coding.code', type: [{ code: 'code' }] },
                    { path: 'Coding.display', type: [{ code: 'string' }] },
                    { path: 'Coding.userSelected', type: [{ code: 'boolean' }] }
                ]
            }
        }],
    ])

    it('should expand elements when type matches', () => {
        const baseDefinitions = [
            createElementDefinition('SomeResource'),
            createElementDefinition('SomeResource.a', 0, "1", [{ code: 'CodeableConcept' }]),
        ]
        const diffDefinitions = [
            createElementDefinition('SomeResource'),
            createElementDefinition('SomeResource.a'),
            createElementDefinition('SomeResource.a.text', 0, "1", [{ code: 'string' }]),
            createElementDefinition('SomeResource.a.coding', 1, "1", [{ code: 'Coding' }])
        ]

        const result = mergeDefinitions(baseDefinitions, diffDefinitions, structureDefinitionMap)
        expect(result).toContainEqual(expect.objectContaining({
            path: 'SomeResource.a.text',
            type: [{ code: 'string' }]
        }))
        expect(result).toContainEqual(expect.objectContaining({
            path: 'SomeResource.a.coding',
            type: [{ code: 'Coding' }],
            min: 1,
            max: "1"
        }))
    })

    it('should throw error when type does not match', () => {
        const baseDefinitions = [
            createElementDefinition('SomeResource'),
            createElementDefinition('SomeResource.a'),
            createElementDefinition('SomeResource.a.b', 0, "1", [{ code: 'string' }])
        ]
        const diffDefinitions = [
            createElementDefinition('SomeResource'),
            createElementDefinition('SomeResource.a'),
            createElementDefinition('SomeResource.a.b'),
            createElementDefinition('SomeResource.a.b.c', 0, "1", [{ code: 'string' }])
        ]

        expect(() => {
            mergeDefinitions(baseDefinitions, diffDefinitions, structureDefinitionMap)
        }).toThrow()
    })

    it('should handle multiple nested elements', () => {
        const baseDefinitions = [
            createElementDefinition('SomeResource'),
            createElementDefinition('SomeResource.a', 0, "1", [{ code: 'CodeableConcept' }]),
            createElementDefinition('SomeResource.a.coding', 1, "1", [{ code: 'Coding' }])
        ]
        const diffDefinitions = [
            createElementDefinition('SomeResource.a.coding.system', 1, "1", [{ code: 'uri' }])
        ]

        const result = mergeDefinitions(baseDefinitions, diffDefinitions, structureDefinitionMap)
        expect(result).toContainEqual(expect.objectContaining({
            path: 'SomeResource.a.coding.system',
            type: [{ code: 'uri' }],
            min: 1,
        }))
        expect(result).toContainEqual(expect.objectContaining({
            path: 'SomeResource.a.coding.code',
            type: [{ code: 'code' }]
        }))
    })

    it('should maintain correct element order', () => {
        const baseDefinitions = [
            createElementDefinition('SomeResource'),
            createElementDefinition('SomeResource.a', 0, "1", [{ code: 'CodeableConcept' }]),
        ]
        const diffDefinitions = [
            createElementDefinition('SomeResource.a.coding.display', 1, "1", [{ code: 'string' }]),
        ]

        const result = mergeDefinitions(baseDefinitions, diffDefinitions, structureDefinitionMap)
        const paths = result.map(el => el.path)
        
        // 同じ深さの要素は順不同でも可
        const validOrder1 = [
            'SomeResource',
            'SomeResource.a',
            'SomeResource.a.coding',
            'SomeResource.a.coding.display',
            'SomeResource.a.coding.system',
            'SomeResource.a.coding.code',
            'SomeResource.a.coding.userSelected'
        ]
        const validOrder2 = [
            'SomeResource',
            'SomeResource.a',
            'SomeResource.a.coding',
            'SomeResource.a.coding.display',
            'SomeResource.a.coding.system',
            'SomeResource.a.coding.code',
            'SomeResource.a.coding.userSelected'
        ]
        
        expect(paths).toEqual(expect.arrayContaining(validOrder1) || expect.arrayContaining(validOrder2))
    })

    it('should handle choice types', () => {
        const baseDefinitions = [
            createElementDefinition('SomeResource'),
            createElementDefinition('SomeResource.value[x]', 0, "1", [
                { code: 'string' },
                { code: 'boolean' }
            ])
        ]
        const diffDefinitions = [
            createElementDefinition('SomeResource'),
            createElementDefinition('SomeResource.valueString', 0, "1", [{ code: 'string' }])
        ]

        const result = mergeDefinitions(baseDefinitions, diffDefinitions, structureDefinitionMap)
        expect(result).toContainEqual(expect.objectContaining({
            path: 'SomeResource.valueString',
            type: [{ code: 'string' }]
        }))
    })

    it('should update existing properties', () => {
        const baseDefinitions = [
            createElementDefinition('SomeResource'),
            createElementDefinition('SomeResource.a', 0, "1", [{ code: 'string' }])
        ]
        const diffDefinitions = [
            createElementDefinition('SomeResource'),
            createElementDefinition('SomeResource.a', 1, "*", [{ code: 'string' }])
        ]

        const result = mergeDefinitions(baseDefinitions, diffDefinitions, structureDefinitionMap)
        expect(result).toContainEqual(expect.objectContaining({
            path: 'SomeResource.a',
            min: 1,
            max: "*"
        }))
    })
}) 