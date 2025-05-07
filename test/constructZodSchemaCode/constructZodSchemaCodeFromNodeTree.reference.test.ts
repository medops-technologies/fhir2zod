import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { testModules } from '../../src/constructZodSchemaCode';
import { ElementDefinitionSchemaR4 } from '../../src/types/StructureDefinitions/r4';
import { PrimitiveTypeCodeMap } from '../../src/types/primitiveTypeSchemaCodes';

const { constructZodSchemaCodeFromNodeTree } = testModules;
type ElementDefinition = z.infer<typeof ElementDefinitionSchemaR4>;

describe('constructZodSchemaCodeFromNodeTree - Reference Tests', () => {
    // Helper to create an element definition
    const createElement = (path: string, options: Partial<ElementDefinition> = {}): ElementDefinition => ({
        path,
        min: options.min ?? 0,
        max: options.max ?? "1",
        type: options.type,
        contentReference: options.contentReference
    } as ElementDefinition);

    // Helper to create a type
    const createType = (code: string, extension?: any[]): ElementDefinition['type'][0] => ({
        code,
        extension
    } as ElementDefinition['type'][0]);

    // Helper to create a node
    const createNode = (id: string, element: ElementDefinition, children: any[] = []): any => ({
        id,
        element,
        children
    });

    test('should handle contentReference', () => {
        const element = createElement('Patient.address', {
            contentReference: '#Patient.contact'
        });
        const node = createNode('Patient.address', element);
        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCodeFromNodeTree(node, 'Patient', 'resource', primitiveTypeCodeMap);

        expect(result).toBe('address: z.lazy(() => PatientSchema.shape.ContactSchema)');
    });

    test('should throw error on invalid contentReference', () => {
        const element = createElement('Patient.address', {
            contentReference: '#SomeOther.resource'
        });
        const node = createNode('Patient.address', element);
        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        expect(() => {
            constructZodSchemaCodeFromNodeTree(node, 'Patient', 'resource', primitiveTypeCodeMap);
        }).toThrow(/contentReference.*not intended/);
    });

    test('should handle self-reference using z.lazy()', () => {
        const element = createElement('Patient.link', {
            type: [createType('Patient')]
        });
        const node = createNode('Patient.link', element);
        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCodeFromNodeTree(node, 'Patient', 'resource', primitiveTypeCodeMap);

        expect(result).toBe('link: z.lazy(() => PatientSchema.optional())');
    });

    test('should handle contentReference with primitive type', () => {
        const element = createElement('String.extension', {
            contentReference: '#String.value'
        });
        const node = createNode('String.extension', element);
        const primitiveTypeCodeMap = new Map([
            ['string', 'z.string()'],
            ['value', 'z.string().nullable()']
        ]) as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCodeFromNodeTree(node, 'String', 'primitive-type', primitiveTypeCodeMap);

        expect(result).toBe('extension: z.lazy(() => StringSchema.shape.z.string().nullable())');
    });

    test('should handle contentReference with multiple segments', () => {
        const element = createElement('Patient.address', {
            contentReference: '#Patient.contact.telecom'
        });
        const node = createNode('Patient.address', element);
        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCodeFromNodeTree(node, 'Patient', 'resource', primitiveTypeCodeMap);

        expect(result).toBe('address: z.lazy(() => PatientSchema.shape.ContactSchema.shape.TelecomSchema)');
    });

    test('should handle contentReference when required', () => {
        const element = createElement('Patient.address', {
            contentReference: '#Patient.contact',
            min: 1
        });
        const node = createNode('Patient.address', element);
        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCodeFromNodeTree(node, 'Patient', 'resource', primitiveTypeCodeMap);

        expect(result).toBe('address: z.lazy(() => PatientSchema.shape.ContactSchema)');
    });
}); 