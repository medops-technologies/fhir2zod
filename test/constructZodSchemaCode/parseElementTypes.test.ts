import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { testModules } from '../../src/constructZodSchemaCode';
import { ElementDefinitionSchemaR4 } from '../../src/types/StructureDefinitions/r4';

const { parseElementTypes } = testModules;
type ElementDefinition = z.infer<typeof ElementDefinitionSchemaR4>;

describe('parseElementTypes', () => {
    // Helper function to create a type object
    const createType = (code: string, extension?: any[]): ElementDefinition['type'][0] => ({
        code,
        extension
    } as ElementDefinition['type'][0]);

    // Helper function to create an extension for FHIR type
    const createFhirTypeExtension = (valueUrl: string) => ({
        url: "http://hl7.org/fhir/StructureDefinition/structuredefinition-fhir-type",
        valueUrl
    });

    // Helper function to create a non-FHIR extension
    const createOtherExtension = (url: string, valueString: string) => ({
        url,
        valueString
    });

    test('should extract basic type codes', () => {
        const types = [
            createType('string'),
            createType('integer')
        ];

        const result = parseElementTypes(types);

        expect(result).toEqual(['string', 'integer']);
    });

    test('should handle undefined or null elementTypes', () => {
        expect(parseElementTypes(undefined)).toEqual([]);
        expect(parseElementTypes(null)).toEqual([]);
    });

    test('should handle empty array', () => {
        expect(parseElementTypes([])).toEqual([]);
    });

    test('should extract multiple types', () => {
        const types = [
            createType('string'),
            createType('boolean'),
            createType('integer'),
            createType('decimal')
        ];

        const result = parseElementTypes(types);

        expect(result).toEqual(['string', 'boolean', 'integer', 'decimal']);
    });

    test('should extract type from FHIR extension', () => {
        const types = [
            createType('Resource', [createFhirTypeExtension('DomainResource')])
        ];

        const result = parseElementTypes(types);

        expect(result).toEqual(['DomainResource']);
    });

    test('should handle multiple extensions but only use FHIR type extension', () => {
        const types = [
            createType('Resource', [
                createOtherExtension('http://example.org/some-other-extension', 'SomeValue'),
                createFhirTypeExtension('DomainResource'),
                createOtherExtension('http://example.org/another-extension', 'AnotherValue')
            ])
        ];

        const result = parseElementTypes(types);

        expect(result).toEqual(['DomainResource']);
    });

    test('should handle mix of extension types and normal types', () => {
        const types = [
            createType('Resource', [createFhirTypeExtension('DomainResource')]),
            createType('string'),
            createType('Element', [createFhirTypeExtension('BackboneElement')])
        ];

        const result = parseElementTypes(types);

        expect(result).toEqual(['DomainResource', 'string', 'BackboneElement']);
    });

    test('should use code if no FHIR type extension is present', () => {
        const types = [
            createType('Resource', [
                createOtherExtension('http://example.org/some-other-extension', 'SomeValue')
            ]),
            createType('string')
        ];

        const result = parseElementTypes(types);

        expect(result).toEqual(['Resource', 'string']);
    });
    test('should handle primitive types that do not include a FHIR type extension', () => {
        const types = [
            createType('http://hl7.org/fhirpath/System.String')
        ];

        const result = parseElementTypes(types);

        expect(result).toEqual(['string']);
    });
});
