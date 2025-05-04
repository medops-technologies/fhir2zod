import { describe, expect, it } from 'vitest'
import { testModules } from '../../src/merger'

const { buildTree, mergeElementByPath } = testModules

describe('mergeElementByPath', () => {
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

    it('should merge a single element with updated properties', () => {
        const baseElements = [
            createElementDefinition('root'),
            createElementDefinition('root.child1', 0, "1")
        ]
        const baseTree = buildTree(baseElements)
        const diffElements = [
            {
                ...createElementDefinition('root.child1'),
                min: 1,
                max: "*",
                short: "Updated short description"
            }
        ]

        const result = mergeElementByPath(baseTree, diffElements)
        const child1 = result.children.get('root.child1')
        expect(child1?.element.min).toBe(1)
        expect(child1?.element.max).toBe("*")
        expect(child1?.element.short).toBe("Updated short description")
        expect(child1?.element.definition).toBe("Definition for root.child1")
    })

    it('should merge multiple elements', () => {
        const baseElements = [
            createElementDefinition('root'),
            createElementDefinition('root.child1', 0, "1"),
            createElementDefinition('root.child2', 0, "1")
        ]
        const baseTree = buildTree(baseElements)
        const diffElements = [
            {
                ...createElementDefinition('root.child1'),
                min: 1,
                max: "*"
            },
            {
                ...createElementDefinition('root.child2'),
                short: "Updated child2",
                definition: "Updated definition for child2"
            }
        ]

        const result = mergeElementByPath(baseTree, diffElements)
        const child1 = result.children.get('root.child1')
        const child2 = result.children.get('root.child2')
        expect(child1?.element.min).toBe(1)
        expect(child1?.element.max).toBe("*")
        expect(child2?.element.short).toBe("Updated child2")
        expect(child2?.element.definition).toBe("Updated definition for child2")
    })

    it('should merge nested elements', () => {
        const baseElements = [
            createElementDefinition('root'),
            createElementDefinition('root.child1', 0, "1"),
            createElementDefinition('root.child1.grandchild', 0, "1")
        ]
        const baseTree = buildTree(baseElements)
        const diffElements = [
            {
                ...createElementDefinition('root.child1'),
                min: 1,
                max: "*"
            },
            {
                ...createElementDefinition('root.child1.grandchild'),
                short: "Updated grandchild",
                definition: "Updated definition for grandchild"
            }
        ]

        const result = mergeElementByPath(baseTree, diffElements)
        const child1 = result.children.get('root.child1')
        const grandchild = child1?.children.get('root.child1.grandchild')
        expect(child1?.element.min).toBe(1)
        expect(child1?.element.max).toBe("*")
        expect(grandchild?.element.short).toBe("Updated grandchild")
        expect(grandchild?.element.definition).toBe("Updated definition for grandchild")
    })

    it('should return the original tree when diffElements is empty', () => {
        const baseElements = [
            createElementDefinition('root'),
            createElementDefinition('root.child1', 0, "1")
        ]
        const baseTree = buildTree(baseElements)
        const diffElements: typeof baseElements = []

        const result = mergeElementByPath(baseTree, diffElements)
        expect(result).toEqual(baseTree)
    })

    it('should throw an error when path does not exist in the tree', () => {
        const baseElements = [
            createElementDefinition('root'),
            createElementDefinition('root.child1', 0, "1")
        ]
        const baseTree = buildTree(baseElements)
        const diffElements = [
            createElementDefinition('root.nonexistent')
        ]

        expect(() => mergeElementByPath(baseTree, diffElements))
            .toThrow('Element not found: root.nonexistent')
    })

    it('should preserve other properties when updating specific properties', () => {
        const baseElements = [
            createElementDefinition('root'),
            createElementDefinition('root.child1', 0, "1")
        ]
        const baseTree = buildTree(baseElements)
        const diffElements = [
            {
                ...createElementDefinition('root.child1'),
                min: 1,
                max: "*"
            }
        ]

        const result = mergeElementByPath(baseTree, diffElements)
        const child1 = result.children.get('root.child1')
        expect(child1?.element.min).toBe(1)
        expect(child1?.element.max).toBe("*")
        expect(child1?.element.short).toBe("Short description for root.child1")
        expect(child1?.element.definition).toBe("Definition for root.child1")
        expect(child1?.element.comment).toBe("Comment for root.child1")
        expect(child1?.element.requirements).toBe("Requirements for root.child1")
        expect(child1?.element.alias).toEqual(["alias1-root.child1", "alias2-root.child1"])
        expect(child1?.element.mapping).toEqual([
            { identity: 'map1', map: 'map1-root.child1' },
            { identity: 'map2', map: 'map2-root.child1' }
        ])
    })

    it('should update type property', () => {
        const baseElements = [
            createElementDefinition('root'),
            createElementDefinition('root.child1', 0, "1", [{ code: 'Element' }])
        ]
        const baseTree = buildTree(baseElements)
        const diffElements = [
            {
                ...createElementDefinition('root.child1'),
                type: [{ code: 'string' }]
            }
        ]

        const result = mergeElementByPath(baseTree, diffElements)
        const child1 = result.children.get('root.child1')
        expect(child1?.element.type).toEqual([{ code: 'string' }])
    })

    it('should update array and object properties', () => {
        const baseElements = [
            createElementDefinition('root'),
            createElementDefinition('root.child1', 0, "1")
        ]
        const baseTree = buildTree(baseElements)
        const diffElements = [
            {
                ...createElementDefinition('root.child1'),
                alias: ['new-alias1', 'new-alias2'],
                mapping: [
                    { identity: 'new-map1', map: 'new-map1-value' }
                ]
            }
        ]

        const result = mergeElementByPath(baseTree, diffElements)
        const child1 = result.children.get('root.child1')
        expect(child1?.element.alias).toEqual(['new-alias1', 'new-alias2'])
        expect(child1?.element.mapping).toEqual([
            { identity: 'new-map1', map: 'new-map1-value' }
        ])
    })

    it('should update multiple properties simultaneously', () => {
        const baseElements = [
            createElementDefinition('root'),
            createElementDefinition('root.child1', 0, "1")
        ]
        const baseTree = buildTree(baseElements)
        const diffElements = [
            {
                ...createElementDefinition('root.child1'),
                min: 1,
                max: "*",
                type: [{ code: 'string' }],
                short: "Updated short",
                definition: "Updated definition",
                alias: ['new-alias']
            }
        ]

        const result = mergeElementByPath(baseTree, diffElements)
        const child1 = result.children.get('root.child1')
        expect(child1?.element.min).toBe(1)
        expect(child1?.element.max).toBe("*")
        expect(child1?.element.type).toEqual([{ code: 'string' }])
        expect(child1?.element.short).toBe("Updated short")
        expect(child1?.element.definition).toBe("Updated definition")
        expect(child1?.element.alias).toEqual(['new-alias'])
    })
}) 