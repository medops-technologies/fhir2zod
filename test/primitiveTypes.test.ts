import { expect, describe, it } from "vitest";
import { initializePrimitiveTypeSchemas } from "../src/primitiveTypeSchemas";
import { constructZodSchema } from "../src/constructZodSchema";
import { z } from "zod";
import { StructureDefinitionSchemaR4 } from "../src/types/StructureDefinitions/r4";

describe('Primitive Types Handling', () => {
    it('should initialize all FHIR primitive types', () => {
        const primitiveTypes = initializePrimitiveTypeSchemas();

        // Test that common FHIR primitive types are present
        expect(primitiveTypes.has('string')).toBe(true);
        expect(primitiveTypes.has('boolean')).toBe(true);
        expect(primitiveTypes.has('integer')).toBe(true);
        expect(primitiveTypes.has('decimal')).toBe(true);
        expect(primitiveTypes.has('uri')).toBe(true);
        expect(primitiveTypes.has('url')).toBe(true);
        expect(primitiveTypes.has('dateTime')).toBe(true);
    });

    it('should correctly use primitive types in constructZodSchema', () => {
        // Create a simple structure definition with primitive types
        const mockStructureDefinition = {
            resourceType: 'StructureDefinition' as const,
            id: 'MockResource',
            url: 'http://example.org/fhir/StructureDefinition/MockResource',
            name: 'MockResource',
            status: 'active' as const,
            date: '2023-01-01',
            fhirVersion: '4.0.1',
            kind: 'primitive-type' as const,
            abstract: false,
            type: 'MockResource',
            snapshot: {
                element: [
                    {
                        id: '1',
                        path: 'MockResource.stringField',
                        type: [{ code: 'string' }]
                    },
                    {
                        id: '2',
                        path: 'MockResource.booleanField',
                        type: [{ code: 'boolean' }]
                    },
                    {
                        id: '3',
                        path: 'MockResource.valueField[x]',
                        type: [
                            { code: 'string' },
                            { code: 'integer' },
                            { code: 'dateTime' }
                        ]
                    }
                ]
            }
        };

        const primitiveTypes = initializePrimitiveTypeSchemas();
        const schemaPool = new Map<string, z.ZodObject<any, any>>();

        // This should not throw any errors about missing schemas
        const schema = constructZodSchema(mockStructureDefinition, schemaPool, primitiveTypes);

        // Verify the schema has the expected fields
        expect(schema.shape).toHaveProperty('stringField');
        expect(schema.shape).toHaveProperty('booleanField');
        expect(schema.shape).toHaveProperty('valueFieldString');
        expect(schema.shape).toHaveProperty('valueFieldInteger');
        expect(schema.shape).toHaveProperty('valueFieldDateTime');
    });
}); 