import { testModules } from '../../src/constructZodSchemaCode';
import { ElementDefinitionSchemaR4 } from '../../src/types/StructureDefinitions/r4';
import { z } from 'zod';
import { describe, expect, test } from 'vitest';
import { PrimitiveTypeCodeMap } from '../../src/types/primitiveTypeSchemaCodes';

const { constructImportStatements } = testModules;
type ElementDefinition = z.infer<typeof ElementDefinitionSchemaR4>;

describe('constructImportStatements', () => {
    // Helper function to create element definitions with minimal required properties
    const createElementDefinition = (path: string, types: ElementDefinition['type'] = []): ElementDefinition => ({
        path,
        type: types
    } as ElementDefinition);

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

    test('should generate basic import statements', () => {
        const elementDefinitions = [
            createElementDefinition('Root', [createType('Patient')]),
            createElementDefinition('Root.reference', [createType('Reference')])
        ];
        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructImportStatements(elementDefinitions, 'Root', false, primitiveTypeCodeMap);

        expect(result).toContain('import { z } from \'zod\'');
        expect(result).toContain('import { ReferenceSchema } from \'./Reference\'');
        expect(result).toContain('import { PatientSchema } from \'./Patient\'');
    });

    test('should handle empty element array', () => {
        const elementDefinitions: ElementDefinition[] = [];
        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructImportStatements(elementDefinitions, 'Root', false, primitiveTypeCodeMap);

        expect(result).toEqual('import { z } from \'zod\'\n');
    });

    test('should handle elements without type information', () => {
        const elementDefinitions = [
            createElementDefinition('Root'),
            createElementDefinition('Root.noType')
        ];
        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructImportStatements(elementDefinitions, 'Root', false, primitiveTypeCodeMap);

        expect(result).toEqual('import { z } from \'zod\'\n');
    });

    test('should exclude root type from imports', () => {
        const elementDefinitions = [
            createElementDefinition('Patient', [createType('Patient')]),
            createElementDefinition('Patient.reference', [createType('Reference')]),
            createElementDefinition('Patient.other', [createType('Patient')])
        ];
        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructImportStatements(elementDefinitions, 'Patient', false, primitiveTypeCodeMap);

        expect(result).toContain('import { ReferenceSchema } from \'./Reference\'');
        expect(result).not.toContain('./Patient\'');
    });

    test('should exclude primitive types when isPrimitiveStructureDefinition is true', () => {
        const elementDefinitions = [
            createElementDefinition('Root', [createType('string')]),
            createElementDefinition('Root.code', [createType('code')]),
            createElementDefinition('Root.reference', [createType('Reference')])
        ];
        const primitiveTypeCodeMap = new Map([
            ['string', 'z.string()'],
            ['code', 'z.string()']
        ]) as PrimitiveTypeCodeMap;

        const result = constructImportStatements(elementDefinitions, 'Root', true, primitiveTypeCodeMap);

        expect(result).toContain('import { ReferenceSchema } from \'./Reference\'');
        expect(result).not.toContain('import { StringSchema } from \'./string\'');
        expect(result).not.toContain('import { CodeSchema } from \'./code\'');
    });

    test('should deduplicate types in import statements', () => {
        const elementDefinitions = [
            createElementDefinition('Root', [createType('Patient')]),
            createElementDefinition('Root.reference1', [createType('Reference')]),
            createElementDefinition('Root.reference2', [createType('Reference')]),
            createElementDefinition('Root.reference3', [createType('Reference')])
        ];
        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructImportStatements(elementDefinitions, 'Root', false, primitiveTypeCodeMap);

        const importLines = result.split('\n');
        const referenceImportLines = importLines.filter(line => line.includes('./Reference\''));
        expect(referenceImportLines.length).toBe(1);
    });

    test('should correctly handle multiple different types', () => {
        const elementDefinitions = [
            createElementDefinition('Root', [createType('Root')]),
            createElementDefinition('Root.patient', [createType('Patient')]),
            createElementDefinition('Root.observation', [createType('Observation')]),
            createElementDefinition('Root.practitioner', [createType('Practitioner')])
        ];
        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructImportStatements(elementDefinitions, 'Root', false, primitiveTypeCodeMap);

        expect(result).toContain('import { PatientSchema } from \'./Patient\'');
        expect(result).toContain('import { ObservationSchema } from \'./Observation\'');
        expect(result).toContain('import { PractitionerSchema } from \'./Practitioner\'');
        expect(result).not.toContain('import { RootSchema } from \'./Root\'');
    });

    test('should correctly transform type names to schema names', () => {
        const elementDefinitions = [
            createElementDefinition('Root', [createType('patient-data')]),
            createElementDefinition('Root.other', [createType('complexType')])
        ];
        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructImportStatements(elementDefinitions, 'Root', false, primitiveTypeCodeMap);

        expect(result).toContain('import { PatientDataSchema } from \'./patient-data\'');
        expect(result).toContain('import { ComplexTypeSchema } from \'./complexType\'');
    });

    test('should handle FHIR type extensions', () => {
        const elementDefinitions = [
            createElementDefinition('Root', [
                createType('Resource', [createFhirTypeExtension('DomainResource')])
            ]),
            createElementDefinition('Root.reference', [createType('Reference')])
        ];
        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructImportStatements(elementDefinitions, 'Root', false, primitiveTypeCodeMap);

        expect(result).toContain('import { DomainResourceSchema } from \'./DomainResource\'');
        expect(result).toContain('import { ReferenceSchema } from \'./Reference\'');
        expect(result).not.toContain('import { ResourceSchema } from \'./Resource\'');
    });
});
