import { z } from 'zod'
import { resolveConstraintChain } from './merger'
import {
    ElementDefinitionSchemaR4,
    StructureDefinitionSchemaR4,
} from './types/StructureDefinitions/r4'
import {
    PrimitiveTypeCodeMap,
    initializePrimitiveTypeSchemasCodes,
} from './types/primitiveTypeSchemaCodes'
import {
    TypeNameUrlConverter,
    parseElementTypes,
    typeNameToZodSchemaName,
} from './utils'

type StructureDefinition = z.infer<typeof StructureDefinitionSchemaR4>
type ElementDefinition = z.infer<typeof ElementDefinitionSchemaR4>

type Node = {
    id: string
    element: ElementDefinition
    children: Node[]
}
const buildNodeTree = (elementDefinitions: ElementDefinition[]): Node => {
    if (elementDefinitions.length === 0) {
        throw new Error('elementDefinitions is empty')
    }

    // First, identify the root path and create root node
    const rootPath = elementDefinitions[0].path
    const rootMutable: Node = {
        id: rootPath,
        element: elementDefinitions[0],
        children: [],
    }

    // Create a map to store all nodes for quick lookup
    const nodeMap = new Map<string, Node>()
    nodeMap.set(rootPath, rootMutable)

    // Process remaining elements and expand [x] form paths
    for (const element of elementDefinitions.slice(1)) {
        if (element.path.endsWith('[x]') && element.type) {
            // Expand [x] form paths into concrete paths
            const basePath = element.path.slice(0, -3)
            for (const type of element.type) {
                const typeName =
                    type.code.charAt(0).toUpperCase() + type.code.slice(1)
                const concretePath = `${basePath}${typeName}`

                // Create expanded element
                const expandedElement: ElementDefinition = {
                    ...element,
                    path: concretePath,
                    id: concretePath,
                    type: [type],
                }

                // Add to tree
                addNodeToTree(expandedElement, nodeMap)
            }
        } else {
            // Add regular element to tree
            addNodeToTree(element, nodeMap)
        }
    }

    return rootMutable
}

const addNodeToTree = (
    element: ElementDefinition,
    nodeMap: Map<string, Node>,
) => {
    const pathParts = element.path.split('.')
    const parentPath = pathParts.slice(0, -1).join('.')

    // Get or create parent node
    let parentNode = nodeMap.get(parentPath)
    if (!parentNode) {
        // If parent node doesn't exist, create it with minimal properties
        parentNode = {
            id: parentPath,
            element: {
                path: parentPath,
                id: parentPath,
            } as ElementDefinition,
            children: [],
        }
        nodeMap.set(parentPath, parentNode)

        // Find and link to grandparent
        const grandparentPath = pathParts.slice(0, -2).join('.')
        const grandparent = nodeMap.get(grandparentPath)
        if (grandparent) {
            grandparent.children.push(parentNode)
        }
    }

    // Create current node
    const currentNode: Node = {
        id: element.path,
        element,
        children: [],
    }

    // Check if this is a concrete path that should override an existing node
    const existingNodeIndex = parentNode.children.findIndex(
        child => child.id === element.path,
    )

    if (existingNodeIndex !== -1) {
        // If this is a concrete path, it should override the existing node
        if (!element.path.endsWith('[x]')) {
            // Preserve existing children when overriding
            const existingChildren =
                parentNode.children[existingNodeIndex].children
            currentNode.children = existingChildren
            parentNode.children[existingNodeIndex] = currentNode
        }
    } else {
        parentNode.children.push(currentNode)
    }

    nodeMap.set(element.path, currentNode)
}

