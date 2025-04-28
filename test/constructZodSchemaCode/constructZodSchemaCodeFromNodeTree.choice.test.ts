import { testModules } from '../../src/constructZodSchemaCode';
import { ElementDefinitionSchemaR4 } from '../../src/types/StructureDefinitions/r4';
import { z } from 'zod';
import { describe, expect, test } from 'vitest';
import { PrimitiveTypeCodeMap } from '../../src/types/primitiveTypeSchemaCodes';

const { constructZodSchemaCodeFromNodeTree } = testModules;
type ElementDefinition = z.infer<typeof ElementDefinitionSchemaR4>;

describe('constructZodSchemaCodeFromNodeTree - Choice Type Tests', () => {
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

    test('should handle simple choice type field', () => {
        const element = createElement('Patient.value[x]', [
            createType('string'),
            createType('boolean')
        ]);
        const node = createNode('Patient.value[x]', element);
        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCodeFromNodeTree(node, 'Patient', false, primitiveTypeCodeMap);

        expect(result).toBe('valueString: StringSchema,\nvalueBoolean: BooleanSchema');
    });

    test('should handle choice type with complex types', () => {
        const element = createElement('Patient.value[x]', [
            createType('Reference'),
            createType('CodeableConcept')
        ]);
        const node = createNode('Patient.value[x]', element);
        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCodeFromNodeTree(node, 'Patient', false, primitiveTypeCodeMap);

        expect(result).toBe('valueReference: ReferenceSchema,\nvalueCodeableConcept: CodeableConceptSchema');
    });

    test('should handle choice type with primitive types using primitiveTypeCodeMap', () => {
        const element = createElement('String.value[x]', [
            createType('string'),
            createType('boolean')
        ]);
        const node = createNode('String.value[x]', element);
        const primitiveTypeCodeMap = new Map([
            ['string', 'z.string()'],
            ['boolean', 'z.boolean()']
        ]) as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCodeFromNodeTree(node, 'String', true, primitiveTypeCodeMap);

        expect(result).toBe('valueString: z.string(),\nvalueBoolean: z.boolean()');
    });

    test('should handle required choice type', () => {
        const element = createElement('Patient.value[x]', [
            createType('string'),
            createType('boolean')
        ], 1);
        const node = createNode('Patient.value[x]', element);
        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCodeFromNodeTree(node, 'Patient', false, primitiveTypeCodeMap);

        expect(result).toBe('valueString: StringSchema,\nvalueBoolean: BooleanSchema');
    });

    test('should handle complex nested structure with choice types', () => {
        const patientElement = createElement('Patient');
        const observationElement = createElement('Patient.observation');
        const valueElement = createElement('Patient.observation.value[x]', [
            createType('string'),
            createType('Quantity')
        ]);

        const valueNode = createNode('Patient.observation.value[x]', valueElement);
        const observationNode = createNode('Patient.observation', observationElement, [valueNode]);
        const patientNode = createNode('Patient', patientElement, [observationNode]);

        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCodeFromNodeTree(patientNode, 'Patient', false, primitiveTypeCodeMap);

        expect(result).toBe('z.object({\nObservationSchema: z.object({\nvalueString: StringSchema,\nvalueQuantity: QuantitySchema\n})\n})');
    });
}); 