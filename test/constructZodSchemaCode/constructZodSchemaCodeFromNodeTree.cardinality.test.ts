import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { testModules } from '../../src/constructZodSchemaCode';
import { ElementDefinitionSchemaR4 } from '../../src/types/StructureDefinitions/r4';
import { PrimitiveTypeCodeMap } from '../../src/types/primitiveTypeSchemaCodes';

const { constructZodSchemaCodeFromNodeTree } = testModules;
type ElementDefinition = z.infer<typeof ElementDefinitionSchemaR4>;

describe('constructZodSchemaCodeFromNodeTree - Cardinality Tests', () => {
    // Helper to create an element definition
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        const createElement = (path: string, type?: any[], min = 0, max = "1"): ElementDefinition => ({
        path,
        type,
        min,
        max,
    } as ElementDefinition);

    // Helper to create a type
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        const createType = (code: string, extension?: any[]): ElementDefinition['type'][0] => ({
        code,
        extension
    } as ElementDefinition['type'][0]);

    // Helper to create a node
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        const createNode = (id: string, element: ElementDefinition, children: any[] = []): any => ({
        id,
        element,
        children
    });

    test('should generate optional field when min=0', () => {
        const element = createElement('Patient.name', [createType('string')], 0);
        const node = createNode('Patient.name', element);
        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCodeFromNodeTree(node, 'Patient', 'resource', primitiveTypeCodeMap);

        expect(result).toBe('name: StringSchema.optional()');
    });

    test('should generate required field when min=1', () => {
        const element = createElement('Patient.name', [createType('string')], 1);
        const node = createNode('Patient.name', element);
        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCodeFromNodeTree(node, 'Patient', 'resource', primitiveTypeCodeMap);

        expect(result).toBe('name: StringSchema');
    });

    test('should generate array field when max="*"', () => {
        const element = createElement('Patient.name', [createType('string')], 0, "*");
        const node = createNode('Patient.name', element);
        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCodeFromNodeTree(node, 'Patient', 'resource', primitiveTypeCodeMap);

        expect(result).toBe('name: StringSchema.array().optional()');
    });

    test('should generate required array field when min=1 and max="*"', () => {
        const element = createElement('Patient.name', [createType('string')], 1, "*");
        const node = createNode('Patient.name', element);
        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCodeFromNodeTree(node, 'Patient', 'primitive-type', primitiveTypeCodeMap);

        expect(result).toBe('name: StringSchema.array().min(1)');
    });

    test('should handle cardinality with primitive types', () => {
        const element = createElement('Patient.active', [createType('boolean')], 0, "1");
        const node = createNode('Patient.active', element);
        const primitiveTypeCodeMap = new Map([
            ['boolean', 'z.boolean()']
        ]) as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCodeFromNodeTree(node, 'Patient', 'primitive-type', primitiveTypeCodeMap);

        expect(result).toBe('active: z.boolean().optional()');
    });

    test('should handle cardinality with required primitive types', () => {
        const element = createElement('Patient.active', [createType('boolean')], 1, "1");
        const node = createNode('Patient.active', element);
        const primitiveTypeCodeMap = new Map([
            ['boolean', 'z.boolean()']
        ]) as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCodeFromNodeTree(node, 'Patient', 'primitive-type', primitiveTypeCodeMap);

        expect(result).toBe('active: z.boolean()');
    });

    test('should handle cardinality in complex nested structures', () => {
        const patientElement = createElement('Patient');
        const contactElement = createElement('Patient.contact', undefined, 0, "*");
        const nameElement = createElement('Patient.contact.name', [createType('string')], 1);
        const phoneElement = createElement('Patient.contact.phone', [createType('string')], 0);

        const nameNode = createNode('Patient.contact.name', nameElement);
        const phoneNode = createNode('Patient.contact.phone', phoneElement);
        const contactNode = createNode('Patient.contact', contactElement, [nameNode, phoneNode]);
        const patientNode = createNode('Patient', patientElement, [contactNode]);

        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCodeFromNodeTree(patientNode, 'Patient', 'resource', primitiveTypeCodeMap);

        expect(result).toBe('z.object({\ncontact: z.object({\nname: StringSchema,\nphone: StringSchema.optional()\n}).array().optional()\n})');
    });

    test('should handle array with min and max constraints', () => {
        const element = createElement('Patient.identifier', [createType('string')], 2, "5");
        const node = createNode('Patient.identifier', element);
        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCodeFromNodeTree(node, 'Patient', 'resource', primitiveTypeCodeMap);

        expect(result).toBe('identifier: StringSchema.array().min(2).max(5)');
    });

    test('should handle optional array with max constraint', () => {
        const element = createElement('Patient.identifier', [createType('string')], 0, "5");
        const node = createNode('Patient.identifier', element);
        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCodeFromNodeTree(node, 'Patient', 'resource', primitiveTypeCodeMap);

        expect(result).toBe('identifier: StringSchema.array().max(5).optional()');
    });

    test('should handle required array with min constraint', () => {
        const element = createElement('Patient.identifier', [createType('string')], 2, "*");
        const node = createNode('Patient.identifier', element);
        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCodeFromNodeTree(node, 'Patient', 'resource', primitiveTypeCodeMap);

        expect(result).toBe('identifier: StringSchema.array().min(2)');
    });

    test('should exclude element when min=0 and max=0', () => {
        const element = createElement('Patient.deceased', [createType('boolean')], 0, "0");
        const node = createNode('Patient.deceased', element);
        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCodeFromNodeTree(node, 'Patient', 'resource', primitiveTypeCodeMap);

        expect(result).toBe('// The field \'deceased\' is omitted because its cardinality is 0..0');
    });

    test('should handle complex nested structure with multiple array constraints', () => {
        const patientElement = createElement('Patient');
        const contactElement = createElement('Patient.contact', undefined, 0, "*");
        const nameElement = createElement('Patient.contact.name', [createType('string')], 1);
        const phoneElement = createElement('Patient.contact.phone', [createType('string')], 0, "3");
        const emailElement = createElement('Patient.contact.email', [createType('string')], 0, "5");

        const nameNode = createNode('Patient.contact.name', nameElement);
        const phoneNode = createNode('Patient.contact.phone', phoneElement);
        const emailNode = createNode('Patient.contact.email', emailElement);
        const contactNode = createNode('Patient.contact', contactElement, [nameNode, phoneNode, emailNode]);
        const patientNode = createNode('Patient', patientElement, [contactNode]);

        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCodeFromNodeTree(patientNode, 'Patient', 'resource', primitiveTypeCodeMap);

        expect(result).toBe('z.object({\ncontact: z.object({\nname: StringSchema,\nphone: StringSchema.array().max(3).optional(),\nemail: StringSchema.array().max(5).optional()\n}).array().optional()\n})');
    });

    test('should handle min=0, max=0 element in nested object', () => {
        const extensionElement = createElement('Extension');
        const idElement = createElement('Extension.id', [createType('string')], 0, "1");
        const nestedElement = createElement('Extension.nested');
        const excludedElement = createElement('Extension.nested.excluded', [createType('string')], 0, "0");
        const valueElement = createElement('Extension.nested.value', [createType('string')], 1, "1");

        const excludedNode = createNode('Extension.nested.excluded', excludedElement);
        const valueNode = createNode('Extension.nested.value', valueElement);
        const nestedNode = createNode('Extension.nested', nestedElement, [excludedNode, valueNode]);
        const idNode = createNode('Extension.id', idElement);
        const extensionNode = createNode('Extension', extensionElement, [idNode, nestedNode]);

        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCodeFromNodeTree(extensionNode, 'Extension', 'resource', primitiveTypeCodeMap);

        expect(result).toBe('z.object({\nid: StringSchema.optional(),\nnested: z.object({\n// The field \'excluded\' is omitted because its cardinality is 0..0,\nvalue: StringSchema\n}).optional()\n})');
    });

    test('should handle min=0, max=0 element causing formatting issues', () => {
        const extensionElement = createElement('Extension');
        const idElement = createElement('Extension.id', [createType('string')], 0, "1");
        const excludedElement = createElement('Extension.excluded', [createType('string')], 0, "0");
        const urlElement = createElement('Extension.url', [createType('uri')], 1, "1");
        const valueElement = createElement('Extension.value', [createType('string')], 0, "1");

        const idNode = createNode('Extension.id', idElement);
        const excludedNode = createNode('Extension.excluded', excludedElement);
        const urlNode = createNode('Extension.url', urlElement);
        const valueNode = createNode('Extension.value', valueElement);
        const extensionNode = createNode('Extension', extensionElement, [idNode, excludedNode, urlNode, valueNode]);

        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCodeFromNodeTree(extensionNode, 'Extension', 'resource', primitiveTypeCodeMap);

        expect(result).toBe('z.object({\nid: StringSchema.optional(),\n// The field \'excluded\' is omitted because its cardinality is 0..0,\nurl: UriSchema,\nvalue: StringSchema.optional()\n})');
    });
}); 