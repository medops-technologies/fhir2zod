import { initializePrimitiveTypeSchemasCodes, PrimitiveTypeCodeMap } from "./types/primitiveTypeSchemaCodes";
import { StructureDefinitionSchemaR4, ElementDefinitionSchemaR4 } from "./types/StructureDefinitions/r4";
import { typeNameToZodSchemaName, TypeNameUrlConverter } from "./nameConverter";
import { z } from "zod";
import { resolveConstraintChain } from "./merger";

type StructureDefinition = z.infer<typeof StructureDefinitionSchemaR4>;
type ElementDefinition = z.infer<typeof ElementDefinitionSchemaR4>;

type Node = {
    id: string
    element: ElementDefinition
    children: Node[]
}
const buildNodeTree = (
    elementDefinitions: ElementDefinition[]
): Node => {
    if (elementDefinitions.length === 0) {
        throw new Error('elementDefinitions is empty');
    }
    const rootMutable: Node = {
        id: elementDefinitions[0].path,
        element: elementDefinitions[0],
        children: []
    }
    const stack: Node[] = [rootMutable]
    for (const element of elementDefinitions.slice(1)) {
        const segments = element.path.split('.')
        // find the parent node in the stack, discarding the branches that are not the parent.
        while (stack.length > segments.length) { stack.pop() } // for performance
        while (
            stack.length &&
            !element.path.startsWith(stack[stack.length - 1].id + '.')
        ) {
            stack.pop()
        }
        const parentAsStackRef = stack[stack.length - 1]
        const child: Node = {
            id: element.path,
            element,
            children: []
        }
        parentAsStackRef.children.push(child) // element in stack is also updated because parentAsStackRef is a reference(pointer)
        stack.push(child)
    }
    return rootMutable
}

const constructZodSchemaCodeFromNodeTree = (
    node: Node,
    rootType: string,
    isPrimitiveStructureDefinition: boolean,
    primitiveTypeCodeMap: PrimitiveTypeCodeMap,
): string => {
    const { element, children } = node

    if (element.path.endsWith('[x]')) {
        return constructZodOnChoiceOfType(element, isPrimitiveStructureDefinition, primitiveTypeCodeMap)
    }
    if (children.length === 0) {
        const elementName = element.path.split('.').pop() as string
        if (!element.type) {
            if (element.contentReference) {
                const contentReferenceSegments = element.contentReference.split('.')
                if (contentReferenceSegments[0] !== `#${rootType}`) {
                    console.error(contentReferenceSegments)
                    console.error(rootType)
                    throw new Error(`path ${element.path} has contentReference ${element.contentReference} which is not intended`)
                }
                const rootSchemaName = isPrimitiveStructureDefinition ? primitiveTypeCodeMap.get(rootType) || typeNameToZodSchemaName(rootType) : typeNameToZodSchemaName(rootType)
                return `${elementName}: z.lazy(() => ${rootSchemaName}.shape.${contentReferenceSegments.slice(1).map(
                    segment => {
                        return isPrimitiveStructureDefinition ? primitiveTypeCodeMap.get(segment) || typeNameToZodSchemaName(segment) : typeNameToZodSchemaName(segment)
                    }
                ).join('.shape.')})`
            }
            console.error(element)
            throw new Error(`path ${element.path} has no contentReference and no type`)
        }
        if (element.type.length !== 1) {
            console.error(element)
            throw new Error(`path ${element.path} has ${element.type?.length} types: this is not intended`)
        }
        const elementType = parseElementTypes(element.type)[0]
        if (!elementType) {
            console.dir(element.type[0].extension)
            throw new Error(`path ${element.path} has no type`)
        }
        const arraySuffix = element.max === "*" ? ".array()" : ""
        const optionalSuffix = element.min === 0 ? ".optional()" : ""
        const shouldLazy = elementType === rootType
        if (isPrimitiveStructureDefinition) {
            const typeName = primitiveTypeCodeMap.get(elementType) || typeNameToZodSchemaName(elementType)
            const returnSchema = `${typeName}${arraySuffix}${optionalSuffix}`
            return shouldLazy ? `${elementName}: z.lazy(() => ${returnSchema})` : `${elementName}: ${returnSchema}`
        } else {
            const returnSchema = `${typeNameToZodSchemaName(elementType)}${arraySuffix}${optionalSuffix}`
            return shouldLazy ? `${elementName}: z.lazy(() => ${returnSchema})` : `${elementName}: ${returnSchema}`
        }
    }
    const fields = children
        .map(child => {
            const childSchemaCode = constructZodSchemaCodeFromNodeTree(child, rootType, isPrimitiveStructureDefinition, primitiveTypeCodeMap)
            const key = child.element.path.split('.').pop() as string
            return childSchemaCode
            //return `${key}: ${childSchemaCode}`
        })
        .join(",\n")
    const schemaName = element.path === rootType ? "" : typeNameToZodSchemaName(element.path.split('.').pop() as string) + ": "
    return `${schemaName}z.object({\n${fields}\n})`
}

