import { z } from 'zod'
import { TypeNameUrlConverter } from './nameConverter'
import {
    ElementDefinitionSchemaR4,
    StructureDefinitionSchemaR4,
} from './types/StructureDefinitions/r4'

type StructureDefinition = z.infer<typeof StructureDefinitionSchemaR4>
type ElementDefinition = z.infer<typeof ElementDefinitionSchemaR4>
// Merge a base definition with a constraint definition
const mergeDefinitions = (
    base: StructureDefinition,
    constraint: StructureDefinition,
): StructureDefinition => {
    // Create a deep copy of base
    const merged = JSON.parse(JSON.stringify(base)) as StructureDefinition
    const constraintDeepCopy = JSON.parse(
        JSON.stringify(constraint),
    ) as StructureDefinition

    // Override with constraint properties
    merged.id = constraint.id
    merged.name = constraint.name
    merged.url = constraint.url
    merged.version = constraint.version
    merged.derivation = constraint.derivation

    // Keep track of base's elements by path for faster lookups
    const baseElementsByPath = new Map<string, ElementDefinition>()
    if (merged.snapshot?.element) {
        for (const element of merged.snapshot.element) {
            if (element.path) {
                baseElementsByPath.set(element.path, element)
            }
        }
    }

    // Apply constraints from the constraint definition
    if (constraint.differential?.element) {
        for (const constraintElement of constraint.differential.element) {
            if (constraintElement.path) {
                const baseElement = baseElementsByPath.get(
                    constraintElement.path,
                )
                if (baseElement) {
                    // Merge the constraint element into the base element
                    // This will override properties in the base element with those from the constraint
                    const mergedElement = {
                        ...baseElement,
                        ...constraintElement,
                    }
                    baseElementsByPath.set(
                        constraintElement.path,
                        mergedElement,
                    )

                    // Update the element in the snapshot
                    if (merged.snapshot?.element) {
                        const index = merged.snapshot.element.findIndex(
                            el => el.path === constraintElement.path,
                        )
                        if (index !== -1) {
                            merged.snapshot.element[index] = mergedElement
                        }
                    }
                } else {
                    // Add new element if it doesn't exist in the base
                    if (merged.snapshot?.element) {
                        merged.snapshot.element.push(constraintElement)
                    } else {
                        merged.snapshot = {
                            element: [constraintElement],
                        }
                    }
                    baseElementsByPath.set(
                        constraintElement.path,
                        constraintElement,
                    )
                }
            }
        }
    }

    constraintDeepCopy.snapshot = merged.snapshot
    return constraintDeepCopy
}

export const resolveConstraintChain = (
    targetDefinition: StructureDefinition,
    structureDefinitionMap: Map<string, StructureDefinition>,
    typeNameUrlConverter: TypeNameUrlConverter,
): StructureDefinition => {
    let chain: StructureDefinition[] = [targetDefinition]

    let currentDef = targetDefinition
    while (
        currentDef.derivation === 'constraint' &&
        currentDef.baseDefinition
    ) {
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

        chain.push(baseDef)
        currentDef = baseDef
    }

    // Reverse to get from base specification to most specific constraint
    chain = chain.reverse()

    if (chain.length === 1) {
        return chain[0]
    }

    const fullyMergedDefinition = chain.reduce((acc, curr, index) => {
        // Skip the first element as it's the target definition
        if (index === 0) return acc
        return mergeDefinitions(acc, curr)
    }, chain[0])

    return fullyMergedDefinition
}

// For testing purposes
export const mergeDefinitionsForTest = {
    mergeDefinitions,
}
