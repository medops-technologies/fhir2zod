import { z } from 'zod'
import {
    ElementDefinitionSchemaR4,
    StructureDefinitionSchemaR4,
} from './types/StructureDefinitions/r4'
import { TypeNameUrlConverter, parseElementTypes } from './utils'
type StructureDefinition = z.infer<typeof StructureDefinitionSchemaR4>
type ElementDefinition = z.infer<typeof ElementDefinitionSchemaR4>

type ElementPath = string

interface Node {
    path: ElementPath
    element: ElementDefinition
    children: Map<ElementPath, Node>
}
const getNodeByPath = (node: Node, path: ElementPath): Node | null => {
    if (node.path === path) {
        return deepCopyNode(node)
    }
    for (const child of node.children.values()) {
        const result = getNodeByPath(child, path)
        if (result) {
            return deepCopyNode(result)
        }
    }
    return null
}
const addNodeByPath = (
    node: Node,
    path: ElementPath,
    newNode: Node,
): Node | null => {
    const copiedNode = deepCopyNode(node)
    if (copiedNode.path === path) {
        throw new Error(`Add node by path failed: ${path} is already exists`)
    }
    const parentPath = path.split('.').slice(0, -1).join('.')
    if (parentPath === '') {
        // Root level node addition
        const newRoot = {
            path: copiedNode.path,
            element: copiedNode.element,
            children: new Map(copiedNode.children),
        }
        newRoot.children.set(path, newNode)
        return newRoot
    }
    if (copiedNode.path === parentPath) {
        copiedNode.children.set(path, newNode)
        return copiedNode
    }
    for (const [childPath, child] of copiedNode.children.entries()) {
        const result = addNodeByPath(child, path, newNode)
        if (result) {
            copiedNode.children.set(childPath, result)
            return copiedNode
        }
    }
    return null
}
const deleteNodeByPath = (node: Node, path: ElementPath): Node | null => {
    const copiedNode = deepCopyNode(node)
    if (copiedNode.path === path) {
        return null
    }
    for (const [childPath, child] of copiedNode.children.entries()) {
        if (childPath === path) {
            copiedNode.children.delete(childPath)
            return copiedNode
        }
        const result = deleteNodeByPath(child, path)
        if (result) {
            copiedNode.children.set(childPath, result)
            return copiedNode
        }
    }
    return null
}
const replaceNodeByPath = (
    node: Node,
    path: ElementPath,
    newNode: Node,
): Node | null => {
    const copiedNode = deepCopyNode(node)
    if (copiedNode.path === path) {
        return deepCopyNode(newNode)
    }
    for (const child of copiedNode.children.values()) {
        const replaced = replaceNodeByPath(child, path, newNode)
        if (replaced) {
            const result = deepCopyNode(copiedNode)
            result.children.set(child.path, replaced)
            return result
        }
    }
    return null
}

interface PathSegment {
    raw: string // the as-is path segment
    base: string // the base path segment, e.g. value[x] -> value
    choiceOfType?: string // the choice-of-type path segment, e.g. value[x] -> value[x]
    sliceName?: string // the slice name, e.g. coding:lonic -> lonic
}

class HasChildren {
    private ElementPathHasChildren: Map<ElementPath, ElementPath[]>

    constructor() {
        this.ElementPathHasChildren = new Map()
    }

    add(elementPath: ElementPath, hasChildren: ElementPath) {
        const currentHasChildren = this.ElementPathHasChildren.get(elementPath)
        if (currentHasChildren) {
            currentHasChildren.push(hasChildren)
            this.ElementPathHasChildren.set(elementPath, currentHasChildren)
        } else {
            this.ElementPathHasChildren.set(elementPath, [hasChildren])
        }
    }

    has(elementPath: ElementPath) {
        return this.ElementPathHasChildren.has(elementPath)
    }

    get(elementPath: ElementPath) {
        return this.ElementPathHasChildren.get(elementPath)
    }
}

const buildTree = (els: ElementDefinition[]): Node => {
    if (els.length === 0) {
        throw new Error('elementDefinitions is empty')
    }
    const root: Node = {
        path: els[0].path,
        element: els[0],
        children: new Map(),
    }

    const nodeStack: Node[] = [root]

    for (const element of els.slice(1)) {
        const segments = element.path.split('.')
        // find the parent node in the stack, discarding the branches that are not the parent.
        while (nodeStack.length > segments.length) {
            nodeStack.pop()
        } // for performance
        while (
            nodeStack.length &&
            !element.path.startsWith(`${nodeStack[nodeStack.length - 1].path}.`)
        ) {
            nodeStack.pop()
        }
        const parentAsStackRef = nodeStack[nodeStack.length - 1]
        const child: Node = {
            path: element.path,
            element,
            children: new Map(),
        }
        parentAsStackRef.children.set(element.path, child) // element in stack is also updated because parentAsStackRef is a reference(pointer)
        nodeStack.push(child)
    }
    return root
}