const constructImportStatements = (
    elementDefinitions: ElementDefinition[],
    rootType: string,
    isPrimitiveStructureDefinition: boolean,
    primitiveTypeCodeMap: PrimitiveTypeCodeMap
): string => {
    const importStatements = new Set<string>()
    for (const element of elementDefinitions) {
        if (!element.type) continue
        const types = parseElementTypes(element.type)
        innerLoop: for (const type of types) {
            if (rootType === type) {
                continue innerLoop
            }
            if (isPrimitiveStructureDefinition && primitiveTypeCodeMap.has(type)) {
                continue innerLoop
            }
            importStatements.add(type)
        }
    }
    const importStatementsArray = Array.from(importStatements)
    return `import { z } from 'zod'\n${importStatementsArray.map(importStatement => `import { ${typeNameToZodSchemaName(importStatement)} } from './${importStatement}'`).join('\n')
        }`
}

const constructZodOnChoiceOfType = (
    element: ElementDefinition,
    isPrimitiveStructureDefinition: boolean,
    primitiveTypeCodeMap: PrimitiveTypeCodeMap
): string => {
    const elementNameRaw = element.path.split('.').pop() as string
    const elementName = elementNameRaw.slice(0, -3)
    const types = parseElementTypes(element.type)

    return types.map(type => {
        const typeName = type.charAt(0).toUpperCase() + type.slice(1)
        if (isPrimitiveStructureDefinition) {
            return `${elementName}${typeName}: ${primitiveTypeCodeMap.get(type) || typeNameToZodSchemaName(type)}`
        } else {
            return `${elementName}${typeName}: ${typeNameToZodSchemaName(type)}`
        }
    }).join(",\n")
}

const parseElementTypes = (elementTypes: ElementDefinition['type']): string[] => {
    const types: string[] = []
    outerLoop: for (const type of elementTypes || []) {
        if (type.extension) {
            for (const extension of type.extension) {
                if (extension.url === "http://hl7.org/fhir/StructureDefinition/structuredefinition-fhir-type") {
                    types.push(extension.valueUrl as string)
                    continue outerLoop
                }
            }
        }
        types.push(type.code as string)
    }
    return types
}

const constructZodSchemaCode = (
    structureDefinition: StructureDefinition,
    primitiveTypeCodeMap: PrimitiveTypeCodeMap,
): string => {
    const isConstraint = structureDefinition.derivation === "constraint"
    try {
        const nodeTree = buildNodeTree(structureDefinition.snapshot?.element || [])
        let importStatements = constructImportStatements(structureDefinition.snapshot?.element || [], nodeTree.id, structureDefinition.kind === "primitive-type", primitiveTypeCodeMap)
        if (isConstraint) {
            importStatements += `\nimport { ${typeNameToZodSchemaName(nodeTree.id)} } from './${nodeTree.id}'\n`
        }
        const schemaCode = constructZodSchemaCodeFromNodeTree(nodeTree, nodeTree.id, structureDefinition.kind === "primitive-type", primitiveTypeCodeMap)
        const schemaName = isConstraint ? `${typeNameToZodSchemaName(nodeTree.id + "-" + structureDefinition.id)}` : typeNameToZodSchemaName(nodeTree.id)
        return `${importStatements}\nexport const ${schemaName} = ${schemaCode}`
    } catch (error) {
        console.error(structureDefinition)
        return ""
    }
}


// Generate all Zod schemas with proper dependency resolution
export const generateZodSchemasWithDependencies = (
    structureDefinitions: StructureDefinition[],
    primitiveTypeCodeMap: PrimitiveTypeCodeMap
): Map<string, string> => {
    const typeNameUrlConverter = new TypeNameUrlConverter(structureDefinitions);
    const structureDefinitionMap = new Map<string, StructureDefinition>();
    for (const definition of structureDefinitions) {
        structureDefinitionMap.set(definition.id, definition);
    }

    const results = new Map<string, string>();
    for (const definition of structureDefinitions) {
        try {
            if (definition.derivation === "constraint") {
                const resolvedDefinition = resolveConstraintChain(definition, structureDefinitionMap, typeNameUrlConverter);
                const schemaCode = constructZodSchemaCode(resolvedDefinition, primitiveTypeCodeMap);
                results.set(definition.id, schemaCode);
                continue
            }
            const schemaCode = constructZodSchemaCode(definition, primitiveTypeCodeMap);
            results.set(definition.id, schemaCode);
        } catch (error) {
            console.error(`Error processing constraint definition ${definition.id}:`, error);
            results.set(definition.id, `// Error processing constraint: ${(error as Error).message}`);
        }
    }
    return results;
}

export const testModules = {
    buildNodeTree,
    constructZodSchemaCode,
    constructImportStatements,
    constructZodSchemaCodeFromNodeTree,
    constructZodOnChoiceOfType,
    parseElementTypes,
}