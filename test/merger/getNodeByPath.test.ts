import { describe, expect, it } from 'vitest'
import { testModules } from '../../src/merger'

const { getNodeByPath } = testModules

describe('getNodeByPath', () => {
    // テスト用のモックデータ
    const mockNode = {
        path: 'root',
        element: { path: 'root', id: 'root' },
        children: new Map([
            ['root.child1', {
                path: 'root.child1',
                element: { path: 'root.child1', id: 'child1' },
                children: new Map([
                    ['root.child1.grandchild1', {
                        path: 'root.child1.grandchild1',
                        element: { path: 'root.child1.grandchild1', id: 'grandchild1' },
                        children: new Map()
                    }]
                ])
            }],
            ['root.child2', {
                path: 'root.child2',
                element: { path: 'root.child2', id: 'child2' },
                children: new Map()
            }]
        ])
    }

    it('should return root node when path matches root', () => {
        const result = getNodeByPath(mockNode, 'root')
        expect(result).not.toBeNull()
        expect(result?.path).toBe('root')
        expect(result?.element.id).toBe('root')
    })

    it('should return child node when path matches child', () => {
        const result = getNodeByPath(mockNode, 'root.child1')
        expect(result).not.toBeNull()
        expect(result?.path).toBe('root.child1')
        expect(result?.element.id).toBe('child1')
    })

    it('should return grandchild node when path matches grandchild', () => {
        const result = getNodeByPath(mockNode, 'root.child1.grandchild1')
        expect(result).not.toBeNull()
        expect(result?.path).toBe('root.child1.grandchild1')
        expect(result?.element.id).toBe('grandchild1')
    })

    it('should return null when path does not exist', () => {
        const result = getNodeByPath(mockNode, 'root.nonexistent')
        expect(result).toBeNull()
    })

    it('should return a deep copy of the node', () => {
        const result = getNodeByPath(mockNode, 'root')
        expect(result).not.toBe(mockNode) // 参照が異なることを確認
        expect(result?.children).not.toBe(mockNode.children) // 子ノードの参照も異なることを確認
    })
}) 