const buildHasChildren = (els: ElementDefinition[]): HasChildren => {
    const hasChildren = new HasChildren()
    for (const element of els) {
        const segments = element.path.split('.')
        if (segments.length === 1) continue
        for (let i = 0; i < segments.length - 1; i++) {
            const currentPath = segments.slice(0, i + 1).join('.')
            const hasChildrenPath = segments.slice(0, i + 2).join('.')
            const currentChildren = hasChildren.get(currentPath) || []
            if (!currentChildren.includes(hasChildrenPath)) {
                hasChildren.add(currentPath, hasChildrenPath)
            }
        }
    }
    return hasChildren
}
const buildElementMap = (
    els: ElementDefinition[],
): Map<string, ElementDefinition> => {
    const elementMap = new Map<string, ElementDefinition>()
    for (const element of els) {
        elementMap.set(element.path, element)
    }
    return elementMap
}

const expandTree = (
    baseTree: Node,
    hasChildren: HasChildren,
    structureDefinitionMap: Map<string, StructureDefinition>,
    diffElementMap?: Map<string, ElementDefinition>, // path -> element
): Node => {
    let newTree = deepCopyNode(baseTree)
    const stack: Node[] = [newTree]
    while (stack.length > 0) {
        const currentNode = stack.pop()
        if (!currentNode) {
            throw new Error('currentNode not found')
        }
        if (
            currentNode.children.size === 0 &&
            hasChildren.has(currentNode.path)
        ) {
            const currentElementTypesRaw = currentNode.element.type
            const currentElementTypes = parseElementTypes(
                currentElementTypesRaw,
            )

            // Check if this is a choice type that has been constrained in the differential
            if (currentNode.path.endsWith('[x]')) {
                const diffElement = diffElementMap?.get(currentNode.path)
                if (!diffElement) {
                    continue
                }
                currentNode.element = diffElement
                const parentPath = currentNode.path
                    .split('.')
                    .slice(0, -1)
                    .join('.')
                const currentElementChildrenDiffPaths =
                    hasChildren.get(parentPath)
                if (currentElementChildrenDiffPaths) {
                    const currentElementPathBase = currentNode.path.slice(0, -3)
                    const currentElementChildrenDiffPathsFiltered =
                        currentElementChildrenDiffPaths.filter(path =>
                            path.startsWith(currentElementPathBase),
                        )
                    if (currentElementChildrenDiffPathsFiltered.length > 0) {
                        // This is a choice type that has been constrained in the differential
                        // Find the constrained type from the differential path
                        const constrainedPath =
                            currentElementChildrenDiffPathsFiltered[0]
                        const constrainedType =
                            currentNode.element.type?.[0]?.code
                        if (!constrainedType) {
                            throw new Error(
                                'Failed to determine constrained type',
                            )
                        }

                        // Find the matching type in the base definition
                        const matchingType = currentElementTypesRaw?.find(
                            (type: ElementDefinition['type'][0]) =>
                                type.code === constrainedType,
                        )
                        if (!matchingType) {
                            throw new Error(
                                `Constrained type ${constrainedType} not found in base definition`,
                            )
                        }

                        // Update the node's type to only include the constrained type
                        currentNode.element.type = [matchingType]

                        // Proceed with expansion using the constrained type
                        const currentElementDefinition =
                            structureDefinitionMap.get(matchingType.code)
                        if (!currentElementDefinition) {
                            throw new Error(
                                `currentElementDefinition not found: ${matchingType.code}`,
                            )
                        }
                        const currentElementChildren =
                            currentElementDefinition.snapshot?.element
                        if (!currentElementChildren) {
                            throw new Error('currentElementChildren not found')
                        }
                        const pathReplacedCurrentElementChildren =
                            currentElementChildren.slice(1).map(child => {
                                const newPath = `${currentNode.path}.${child.path.split('.').slice(1).join('.')}`
                                return {
                                    ...child,
                                    path: newPath,
                                    id: newPath,
                                }
                            })
                        for (const child of pathReplacedCurrentElementChildren) {
                            const childNode: Node = {
                                path: child.path,
                                element: child,
                                children: new Map(),
                            }
                            currentNode.children.set(child.path, childNode)
                            stack.push(childNode)
                        }
                        const replaced = replaceNodeByPath(
                            newTree,
                            currentNode.path,
                            currentNode,
                        )
                        if (!replaced) {
                            throw new Error('replaced not found')
                        }
                        newTree = replaced
                        continue
                    }
                }
            }

            // For non-choice types or unconstrained choice types, require exactly one type
            if (currentElementTypes.length !== 1) {
                console.error(
                    `currentElementTypes.length > 1: ${currentNode.path}`,
                )
                throw new Error('currentElementTypes.length > 1')
            }

            const currentElementType = currentElementTypes[0]
            const currentElementDefinition =
                structureDefinitionMap.get(currentElementType)
            if (!currentElementDefinition) {
                throw new Error(
                    `currentElementDefinition not found: ${currentElementType}`,
                )
            }
            const currentElementChildren =
                currentElementDefinition.snapshot?.element
            if (!currentElementChildren) {
                throw new Error('currentElementChildren not found')
            }
            const pathReplacedCurrentElementChildren = currentElementChildren
                .slice(1)
                .map(child => {
                    const newPath = `${currentNode.path}.${child.path.split('.').slice(1).join('.')}`
                    return {
                        ...child,
                        path: newPath,
                        id: newPath,
                    }
                })
            for (const child of pathReplacedCurrentElementChildren) {
                const childNode: Node = {
                    path: child.path,
                    element: child,
                    children: new Map(),
                }
                currentNode.children.set(child.path, childNode)
                stack.push(childNode)
            }
            const replaced = replaceNodeByPath(
                newTree,
                currentNode.path,
                currentNode,
            )
            if (!replaced) {
                throw new Error('replaced not found')
            }
            newTree = replaced
            continue
        }
        if (
            currentNode.children.size === 0 &&
            currentNode.path.endsWith('[x]')
        ) {
            const parentPath = currentNode.path
                .split('.')
                .slice(0, -1)
                .join('.')
            const currentElementChildrenDiffPaths = hasChildren.get(parentPath)
            if (!currentElementChildrenDiffPaths) {
                continue
            }
            const currentElementPathBase = currentNode.path.slice(0, -3)
            const currentElementChildrenDiffPathsFiltered =
                currentElementChildrenDiffPaths.filter(path =>
                    path.startsWith(currentElementPathBase),
                )
            if (currentElementChildrenDiffPathsFiltered.length === 0) {
                continue
            }
            const currentChoiceOfTypes = currentNode.element.type
            const currentChoiceOfTypesParsed =
                parseElementTypes(currentChoiceOfTypes)
            for (const childPath of currentElementChildrenDiffPathsFiltered) {
                const currentLeefPath = childPath.split('.').slice(-1)[0]
                const currentLeefTypePascalCase = currentLeefPath.slice(
                    currentElementPathBase.split('.').slice(-1)[0].length,
                )
                const currentLeefTypeCamelCase =
                    currentLeefTypePascalCase.charAt(0).toLowerCase() +
                    currentLeefTypePascalCase.slice(1)
                const currentLeafTypeIndex =
                    currentChoiceOfTypesParsed.findIndex(
                        type =>
                            type === currentLeefTypeCamelCase ||
                            type === currentLeefTypePascalCase,
                    )
                if (
                    currentLeafTypeIndex === -1 &&
                    currentLeefTypeCamelCase !== '[x]'
                ) {
                    throw new Error('currentLeafTypeIndex not found')
                }
                const typeField = [currentChoiceOfTypes[currentLeafTypeIndex]]
                const newElement = {
                    ...currentNode.element,
                    path: childPath,
                    id: childPath,
                    type: typeField,
                }
                const childNode: Node = {
                    path: childPath,
                    element: newElement,
                    children: new Map(),
                }
                if (childPath.endsWith('[x]')) {
                    const updated = replaceNodeByPath(
                        newTree,
                        currentNode.path,
                        currentNode,
                    )
                    if (!updated) {
                        throw new Error('updated not found')
                    }
                    newTree = updated
                } else {
                    const added = addNodeByPath(newTree, childPath, childNode)
                    if (!added) {
                        throw new Error('added not found')
                    }
                    newTree = added
                    stack.push(childNode)
                }
            }
            continue
        }
        if (currentNode.children.size > 0) {
            for (const child of currentNode.children.values()) {
                stack.push(child)
            }
        }
    }
    return newTree
}

