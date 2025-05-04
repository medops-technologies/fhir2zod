import { describe, expect, it } from 'vitest'
import { testModules } from '../../src/merger'

const { buildHasChildren } = testModules

describe('HasChildren', () => {
    it('should initialize with empty state', () => {
        const hasChildren = buildHasChildren([])
        expect(hasChildren.has('root')).toBe(false)
        expect(hasChildren.get('root')).toBeUndefined()
    })

    it('should add children for a path', () => {
        const hasChildren = buildHasChildren([])
        hasChildren.add('root', 'root.child1')
        expect(hasChildren.has('root')).toBe(true)
        expect(hasChildren.get('root')).toEqual(['root.child1'])
    })

    it('should add multiple children for the same path', () => {
        const hasChildren = buildHasChildren([])
        hasChildren.add('root', 'root.child1')
        hasChildren.add('root', 'root.child2')
        expect(hasChildren.has('root')).toBe(true)
        expect(hasChildren.get('root')).toEqual(['root.child1', 'root.child2'])
    })

    it('should handle multiple paths independently', () => {
        const hasChildren = buildHasChildren([])
        hasChildren.add('root', 'root.child1')
        hasChildren.add('root.child1', 'root.child1.grandchild1')
        
        expect(hasChildren.has('root')).toBe(true)
        expect(hasChildren.has('root.child1')).toBe(true)
        expect(hasChildren.get('root')).toEqual(['root.child1'])
        expect(hasChildren.get('root.child1')).toEqual(['root.child1.grandchild1'])
    })

    it('should return false for non-existent paths', () => {
        const hasChildren = buildHasChildren([])
        hasChildren.add('root', 'root.child1')
        expect(hasChildren.has('nonexistent')).toBe(false)
        expect(hasChildren.get('nonexistent')).toBeUndefined()
    })

    it('should build hasChildren from element definitions', () => {
        const elementDefinitions = [
            { path: 'root' },
            { path: 'root.child1' },
            { path: 'root.child1.grandchild1' },
            { path: 'root.child2' }
        ]
        const hasChildren = buildHasChildren(elementDefinitions)
        
        expect(hasChildren.has('root')).toBe(true)
        expect(hasChildren.has('root.child1')).toBe(true)
        expect(hasChildren.get('root')).toEqual(['root.child1', 'root.child2'])
        expect(hasChildren.get('root.child1')).toEqual(['root.child1.grandchild1'])
    })

    it('should handle paths with multiple segments', () => {
        const hasChildren = buildHasChildren([])
        hasChildren.add('root.child1', 'root.child1.grandchild1')
        hasChildren.add('root.child1.grandchild1', 'root.child1.grandchild1.greatgrandchild1')
        
        expect(hasChildren.has('root.child1')).toBe(true)
        expect(hasChildren.has('root.child1.grandchild1')).toBe(true)
        expect(hasChildren.get('root.child1')).toEqual(['root.child1.grandchild1'])
        expect(hasChildren.get('root.child1.grandchild1')).toEqual(['root.child1.grandchild1.greatgrandchild1'])
    })
}) 