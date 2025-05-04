import { z } from 'zod'
import {
    ElementDefinitionSchemaR4,
    StructureDefinitionSchemaR4,
} from './types/StructureDefinitions/r4'
type StructureDefinition = z.infer<typeof StructureDefinitionSchemaR4>
type ElementDefinition = z.infer<typeof ElementDefinitionSchemaR4>

type ZodSchemaName = string
export const typeNameToZodSchemaName = (rawTypeName: string): ZodSchemaName => {
    // ab-cd-ef -> AbCdEfSchema
    // 123-abc -> OneTwoThreeAbcSchema
    // abc -> AbcSchema

    const numberWords = [
        'Zero',
        'One',
        'Two',
        'Three',
        'Four',
        'Five',
        'Six',
        'Seven',
        'Eight',
        'Nine',
    ]

    let result = ''
    let capitalizeNext = true

    for (let i = 0; i < rawTypeName.length; i++) {
        const char = rawTypeName[i]
        if (char === '-') {
            capitalizeNext = true
            continue
        }

        // Handle numeric characters
        if (/\d/.test(char)) {
            result += numberWords[Number.parseInt(char)]
            capitalizeNext = false
        } else {
            // Handle alphabetic characters
            result += capitalizeNext ? char.toUpperCase() : char
            capitalizeNext = false
        }
    }

    // Ensure first character is capitalized
    if (result.length > 0) {
        result = result.charAt(0).toUpperCase() + result.slice(1)
    }

    return `${result}Schema`
}

export class TypeNameUrlConverter {
    private typeNameToUrlMap: Map<string, string> = new Map()
    private urlToTypeNameMap: Map<string, string> = new Map()

    constructor(structureDefinitions: StructureDefinition[]) {
        for (const definition of structureDefinitions) {
            this.typeNameToUrlMap.set(definition.id, definition.url)
            this.urlToTypeNameMap.set(definition.url, definition.id)
        }
    }

    public typeNameToUrl(typeName: string): string | undefined {
        return this.typeNameToUrlMap.get(typeName)
    }

    public urlToTypeName(url: string): string | undefined {
        return this.urlToTypeNameMap.get(url)
    }
}

export const parseElementTypes = (
    elementTypes: ElementDefinition['type'],
): string[] => {
    const types: string[] = []
    outerLoop: for (const type of elementTypes || []) {
        if (type.extension) {
            for (const extension of type.extension) {
                if (
                    extension.url ===
                    'http://hl7.org/fhir/StructureDefinition/structuredefinition-fhir-type'
                ) {
                    types.push(extension.valueUrl as string)
                    continue outerLoop
                }
            }
        }
        types.push(type.code as string)
    }
    return types
}