const mergeElementByPath = (
    node: Node,
    diffElements: ElementDefinition[],
): Node => {
    let newNode = deepCopyNode(node)
    if (diffElements.length === 0) {
        return newNode
    }
    for (const diffElement of diffElements) {
        const baseElementNode = getNodeByPath(newNode, diffElement.path)
        if (!baseElementNode) {
            throw new Error(`Element not found: ${diffElement.path}`)
        }
        const newElement = {
            ...baseElementNode.element,
            ...diffElement,
        }
        const newElementNode: Node = {
            path: diffElement.path,
            element: newElement,
            children: baseElementNode.children,
        }
        const replaced = replaceNodeByPath(
            newNode,
            diffElement.path,
            newElementNode,
        )
        if (!replaced) {
            throw new Error(
                `Failed to replace node at path: ${diffElement.path}`,
            )
        }
        newNode = replaced
    }
    return newNode
}

const resolveElementDefinition = (node: Node): ElementDefinition[] => {
    const retElementDefinitions: ElementDefinition[] = [node.element]
    for (const child of node.children.values()) {
        retElementDefinitions.push(...resolveElementDefinition(child))
    }
    return retElementDefinitions
}

const deepCopyNode = (node: Node): Node => {
    const copiedNode = {
        ...JSON.parse(JSON.stringify(node)),
        children: new Map(),
    }

    // 子ノードを再帰的にコピー
    for (const [key, child] of node.children.entries()) {
        copiedNode.children.set(key, deepCopyNode(child))
    }

    return copiedNode
}