const constructZodSchemaCodeFromNodeTree = (
    node: Node,
    rootType: string,
    isPrimitiveStructureDefinition: boolean,
    primitiveTypeCodeMap: PrimitiveTypeCodeMap,
): string => {
    const { element, children } = node

    if (children.length === 0) {
        const elementName = element.path.split('.').pop() as string
        if (!element.type) {
            if (element.contentReference) {
                const contentReferenceSegments =
                    element.contentReference.split('.')
                if (contentReferenceSegments[0] !== `#${rootType}`) {
                    console.error(contentReferenceSegments)
                    console.error(rootType)
                    throw new Error(
                        `path ${element.path} has contentReference ${element.contentReference} which is not intended`,
                    )
                }
                const rootSchemaName = isPrimitiveStructureDefinition
                    ? primitiveTypeCodeMap.get(rootType) ||
                      typeNameToZodSchemaName(rootType)
                    : typeNameToZodSchemaName(rootType)
                return `${elementName}: z.lazy(() => ${rootSchemaName}.shape.${contentReferenceSegments
                    .slice(1)
                    .map(segment => {
                        return isPrimitiveStructureDefinition
                            ? primitiveTypeCodeMap.get(segment) ||
                                  typeNameToZodSchemaName(segment)
                            : typeNameToZodSchemaName(segment)
                    })
                    .join('.shape.')})`
            }
            console.error(element)
            throw new Error(
                `path ${element.path} has no contentReference and no type`,
            )
        }
        // Only check for single type if it's not a choice type
        if (!element.path.endsWith('[x]') && element.type.length !== 1) {
            throw new Error(
                `path ${element.path} has ${element.type?.length} types: this is not intended`,
            )
        }
        const elementType = parseElementTypes(element.type)[0]
        if (!elementType) {
            console.dir(element.type[0].extension)
            throw new Error(`path ${element.path} has no type`)
        }
        if (element.min === 0 && element.max === '0') {
            return `// The field '${element.path.split('.').pop() as string}' is omitted because its cardinality is 0..0`
        }
        let arraySuffix = ''
        if (
            element.max === '*' ||
            (element.max && Number.parseInt(element.max, 10) > 1)
        ) {
            arraySuffix = '.array()'
            if (element.min !== 0) {
                arraySuffix += `.min(${element.min})`
            }
            if (element.max && element.max !== '*') {
                arraySuffix += `.max(${Number.parseInt(element.max, 10)})`
            }
        }
        const optionalSuffix = element.min === 0 ? '.optional()' : ''
        const shouldLazy = elementType === rootType
        if (isPrimitiveStructureDefinition) {
            const primitiveTypeSchema = primitiveTypeCodeMap.get(elementType)
            if (primitiveTypeSchema) {
                return `${elementName}: ${primitiveTypeSchema}${arraySuffix}${optionalSuffix}`
            }
            const returnSchema = `${typeNameToZodSchemaName(elementType)}${arraySuffix}${optionalSuffix}`
            return shouldLazy
                ? `${elementName}: z.lazy(() => ${returnSchema})`
                : `${elementName}: ${returnSchema}`
        }
        const primitiveTypeSchema = primitiveTypeCodeMap.get(elementType)
        if (primitiveTypeSchema) {
            return `${elementName}: ${primitiveTypeSchema}${arraySuffix}${optionalSuffix},\n_${elementName}: ${typeNameToZodSchemaName(elementType)}${arraySuffix}.optional()`
        }
        const returnSchema = `${typeNameToZodSchemaName(elementType)}${arraySuffix}${optionalSuffix}`
        return shouldLazy
            ? `${elementName}: z.lazy(() => ${returnSchema})`
            : `${elementName}: ${returnSchema}`
    }

    const fields = children
        .map(child => {
            const childSchemaCode = constructZodSchemaCodeFromNodeTree(
                child,
                rootType,
                isPrimitiveStructureDefinition,
                primitiveTypeCodeMap,
            )
            return childSchemaCode
        })
        .filter(Boolean) // Remove empty strings and nulls
        .join(',\n')

    const elementName = element.path.split('.').pop() as string
    const schemaName = element.path === rootType ? '' : `${elementName}: `
    const fieldOptionalSuffix = element.min === 0 ? '.optional()' : ''
    const fieldArraySuffix =
        element.max === '*' ||
        (element.max && Number.parseInt(element.max, 10) > 1)
            ? '.array()'
            : ''
    const fieldSuffix =
        element.path === rootType
            ? ''
            : `${fieldArraySuffix}${fieldOptionalSuffix}`
    return fields ? `${schemaName}z.object({\n${fields}\n})${fieldSuffix}` : ''
}

