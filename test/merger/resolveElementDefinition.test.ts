import { describe, expect, it } from 'vitest'
import { testModules } from '../../src/merger'

const { buildTree, resolveElementDefinition } = testModules

describe('resolveElementDefinition', () => {
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

    it('should resolve a single node tree', () => {
        const elements = [
            createElementDefinition('root')
        ]
        const tree = buildTree(elements)
        const result = resolveElementDefinition(tree)
        expect(result).toHaveLength(1)
        expect(result[0].path).toBe('root')
    })

    it('should resolve a tree with nested nodes in correct order', () => {
        const elements = [
            createElementDefinition('root'),
            createElementDefinition('root.child1'),
            createElementDefinition('root.child1.grandchild1'),
            createElementDefinition('root.child1.grandchild2'),
            createElementDefinition('root.child2'),
            createElementDefinition('root.child3'),
            createElementDefinition('root.child3.grandchild')
        ]
        const tree = buildTree(elements)
        const result = resolveElementDefinition(tree)

        // 結果の長さを確認
        expect(result).toHaveLength(7)

        // 順序を確認
        const paths = result.map(el => el.path)
        expect(paths).toEqual([
            'root',
            'root.child1',
            'root.child1.grandchild1',
            'root.child1.grandchild2',
            'root.child2',
            'root.child3',
            'root.child3.grandchild'
        ])

        // 各要素の内容を確認
        for (const element of elements) {
            const resolvedElement = result.find(el => el.path === element.path)
            expect(resolvedElement).toBeDefined()
            expect(resolvedElement).toEqual(element)
        }
    })

    it('should include parent node elements in the result', () => {
        const elements = [
            createElementDefinition('root'),
            createElementDefinition('root.child1'),
            createElementDefinition('root.child1.grandchild')
        ]
        const tree = buildTree(elements)
        const result = resolveElementDefinition(tree)

        // 親ノードの要素が含まれていることを確認
        expect(result.find(el => el.path === 'root')).toBeDefined()
        expect(result.find(el => el.path === 'root.child1')).toBeDefined()
        expect(result.find(el => el.path === 'root.child1.grandchild')).toBeDefined()
    })

    it('should maintain element properties in the result', () => {
        const elements = [
            createElementDefinition('root'),
            createElementDefinition('root.child1', 1, "*", [{ code: 'string' }])
        ]
        const tree = buildTree(elements)
        const result = resolveElementDefinition(tree)

        // 要素のプロパティが保持されていることを確認
        const child1 = result.find(el => el.path === 'root.child1')
        expect(child1?.min).toBe(1)
        expect(child1?.max).toBe("*")
        expect(child1?.type).toEqual([{ code: 'string' }])
    })
}) 