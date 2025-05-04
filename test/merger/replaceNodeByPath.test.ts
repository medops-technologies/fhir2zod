import { describe, expect, it } from 'vitest'
import { testModules } from '../../src/merger'

const { replaceNodeByPath } = testModules

describe('replaceNodeByPath', () => {
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

    it('should replace root node', () => {
        const newNode = {
            path: 'root',
            element: { path: 'root', id: 'newRoot' },
            children: new Map()
        }
        const result = replaceNodeByPath(mockNode, 'root', newNode)
        expect(result).not.toBeNull()
        expect(result?.element.id).toBe('newRoot')
        expect(result?.children.size).toBe(0)
    })

    it('should replace child node', () => {
        const newNode = {
            path: 'root.child1',
            element: { path: 'root.child1', id: 'newChild1' },
            children: new Map()
        }
        const result = replaceNodeByPath(mockNode, 'root.child1', newNode)
        expect(result).not.toBeNull()
        const child1 = result?.children.get('root.child1')
        expect(child1?.element.id).toBe('newChild1')
        expect(child1?.children.size).toBe(0)
    })

    it('should replace grandchild node', () => {
        const newNode = {
            path: 'root.child1.grandchild1',
            element: { path: 'root.child1.grandchild1', id: 'newGrandchild1' },
            children: new Map()
        }
        const result = replaceNodeByPath(mockNode, 'root.child1.grandchild1', newNode)
        expect(result).not.toBeNull()
        const child1 = result?.children.get('root.child1')
        const grandchild1 = child1?.children.get('root.child1.grandchild1')
        expect(grandchild1?.element.id).toBe('newGrandchild1')
    })

    it('should return null when path does not exist', () => {
        const newNode = {
            path: 'root.nonexistent',
            element: { path: 'root.nonexistent', id: 'newNode' },
            children: new Map()
        }
        const result = replaceNodeByPath(mockNode, 'root.nonexistent', newNode)
        expect(result).toBeNull()
    })

    it('should maintain parent-child relationships after replacement', () => {
        const newNode = {
            path: 'root.child1',
            element: { path: 'root.child1', id: 'newChild1' },
            children: new Map()
        }
        const result = replaceNodeByPath(mockNode, 'root.child1', newNode)
        expect(result).not.toBeNull()
        const child1 = result?.children.get('root.child1')
    })

    it('should return a deep copy of the tree', () => {
        const newNode = {
            path: 'root',
            element: { path: 'root', id: 'newRoot' },
            children: new Map()
        }
        const result = replaceNodeByPath(mockNode, 'root', newNode)
        expect(result).not.toBe(mockNode)
        expect(result?.children).not.toBe(mockNode.children)
    })
}) 