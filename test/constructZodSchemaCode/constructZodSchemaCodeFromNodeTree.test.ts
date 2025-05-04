import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { testModules } from '../../src/constructZodSchemaCode';
import { ElementDefinitionSchemaR4 } from '../../src/types/StructureDefinitions/r4';
import { PrimitiveTypeCodeMap } from '../../src/types/primitiveTypeSchemaCodes';

const { constructZodSchemaCodeFromNodeTree } = testModules;
type ElementDefinition = z.infer<typeof ElementDefinitionSchemaR4>;

describe('constructZodSchemaCodeFromNodeTree - Basic Tests', () => {
    // Helper to create an element definition
    const createElement = (path: string, type?: any[], min = 0, max = "1"): ElementDefinition => ({
        path,
        type,
        min,
        max,
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

    test('should generate code for a leaf node with a simple type', () => {
        const element = createElement('Patient.name', [createType('string')]);
        const node = createNode('Patient.name', element);
        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCodeFromNodeTree(node, 'Patient', false, primitiveTypeCodeMap);

        expect(result).toBe('name: StringSchema.optional()');
    });

    test('should generate code for a required leaf node', () => {
        const element = createElement('Patient.name', [createType('string')], 1);
        const node = createNode('Patient.name', element);
        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCodeFromNodeTree(node, 'Patient', false, primitiveTypeCodeMap);

        expect(result).toBe('name: StringSchema');
    });

    test('should generate code for a parent node with child nodes', () => {
        const parentElement = createElement('Patient');
        const childElement = createElement('Patient.name', [createType('string')]);

        const childNode = createNode('Patient.name', childElement);
        const parentNode = createNode('Patient', parentElement, [childNode]);

        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCodeFromNodeTree(parentNode, 'Patient', false, primitiveTypeCodeMap);

        expect(result).toBe('z.object({\nname: StringSchema.optional()\n})');
    });

    test('should generate code for a primitive type with primitiveTypeCodeMap', () => {
        const element = createElement('Patient.active', [createType('boolean')]);
        const node = createNode('Patient.active', element);
        const primitiveTypeCodeMap = new Map([
            ['boolean', 'z.boolean()']
        ]) as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCodeFromNodeTree(node, 'Patient', true, primitiveTypeCodeMap);

        expect(result).toBe('active: z.boolean().optional()');
    });

    test('should generate code for a parent with multiple children', () => {
        const parentElement = createElement('Patient');
        const nameElement = createElement('Patient.name', [createType('string')]);
        const activeElement = createElement('Patient.active', [createType('boolean')]);

        const nameNode = createNode('Patient.name', nameElement);
        const activeNode = createNode('Patient.active', activeElement);
        const parentNode = createNode('Patient', parentElement, [nameNode, activeNode]);

        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCodeFromNodeTree(parentNode, 'Patient', false, primitiveTypeCodeMap);

        expect(result).toBe('z.object({\nname: StringSchema.optional(),\nactive: BooleanSchema.optional()\n})');
    });

    test('should use schema name for non-root nodes', () => {
        const parentElement = createElement('Patient.contact', [createType('Contact')], 1, "*");
        const nameElement = createElement('Patient.contact.name', [createType('string')]);

        const nameNode = createNode('Patient.contact.name', nameElement);
        const parentNode = createNode('Patient.contact', parentElement, [nameNode]);

        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCodeFromNodeTree(parentNode, 'Patient', false, primitiveTypeCodeMap);

        expect(result).toBe('contact: z.object({\nname: StringSchema.optional()\n}).array()');
    });

    test('should properly handle nested objects', () => {
        const patientElement = createElement('Patient');
        const contactElement = createElement('Patient.contact', [createType('Contact')], 0, "*");
        const nameElement = createElement('Patient.contact.name', [createType('string')]);
        const phoneElement = createElement('Patient.contact.phone', [createType('string')]);

        const nameNode = createNode('Patient.contact.name', nameElement);
        const phoneNode = createNode('Patient.contact.phone', phoneElement);
        const contactNode = createNode('Patient.contact', contactElement, [nameNode, phoneNode]);
        const patientNode = createNode('Patient', patientElement, [contactNode]);

        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCodeFromNodeTree(patientNode, 'Patient', false, primitiveTypeCodeMap);

        expect(result).toBe('z.object({\ncontact: z.object({\nname: StringSchema.optional(),\nphone: StringSchema.optional()\n}).array().optional()\n})');
    });
}); 