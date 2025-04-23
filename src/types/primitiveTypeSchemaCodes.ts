import { z } from "zod";

// Define a map of primitive type names to their Zod schemas
// Based on FHIR primitive types: https://www.hl7.org/fhir/datatypes.html#primitive

// Type definition for the primitive type map
export type PrimitiveTypeCodeMap = Map<string, string>;

/**
 * Initialize a map with all FHIR primitive types and their corresponding Zod schemas
 * This prevents circular references by pre-defining all primitive types
 */
export const initializePrimitiveTypeSchemasCodes = (): PrimitiveTypeCodeMap => {
    const primitiveTypes = new Map<string, string>();

    // String types
    primitiveTypes.set("string", "z.string()");
    primitiveTypes.set("code", "z.string()");
    primitiveTypes.set("id", "z.string()");
    primitiveTypes.set("markdown", "z.string()");
    primitiveTypes.set("uri", "z.string().url()");
    primitiveTypes.set("url", "z.string().url()");
    primitiveTypes.set("canonical", "z.string().url()");
    primitiveTypes.set("oid", "z.string()");
    primitiveTypes.set("uuid", "z.string().uuid()");

    // Numeric types
    primitiveTypes.set("decimal", "z.number()");
    primitiveTypes.set("integer", "z.number().int()");
    primitiveTypes.set("unsignedInt", "z.number().int().nonnegative()");
    primitiveTypes.set("positiveInt", "z.number().int().positive()");

    // Date/time types
    primitiveTypes.set("date", "z.string()"); // Could be enhanced with custom validation
    primitiveTypes.set("dateTime", "z.string()");
    primitiveTypes.set("instant", "z.string()");
    primitiveTypes.set("time", "z.string()");

    // Other types
    primitiveTypes.set("boolean", "z.boolean()");
    primitiveTypes.set("base64Binary", "z.string()");

    return primitiveTypes;
}; 