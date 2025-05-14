import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { testModules } from '../../src/constructZodSchemaCode';
import { ElementDefinitionSchemaR4 } from '../../src/types/StructureDefinitions/r4';
import { PrimitiveTypeCodeMap } from '../../src/types/primitiveTypeSchemaCodes';

const { constructZodOnChoiceOfType } = testModules;
type ElementDefinition = z.infer<typeof ElementDefinitionSchemaR4>;

describe('constructZodOnChoiceOfType', () => {
    // Helper function to create element definition with minimal required properties
    const createElementDefinition = (path: string, types: ElementDefinition['type'] = []): ElementDefinition => ({
        path,
        type: types
    } as ElementDefinition);

    // Helper function to create a type object
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        const createType = (code: string, extension?: any[]): ElementDefinition['type'][0] => ({
        code,
        extension
    } as ElementDefinition['type'][0]);

    // Helper function to create an extension for FHIR type
    const createFhirTypeExtension = (valueUrl: string) => ({
        url: "http://hl7.org/fhir/StructureDefinition/structuredefinition-fhir-type",
        valueUrl
    });

    test('should handle basic choice field with single option', () => {
        const element = createElementDefinition('Patient.value[x]', [
            createType('string')
        ]);
        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodOnChoiceOfType(element, false, primitiveTypeCodeMap);

        expect(result).toBe('valueString: StringSchema');
    });

    test('should handle choice field with multiple options', () => {
        const element = createElementDefinition('Patient.value[x]', [
            createType('string'),
            createType('boolean'),
            createType('integer')
        ]);
        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodOnChoiceOfType(element, false, primitiveTypeCodeMap);

        expect(result).toBe('valueString: StringSchema,\nvalueBoolean: BooleanSchema,\nvalueInteger: IntegerSchema');
    });

    test('should extract element name correctly from path', () => {
        const element = createElementDefinition('Patient.name.given[x]', [
            createType('string')
        ]);
        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodOnChoiceOfType(element, false, primitiveTypeCodeMap);

        expect(result).toContain('givenString:');
        expect(result).not.toContain('given[x]');
    });

    test('should capitalize first letter of type name', () => {
        const element = createElementDefinition('Patient.value[x]', [
            createType('string'),
            createType('reference')
        ]);
        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodOnChoiceOfType(element, false, primitiveTypeCodeMap);

        expect(result).toContain('valueString:');
        expect(result).toContain('valueReference:');
    });

    test('should use primitiveTypeCodeMap when isPrimitiveStructureDefinition is true', () => {
        const element = createElementDefinition('Patient.value[x]', [
            createType('string'),
            createType('boolean')
        ]);
        const primitiveTypeCodeMap = new Map([
            ['string', 'z.string()'],
            ['boolean', 'z.boolean()']
        ]) as PrimitiveTypeCodeMap;

        const result = constructZodOnChoiceOfType(element, true, primitiveTypeCodeMap);

        expect(result).toContain('valueString: z.string()');
        expect(result).toContain('valueBoolean: z.boolean()');
    });

    test('should fall back to typeNameToZodSchemaName when type not in primitiveTypeCodeMap', () => {
        const element = createElementDefinition('Patient.value[x]', [
            createType('string'),
            createType('customType')
        ]);
        const primitiveTypeCodeMap = new Map([
            ['string', 'z.string()']
        ]) as PrimitiveTypeCodeMap;

        const result = constructZodOnChoiceOfType(element, true, primitiveTypeCodeMap);

        expect(result).toContain('valueString: z.string()');
        expect(result).toContain('valueCustomType: CustomTypeSchema');
    });

    test('should correctly process non-primitive types', () => {
        const element = createElementDefinition('Patient.value[x]', [
            createType('Reference'),
            createType('Observation')
        ]);
        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodOnChoiceOfType(element, false, primitiveTypeCodeMap);

        expect(result).toBe('valueReference: ReferenceSchema,\nvalueObservation: ObservationSchema');
    });


    test('should handle type extensions', () => {
        const element = createElementDefinition('Patient.value[x]', [
            createType('Resource', [createFhirTypeExtension('DomainResource')]),
            createType('string')
        ]);
        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodOnChoiceOfType(element, false, primitiveTypeCodeMap);

        expect(result).toContain('valueDomainResource: DomainResourceSchema');
        expect(result).toContain('valueString: StringSchema');
    });
});
