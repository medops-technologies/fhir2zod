import { describe, expect, it } from 'vitest'
import { testModules } from '../../src/merger'

const { buildHasChildren } = testModules

describe('buildHasChildren', () => {
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

    it('should build parent-child relationships for simple paths', () => {
        const elements = [
            createElementDefinition('SomeResource'),
            createElementDefinition('SomeResource.a'),
            createElementDefinition('SomeResource.a.b')
        ]

        const result = buildHasChildren(elements)
        expect(result.get('SomeResource')).toEqual(['SomeResource.a'])
        expect(result.has('SomeResource')).toBe(true)
        expect(result.get('SomeResource.a')).toEqual(['SomeResource.a.b'])
        expect(result.has('SomeResource.a')).toBe(true)
        expect(result.get('SomeResource.a.b')).toBeUndefined()
    })

    it('should handle multiple children for a parent', () => {
        const elements = [
            createElementDefinition('SomeResource'),
            createElementDefinition('SomeResource.a'),
            createElementDefinition('SomeResource.a.b'),
            createElementDefinition('SomeResource.a.c'),
            createElementDefinition('SomeResource.a.d')
        ]

        const result = buildHasChildren(elements)
        expect(result.get('SomeResource')).toEqual(['SomeResource.a'])
        expect(result.has('SomeResource')).toBe(true)
        expect(result.get('SomeResource.a')).toEqual(['SomeResource.a.b', 'SomeResource.a.c', 'SomeResource.a.d'])
        expect(result.has('SomeResource.a')).toBe(true)
        expect(result.get('SomeResource.a.b')).toBeUndefined()
        expect(result.has('SomeResource.a.b')).toBe(false)
        expect(result.get('SomeResource.a.c')).toBeUndefined()
        expect(result.get('SomeResource.a.d')).toBeUndefined()
    })

    it('should handle deep nesting', () => {
        const elements = [
            createElementDefinition('SomeResource'),
            createElementDefinition('SomeResource.a'),
            createElementDefinition('SomeResource.a.b'),
            createElementDefinition('SomeResource.a.b.c'),
            createElementDefinition('SomeResource.a.b.c.d')
        ]

        const result = buildHasChildren(elements)
        expect(result.get('SomeResource')).toEqual(['SomeResource.a'])
        expect(result.has('SomeResource')).toBe(true)
        expect(result.get('SomeResource.a')).toEqual(['SomeResource.a.b'])
        expect(result.has('SomeResource.a')).toBe(true)
        expect(result.get('SomeResource.a.b')).toEqual(['SomeResource.a.b.c'])
        expect(result.has('SomeResource.a.b')).toBe(true)
        expect(result.get('SomeResource.a.b.c')).toEqual(['SomeResource.a.b.c.d'])
        expect(result.get('SomeResource.a.b.c.d')).toBeUndefined()
    })

    it('should handle choice types', () => {
        const elements = [
            createElementDefinition('SomeResource'),
            createElementDefinition('SomeResource.value[x]'),
            createElementDefinition('SomeResource.valueString'),
            createElementDefinition('SomeResource.valueBoolean')
        ]

        const result = buildHasChildren(elements)
        expect(result.get('SomeResource')).toEqual(['SomeResource.value[x]', 'SomeResource.valueString', 'SomeResource.valueBoolean'])
        expect(result.has('SomeResource')).toBe(true)
        expect(result.get('SomeResource.value[x]')).toBeUndefined()
        expect(result.has('SomeResource.value[x]')).toBe(false)
        expect(result.get('SomeResource.valueString')).toBeUndefined()
        expect(result.has('SomeResource.valueString')).toBe(false)
        expect(result.get('SomeResource.valueBoolean')).toBeUndefined()
    })



    it('should handle root level elements without children', () => {
        const elements = [
            createElementDefinition('SomeResource.a.b.c'),
        ]

        const result = buildHasChildren(elements)
        expect(result.get('SomeResource')).toEqual(['SomeResource.a'])
        expect(result.has('SomeResource')).toBe(true)
        expect(result.get('SomeResource.a')).toEqual(['SomeResource.a.b'])
        expect(result.has('SomeResource.a')).toBe(true)
        expect(result.get('SomeResource.a.b')).toEqual(['SomeResource.a.b.c'])
        expect(result.has('SomeResource.a.b')).toBe(true)
        expect(result.get('SomeResource.a.b.c')).toBeUndefined()
    })

    it('should handle empty input', () => {
        const elements: any[] = []
        const result = buildHasChildren(elements)
        expect(result).toBeDefined()
        expect(result.get('any')).toBeUndefined()
    })

    it('should handle single element', () => {
        const elements = [
            createElementDefinition('SomeResource')
        ]

        const result = buildHasChildren(elements)
        expect(result).toBeDefined()
        expect(result.get('SomeResource')).toBeUndefined()
    })
}) 