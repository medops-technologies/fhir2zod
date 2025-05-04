import { describe, expect, it } from 'vitest'
import { testModules } from '../../src/merger'

const { deepCopyNode } = testModules

describe('deepCopyNode', () => {
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

    it('should create a deep copy of a node', () => {
        const result = deepCopyNode(mockNode)
        expect(result).not.toBe(mockNode)
        expect(result).toEqual(mockNode)
    })

    it('should create a deep copy of children', () => {
        const result = deepCopyNode(mockNode)
        expect(result.children).not.toBe(mockNode.children)
        expect(result.children.get('root.child1')).not.toBe(mockNode.children.get('root.child1'))
        expect(result.children.get('root.child1')?.children).not.toBe(
            mockNode.children.get('root.child1')?.children
        )
    })

    it('should maintain the same structure and values', () => {
        const result = deepCopyNode(mockNode)
        expect(result.path).toBe(mockNode.path)
        expect(result.element).toEqual(mockNode.element)
        expect(result.children.size).toBe(mockNode.children.size)
        
        const child1 = result.children.get('root.child1')
        const originalChild1 = mockNode.children.get('root.child1')
        expect(child1?.path).toBe(originalChild1?.path)
        expect(child1?.element).toEqual(originalChild1?.element)
        expect(child1?.children.size).toBe(originalChild1?.children.size)
    })

    it('should handle empty children', () => {
        const emptyNode = {
            path: 'root',
            element: { path: 'root', id: 'root' },
            children: new Map()
        }
        const result = deepCopyNode(emptyNode)
        expect(result.children.size).toBe(0)
    })

}) 