const constructImportStatements = (
    elementDefinitions: ElementDefinition[],
    rootType: string,
    isPrimitiveStructureDefinition: boolean,
    primitiveTypeCodeMap: PrimitiveTypeCodeMap,
): string => {
    const importStatements = new Set<string>()
    for (const element of elementDefinitions) {
        if (!element.type) continue
        const types = parseElementTypes(element.type)
        for (const type of types) {
            if (rootType === type) {
                continue
            }
            if (
                isPrimitiveStructureDefinition &&
                primitiveTypeCodeMap.has(type)
            ) {
                continue
            }
            importStatements.add(type)
        }
    }
    const importStatementsArray = Array.from(importStatements)
    return `import { z } from 'zod'\n${importStatementsArray
        .map(
            importStatement =>
                `import { ${typeNameToZodSchemaName(importStatement)} } from './${importStatement}'`,
        )
        .join('\n')}`
}

const constructZodOnChoiceOfType = (
    element: ElementDefinition,
    isPrimitiveStructureDefinition: boolean,
    primitiveTypeCodeMap: PrimitiveTypeCodeMap,
): string => {
    const elementNameRaw = element.path.split('.').pop() as string
    const elementName = elementNameRaw.slice(0, -3)
    const types = parseElementTypes(element.type)

    // Generate schema for all types
    const schemaForTypes = types
        .map(type => {
            const typeName = type.charAt(0).toUpperCase() + type.slice(1)
            if (isPrimitiveStructureDefinition) {
                return `${elementName}${typeName}: ${primitiveTypeCodeMap.get(type) || typeNameToZodSchemaName(type)}`
            }
            return `${elementName}${typeName}: ${typeNameToZodSchemaName(type)}`
        })
        .join(',\n')

    return schemaForTypes
}

const constructZodSchemaCode = (
    structureDefinition: StructureDefinition,
    primitiveTypeCodeMap: PrimitiveTypeCodeMap,
): string => {
    const isConstraint = structureDefinition.derivation === 'constraint'
    try {
        const nodeTree = buildNodeTree(
            structureDefinition.snapshot?.element || [],
        )
        let importStatements = constructImportStatements(
            structureDefinition.snapshot?.element || [],
            nodeTree.id,
            structureDefinition.kind === 'primitive-type',
            primitiveTypeCodeMap,
        )
        if (isConstraint) {
            importStatements += `\nimport { ${typeNameToZodSchemaName(nodeTree.id)} } from './${nodeTree.id}'\n`
        }
        const schemaCode = constructZodSchemaCodeFromNodeTree(
            nodeTree,
            nodeTree.id,
            structureDefinition.kind === 'primitive-type',
            primitiveTypeCodeMap,
        )
        const schemaName = isConstraint
            ? `${typeNameToZodSchemaName(`${nodeTree.id}-${structureDefinition.id}`)}`
            : typeNameToZodSchemaName(nodeTree.id)
        return `${importStatements}\nexport const ${schemaName} = ${schemaCode}`
    } catch (_error) {
        console.error(_error)
        console.error(structureDefinition)
        return ''
    }
}

// Generate all Zod schemas with proper dependency resolution
export const generateZodSchemasWithDependencies = (
    structureDefinitions: StructureDefinition[],
    primitiveTypeCodeMap: PrimitiveTypeCodeMap,
): Map<string, string> => {
    const typeNameUrlConverter = new TypeNameUrlConverter(structureDefinitions)
    const structureDefinitionMap = new Map<string, StructureDefinition>()
    for (const definition of structureDefinitions) {
        structureDefinitionMap.set(definition.id, definition)
    }

    const results = new Map<string, string>()
    for (const definition of structureDefinitions) {
        try {
            if (definition.derivation === 'constraint') {
                const resolvedDefinition = resolveConstraintChain(
                    definition,
                    structureDefinitionMap,
                    typeNameUrlConverter,
                )
                const schemaCode = constructZodSchemaCode(
                    resolvedDefinition,
                    primitiveTypeCodeMap,
                )
                results.set(definition.id, schemaCode)
                continue
            }
            const schemaCode = constructZodSchemaCode(
                definition,
                primitiveTypeCodeMap,
            )
            results.set(definition.id, schemaCode)
        } catch (error) {
            console.error(
                `Error processing constraint definition ${definition.id}:`,
                error,
            )
            //results.set(
            //    definition.id,
            //    `// Error processing constraint: ${(error as Error).message}`,
            //)
        }
    }
    return results
}

export const testModules = {
    buildNodeTree,
    constructZodSchemaCode,
    constructImportStatements,
    constructZodSchemaCodeFromNodeTree,
    constructZodOnChoiceOfType,
    parseElementTypes,
}