export const mergeDefinitions = (
    baseDefinitions: ElementDefinition[],
    diffDefinitions: ElementDefinition[],
    structureDefinitionMap: Map<string, StructureDefinition>,
): ElementDefinition[] => {
    const baseTree = buildTree(baseDefinitions)
    const hasChildren = buildHasChildren(diffDefinitions)
    const diffElementMap = buildElementMap(diffDefinitions)
    const expandedTree = expandTree(
        baseTree,
        hasChildren,
        structureDefinitionMap,
        diffElementMap,
    )
    const mergedTree = mergeElementByPath(expandedTree, diffDefinitions)
    const resolvedElementDefinitions = resolveElementDefinition(mergedTree)
    return resolvedElementDefinitions
}

export const resolveConstraintChain = (
    targetDefinition: StructureDefinition,
    structureDefinitionMap: Map<string, StructureDefinition>,
    typeNameUrlConverter: TypeNameUrlConverter,
): StructureDefinition => {
    const resultTargetDefinition = JSON.parse(
        JSON.stringify(targetDefinition),
    ) as StructureDefinition
    let chain: ElementDefinition[][] = []

    let currentDef = targetDefinition
    while (
        currentDef.derivation === 'constraint' &&
        currentDef.baseDefinition
    ) {
        const elementDefinitions = currentDef.differential?.element
        if (!elementDefinitions) {
            throw new Error('elementDefinitions not found')
        }
        chain.push(elementDefinitions)

        const baseUri = currentDef.baseDefinition
        const baseId = typeNameUrlConverter.urlToTypeName(baseUri)

        if (!baseId) {
            throw new Error(
                `Base definition URL ${baseUri} could not be converted to a type name for ${currentDef.id}`,
            )
        }

        const baseDef = structureDefinitionMap.get(baseId)
        if (!baseDef) {
            throw new Error(
                `Base definition ${baseId} not found for ${currentDef.id}`,
            )
        }
        currentDef = baseDef
    }
    const baseElementDefinitions = currentDef.snapshot?.element
    if (!baseElementDefinitions) {
        throw new Error('baseElementDefinitions not found')
    }
    chain.push(baseElementDefinitions)
    // Reverse to get from base specification to most specific constraint
    chain = chain.reverse()

    if (chain.length === 1) {
        return targetDefinition
    }

    const baseDefinitions = chain[0]

    const fullyMergedDefinition = chain.reduce((acc, curr, index) => {
        // Skip the first element as it's the target definition
        if (index === 0) return acc
        return mergeDefinitions(acc, curr, structureDefinitionMap)
    }, baseDefinitions)
    if (!resultTargetDefinition.snapshot) {
        resultTargetDefinition.snapshot = { element: [] }
    }

    resultTargetDefinition.snapshot.element = fullyMergedDefinition
    return resultTargetDefinition
}

export const testModules = {
    mergeDefinitions: mergeDefinitions,
    buildTree: buildTree,
    buildHasChildren: buildHasChildren,
    buildElementMap: buildElementMap,
    expandTree: expandTree,
    mergeElementByPath: mergeElementByPath,
    resolveElementDefinition: resolveElementDefinition,
    getNodeByPath: getNodeByPath,
    replaceNodeByPath: replaceNodeByPath,
    deepCopyNode: deepCopyNode,
    addNodeByPath: addNodeByPath,
    deleteNodeByPath: deleteNodeByPath,
}
