import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { testModules } from '../../src/constructZodSchemaCode';
import { ElementDefinitionSchemaR4, StructureDefinitionSchemaR4 } from '../../src/types/StructureDefinitions/r4';
import { PrimitiveTypeCodeMap } from '../../src/types/primitiveTypeSchemaCodes';

const { constructZodSchemaCode } = testModules;
type ElementDefinition = z.infer<typeof ElementDefinitionSchemaR4>;
type StructureDefinition = z.infer<typeof StructureDefinitionSchemaR4>;

describe('constructZodSchemaCode', () => {
    // Helper to create a basic structure definition
    const createStructureDefinition = (
        options: Partial<StructureDefinition> = {}
    ): StructureDefinition => ({
        resourceType: 'StructureDefinition',
        id: options.id || 'TestResource',
        url: options.url || 'http://example.org/fhir/StructureDefinition/TestResource',
        name: options.name || 'TestResource',
        status: options.status || 'active',
        kind: options.kind || 'resource',
        abstract: options.abstract || false,
        type: options.type || 'TestResource',
        baseDefinition: options.baseDefinition || 'http://hl7.org/fhir/StructureDefinition/DomainResource',
        derivation: options.derivation || 'specialization',
        snapshot: options.snapshot || {
            element: []
        }
    } as StructureDefinition);

    // Helper to create an element definition
    const createElement = (path: string, options: Partial<ElementDefinition> = {}): ElementDefinition => ({
        path,
        min: options.min ?? 0,
        max: options.max ?? "1",
        type: options.type,
        id: options.id || path
    } as ElementDefinition);

    // Helper to create a type
    const createType = (code: string, extension?: any[]): ElementDefinition['type'][0] => ({
        code,
        extension
    } as ElementDefinition['type'][0]);

    test('should generate code for a basic resource', () => {
        const elements = [
            createElement('TestResource'),
            createElement('TestResource.id', { type: [createType('string')] }),
            createElement('TestResource.active', { type: [createType('boolean')] })
        ];

        const structureDefinition = createStructureDefinition({
            snapshot: { element: elements }
        });

        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCode(structureDefinition, primitiveTypeCodeMap);

        expect(result).toContain('import { z } from \'zod\'');
        expect(result).toContain('export const TestResourceSchema =');
        expect(result).toContain('z.object({');
        expect(result).toContain('id: StringSchema.optional()');
        expect(result).toContain('active: BooleanSchema.optional()');
    });

    test('should generate code for a primitive type', () => {
        const elements = [
            createElement('string'),
            createElement('string.id', { type: [createType('string')] }),
            createElement('string.value', { type: [createType('string')] })
        ];

        const structureDefinition = createStructureDefinition({
            id: 'string',
            type: 'string',
            kind: 'primitive-type',
            snapshot: { element: elements }
        });

        const primitiveTypeCodeMap = new Map([
            ['string', 'z.string()']
        ]) as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCode(structureDefinition, primitiveTypeCodeMap);

        expect(result).toContain('import { z } from \'zod\'');
        expect(result).toContain('export const StringSchema =');
        expect(result).toContain('z.object({');
        expect(result).toContain('id: z.string().optional()');
        expect(result).toContain('value: z.string().optional()');
    });

    test('should generate code for a constraint structure definition', () => {
        const elements = [
            createElement('Patient'),
            createElement('Patient.name', { type: [createType('string')], min: 1 }),
            createElement('Patient.active', { type: [createType('boolean')] })
        ];

        const structureDefinition = createStructureDefinition({
            id: 'RequiredNamePatient',
            type: 'Patient',
            derivation: 'constraint',
            snapshot: { element: elements }
        });

        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCode(structureDefinition, primitiveTypeCodeMap);

        expect(result).toContain('import { z } from \'zod\'');
        expect(result).toContain('import { PatientSchema } from \'./Patient\'');
        expect(result).toContain('export const PatientRequiredNamePatientSchema =');
        expect(result).toContain('z.object({');
        expect(result).toContain('name: StringSchema');
        expect(result).toContain('active: BooleanSchema.optional()');
    });

    test('should handle a structure definition with nested elements', () => {
        const elements = [
            createElement('TestResource'),
            createElement('TestResource.contact'),
            createElement('TestResource.contact.name', { type: [createType('string')] }),
            createElement('TestResource.contact.phone', { type: [createType('string')] })
        ];

        const structureDefinition = createStructureDefinition({
            snapshot: { element: elements }
        });

        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCode(structureDefinition, primitiveTypeCodeMap);

        expect(result).toContain('export const TestResourceSchema =');
        expect(result).toContain('z.object({');
        expect(result).toContain('contact: z.object({');
        expect(result).toContain('name: StringSchema.optional()');
        expect(result).toContain('phone: StringSchema.optional()');
    });

    test('should return empty string on error', () => {
        // Create an invalid structure definition that will cause an error
        const structureDefinition = createStructureDefinition({
            snapshot: undefined // This will cause an error
        });

        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCode(structureDefinition, primitiveTypeCodeMap);

        expect(result).toBe('');
    });
}); 