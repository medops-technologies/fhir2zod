import { z } from 'zod'

// Define a map of primitive type names to their Zod schemas
// Based on FHIR primitive types: https://www.hl7.org/fhir/datatypes.html#primitive

// Type definition for the primitive type map
export type PrimitiveTypeCodeMap = Map<string, string>

/**
 * Initialize a map with all FHIR primitive types and their corresponding Zod schemas
 * This prevents circular references by pre-defining all primitive types
 */
export const initializePrimitiveTypeSchemasCodes = (): PrimitiveTypeCodeMap => {
    const primitiveTypes = new Map<string, string>()

    // String types
    primitiveTypes.set('string', 'z.string()')
    primitiveTypes.set('code', 'z.string()')
    primitiveTypes.set('id', 'z.string()')
    primitiveTypes.set('markdown', 'z.string()')
    primitiveTypes.set('uri', 'z.string().url()')
    primitiveTypes.set('url', 'z.string().url()')
    primitiveTypes.set('canonical', 'z.string().url()')
    primitiveTypes.set('oid', 'z.string()')
    primitiveTypes.set('uuid', 'z.string().uuid()')

    // Numeric types
    primitiveTypes.set('decimal', 'z.number()')
    primitiveTypes.set('integer', 'z.number().int()')
    primitiveTypes.set('unsignedInt', 'z.number().int().nonnegative()')
    primitiveTypes.set('positiveInt', 'z.number().int().positive()')

    // Date/time types
    primitiveTypes.set('date', 'z.string()') // Could be enhanced with custom validation
    primitiveTypes.set('dateTime', 'z.string()')
    primitiveTypes.set('instant', 'z.string()')
    primitiveTypes.set('time', 'z.string()')

    // Other types
    primitiveTypes.set('boolean', 'z.boolean()')
    primitiveTypes.set('base64Binary', 'z.string()')
    primitiveTypes.set('xhtml', 'z.string()')

    return primitiveTypes
}

export const getPrimitiveTypeFromUri = (uri: string): string => {
    // FHIRPath System types
    if (uri === 'http://hl7.org/fhirpath/System.String') return 'string'
    if (uri === 'http://hl7.org/fhirpath/System.Boolean') return 'boolean'
    if (uri === 'http://hl7.org/fhirpath/System.Integer') return 'integer'
    if (uri === 'http://hl7.org/fhirpath/System.Decimal') return 'decimal'
    if (uri === 'http://hl7.org/fhirpath/System.Date') return 'date'
    if (uri === 'http://hl7.org/fhirpath/System.DateTime') return 'dateTime'
    if (uri === 'http://hl7.org/fhirpath/System.Time') return 'time'

    // Official FHIR StructureDefinition URIs
    if (uri === 'http://hl7.org/fhir/StructureDefinition/base64Binary')
        return 'base64Binary'
    if (uri === 'http://hl7.org/fhir/StructureDefinition/boolean')
        return 'boolean'
    if (uri === 'http://hl7.org/fhir/StructureDefinition/canonical')
        return 'canonical'
    if (uri === 'http://hl7.org/fhir/StructureDefinition/code') return 'code'
    if (uri === 'http://hl7.org/fhir/StructureDefinition/date') return 'date'
    if (uri === 'http://hl7.org/fhir/StructureDefinition/dateTime')
        return 'dateTime'
    if (uri === 'http://hl7.org/fhir/StructureDefinition/decimal')
        return 'decimal'
    if (uri === 'http://hl7.org/fhir/StructureDefinition/id') return 'id'
    if (uri === 'http://hl7.org/fhir/StructureDefinition/instant')
        return 'instant'
    if (uri === 'http://hl7.org/fhir/StructureDefinition/integer')
        return 'integer'
    if (uri === 'http://hl7.org/fhir/StructureDefinition/markdown')
        return 'markdown'
    if (uri === 'http://hl7.org/fhir/StructureDefinition/oid') return 'oid'
    if (uri === 'http://hl7.org/fhir/StructureDefinition/positiveInt')
        return 'positiveInt'
    if (uri === 'http://hl7.org/fhir/StructureDefinition/string')
        return 'string'
    if (uri === 'http://hl7.org/fhir/StructureDefinition/time') return 'time'
    if (uri === 'http://hl7.org/fhir/StructureDefinition/unsignedInt')
        return 'unsignedInt'
    if (uri === 'http://hl7.org/fhir/StructureDefinition/uri') return 'uri'
    if (uri === 'http://hl7.org/fhir/StructureDefinition/url') return 'url'
    if (uri === 'http://hl7.org/fhir/StructureDefinition/uuid') return 'uuid'
    if (uri === 'http://hl7.org/fhir/StructureDefinition/xhtml') return 'xhtml'

    // Fallback: extract the type name from the URI
    const parts = uri.split('/')
    const lastPart = parts[parts.length - 1]
    const cleanType = lastPart.split('#').pop() || lastPart

    return cleanType.toLowerCase()
}
