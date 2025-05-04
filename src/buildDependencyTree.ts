import child_process from 'node:child_process'
import { z } from 'zod'
import {
    ElementDefinitionSchemaR4,
    StructureDefinitionSchemaR4,
} from './types/StructureDefinitions/r4'
import { DependencyMap } from './types/tree'
import { TypeNameUrlConverter } from './utils'

type StructureDefinition = z.infer<typeof StructureDefinitionSchemaR4>
type ElementDefinition = z.infer<typeof ElementDefinitionSchemaR4>

export const buildDependencyMap = (
    structureDefinitions: StructureDefinition[],
) => {
    console.info(
        `Building dependency map for ${structureDefinitions.length} structure definitions...`,
    )
    const typeNameUrlConverter = new TypeNameUrlConverter(structureDefinitions)
    let dependencyMap: DependencyMap = {}

    for (const structureDefinition of structureDefinitions) {
        const snapshot = structureDefinition.snapshot
        const differential = structureDefinition.differential
        if (!(snapshot || differential)) {
            console.error(
                `StructureDefinition ${structureDefinition.id} has no snapshot or differential.`,
            )
            continue
        }
        const id = structureDefinition.id
        // Initialize the dependency array for this definition
        dependencyMap[id] = []
        if (structureDefinition.kind === 'primitive-type') {
            continue
        }

        // Add baseDefinition as a dependency if it exists and has derivation="constraint"
        if (
            structureDefinition.derivation === 'constraint' &&
            structureDefinition.baseDefinition
        ) {
            const baseUrl = structureDefinition.baseDefinition
            const baseId =
                typeNameUrlConverter.urlToTypeName(baseUrl) || baseUrl

            if (!dependencyMap[id].includes(baseId)) {
                dependencyMap[id].push(baseId)
            }
        }
        if (
            structureDefinition.derivation === 'constraint' &&
            !structureDefinition.baseDefinition
        ) {
            console.error(
                `StructureDefinition ${structureDefinition.id} has no baseDefinition.`,
            )
            throw new Error(
                `StructureDefinition ${structureDefinition.id} has no baseDefinition.`,
            )
        }

        const snapshotElements = snapshot?.element || []
        const differentialElements = differential?.element || []

        if (snapshotElements.length > 0) {
            dependencyMap = updateDependencyMap(
                id,
                dependencyMap,
                snapshotElements,
            )
        }
        if (differentialElements.length > 0) {
            dependencyMap = updateDependencyMap(
                id,
                dependencyMap,
                differentialElements,
            )
        }
    }
    return dependencyMap
}

const updateDependencyMap = (
    id: string,
    dependencyMap: DependencyMap,
    elements: ElementDefinition[],
) => {
    for (const element of elements) {
        if (element?.type) {
            for (const typeInfo of element.type) {
                if (typeInfo.extension) {
                    for (const typeExtension of typeInfo.extension) {
                        if (
                            typeExtension.url ===
                            'http://hl7.org/fhir/StructureDefinition/structuredefinition-fhir-type'
                        ) {
                            const value = typeExtension.valueUrl
                            if (!value) {
                                console.error(
                                    `StructureDefinition ${id} has no value for extension http://hl7.org/fhir/StructureDefinition/structuredefinition-fhir-type`,
                                )
                                continue
                            }
                            if (typeof dependencyMap[id] === 'object') {
                                if (!dependencyMap[id].includes(value)) {
                                    dependencyMap[id].push(value)
                                }
                            }
                        }
                    }
                }

                if (typeInfo.code && typeof typeInfo.code === 'string') {
                    if (Array.isArray(dependencyMap[id])) {
                        if (!dependencyMap[id].includes(typeInfo.code)) {
                            dependencyMap[id].push(typeInfo.code)
                        }
                    }
                }
            }
        }
    }
    return dependencyMap
}
