import { describe, expect, it } from 'vitest'
import { testModules } from '../../src/merger'

const { buildTree, addNodeByPath, deleteNodeByPath } = testModules

describe('Node Operations', () => {
    describe('addNodeByPath', () => {
        it('should add a node to the root level', () => {
            const baseElements = [
                { path: 'root', type: [{ code: 'Element' }] }
            ]
            const baseTree = buildTree(baseElements)
            const newNode = {
                path: 'newRoot',
                element: { path: 'newRoot', type: [{ code: 'Element' }] },
                children: new Map()
            }

            const result = addNodeByPath(baseTree, 'newRoot', newNode)
            expect(result?.children.get('newRoot')).toBeDefined()
            expect(result?.children.get('newRoot')?.path).toBe('newRoot')
        })

        it('should add a node to a nested path', () => {
            const baseElements = [
                { path: 'root', type: [{ code: 'Element' }] },
                { path: 'root.child1', type: [{ code: 'Element' }] }
            ]
            const baseTree = buildTree(baseElements)
            const newNode = {
                path: 'root.child1.grandchild',
                element: { path: 'root.child1.grandchild', type: [{ code: 'Element' }] },
                children: new Map()
            }

            const result = addNodeByPath(baseTree, 'root.child1.grandchild', newNode)
            const child1 = result?.children.get('root.child1')
            expect(child1?.children.get('root.child1.grandchild')).toBeDefined()
            expect(child1?.children.get('root.child1.grandchild')?.path).toBe('root.child1.grandchild')
        })

        it('should add a node with children', () => {
            const baseElements = [
                { path: 'root', type: [{ code: 'Element' }] }
            ]
            const baseTree = buildTree(baseElements)
            const newNode = {
                path: 'newRoot',
                element: { path: 'newRoot', type: [{ code: 'Element' }] },
                children: new Map([
                    ['newRoot.child1', {
                        path: 'newRoot.child1',
                        element: { path: 'newRoot.child1', type: [{ code: 'Element' }] },
                        children: new Map()
                    }]
                ])
            }

            const result = addNodeByPath(baseTree, 'newRoot', newNode)
            const addedNode = result?.children.get('newRoot')
            expect(addedNode?.children.get('newRoot.child1')).toBeDefined()
            expect(addedNode?.children.get('newRoot.child1')?.path).toBe('newRoot.child1')
        })

        it('should return null when parent path does not exist', () => {
            const baseElements = [
                { path: 'root', type: [{ code: 'Element' }] }
            ]
            const baseTree = buildTree(baseElements)
            const newNode = {
                path: 'nonexistent.child',
                element: { path: 'nonexistent.child', type: [{ code: 'Element' }] },
                children: new Map()
            }

            const result = addNodeByPath(baseTree, 'nonexistent.child', newNode)
            expect(result).toBeNull()
        })
    })

    describe('deleteNodeByPath', () => {
        it('should delete a root level node', () => {
            const baseElements = [
                { path: 'root', type: [{ code: 'Element' }] },
                { path: 'root.child1', type: [{ code: 'Element' }] }
            ]
            const baseTree = buildTree(baseElements)

            const result = deleteNodeByPath(baseTree, 'root.child1')
            expect(result?.children.get('root.child1')).toBeUndefined()
        })

        it('should delete a nested node', () => {
            const baseElements = [
                { path: 'root', type: [{ code: 'Element' }] },
                { path: 'root.child1', type: [{ code: 'Element' }] },
                { path: 'root.child1.grandchild', type: [{ code: 'Element' }] }
            ]
            const baseTree = buildTree(baseElements)

            const result = deleteNodeByPath(baseTree, 'root.child1.grandchild')
            const child1 = result?.children.get('root.child1')
            expect(child1?.children.get('root.child1.grandchild')).toBeUndefined()
        })

        it('should delete a node and all its children', () => {
            const baseElements = [
                { path: 'root', type: [{ code: 'Element' }] },
                { path: 'root.child1', type: [{ code: 'Element' }] },
                { path: 'root.child1.grandchild1', type: [{ code: 'Element' }] },
                { path: 'root.child1.grandchild2', type: [{ code: 'Element' }] }
            ]
            const baseTree = buildTree(baseElements)

            const result = deleteNodeByPath(baseTree, 'root.child1')
            expect(result?.children.get('root.child1')).toBeUndefined()
        })

        it('should return null when node to delete does not exist', () => {
            const baseElements = [
                { path: 'root', type: [{ code: 'Element' }] }
            ]
            const baseTree = buildTree(baseElements)

            const result = deleteNodeByPath(baseTree, 'nonexistent')
            expect(result).toBeNull()
        })

        it('should preserve other nodes when deleting a node', () => {
            const baseElements = [
                { path: 'root', type: [{ code: 'Element' }] },
                { path: 'root.child1', type: [{ code: 'Element' }] },
                { path: 'root.child2', type: [{ code: 'Element' }] }
            ]
            const baseTree = buildTree(baseElements)

            const result = deleteNodeByPath(baseTree, 'root.child1')
            expect(result?.children.get('root.child2')).toBeDefined()
            expect(result?.children.get('root.child1')).toBeUndefined()
        })
    })
}) 