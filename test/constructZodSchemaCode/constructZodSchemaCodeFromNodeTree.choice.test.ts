import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { testModules } from '../../src/constructZodSchemaCode';
import { ElementDefinitionSchemaR4 } from '../../src/types/StructureDefinitions/r4';
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

    test('should handle expanded choice type fields', () => {
        const patientElement = createElement('Patient');
        const valueStringElement = createElement('Patient.valueString', [createType('string')], 1);
        const valueBooleanElement = createElement('Patient.valueBoolean', [createType('boolean')], 1);

        const valueStringNode = createNode('Patient.valueString', valueStringElement);
        const valueBooleanNode = createNode('Patient.valueBoolean', valueBooleanElement);
        const patientNode = createNode('Patient', patientElement, [valueStringNode, valueBooleanNode]);

        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCodeFromNodeTree(patientNode, 'Patient', 'resource', primitiveTypeCodeMap);

        expect(result).toBe('z.object({\nvalueString: StringSchema,\nvalueBoolean: BooleanSchema\n})');
    });

    test('should handle concrete paths with custom definitions', () => {
        const patientElement = createElement('Patient');
        const valueStringElement = createElement('Patient.valueString', [createType('string')], 1, "1"); // Required
        const valueBooleanElement = createElement('Patient.valueBoolean', [createType('boolean')], 0, "*"); // Optional, multiple

        const valueStringNode = createNode('Patient.valueString', valueStringElement);
        const valueBooleanNode = createNode('Patient.valueBoolean', valueBooleanElement);
        const patientNode = createNode('Patient', patientElement, [valueStringNode, valueBooleanNode]);

        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCodeFromNodeTree(patientNode, 'Patient', 'resource', primitiveTypeCodeMap);

        expect(result).toBe('z.object({\nvalueString: StringSchema,\nvalueBoolean: BooleanSchema.array().optional()\n})');
    });

    test('should handle nested structures in concrete paths', () => {
        const patientElement = createElement('Patient');
        const valueCodeableConceptElement = createElement('Patient.valueCodeableConcept', [createType('CodeableConcept')]);
        const codingElement = createElement('Patient.valueCodeableConcept.coding', [createType('Coding')]);

        const codingNode = createNode('Patient.valueCodeableConcept.coding', codingElement);
        const valueCodeableConceptNode = createNode('Patient.valueCodeableConcept', valueCodeableConceptElement, [codingNode]);
        const patientNode = createNode('Patient', patientElement, [valueCodeableConceptNode]);

        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCodeFromNodeTree(patientNode, 'Patient', 'resource', primitiveTypeCodeMap);

        expect(result).toBe('z.object({\nvalueCodeableConcept: z.object({\ncoding: CodingSchema.optional()\n}).optional()\n})');
    });

    test('should handle multiple concrete paths with different structures', () => {
        const patientElement = createElement('Patient');
        const valueStringElement = createElement('Patient.valueString', [createType('string')]);
        const valueCodeableConceptElement = createElement('Patient.valueCodeableConcept', [createType('CodeableConcept')]);
        const codingElement = createElement('Patient.valueCodeableConcept.coding', [createType('Coding')]);
        const valueReferenceElement = createElement('Patient.valueReference', [createType('Reference')]);
        const referenceElement = createElement('Patient.valueReference.reference', [createType('string')]);

        const codingNode = createNode('Patient.valueCodeableConcept.coding', codingElement);
        const valueCodeableConceptNode = createNode('Patient.valueCodeableConcept', valueCodeableConceptElement, [codingNode]);
        const referenceNode = createNode('Patient.valueReference.reference', referenceElement);
        const valueReferenceNode = createNode('Patient.valueReference', valueReferenceElement, [referenceNode]);
        const valueStringNode = createNode('Patient.valueString', valueStringElement);
        const patientNode = createNode('Patient', patientElement, [
            valueStringNode,
            valueCodeableConceptNode,
            valueReferenceNode
        ]);

        const primitiveTypeCodeMap = new Map() as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCodeFromNodeTree(patientNode, 'Patient', 'resource', primitiveTypeCodeMap);

        expect(result).toBe('z.object({\nvalueString: StringSchema.optional(),\nvalueCodeableConcept: z.object({\ncoding: CodingSchema.optional()\n}).optional(),\nvalueReference: z.object({\nreference: StringSchema.optional()\n}).optional()\n})');
    });

    test('should handle primitive types with primitiveTypeCodeMap', () => {
        const stringElement = createElement('String');
        const valueStringElement = createElement('String.valueString', [createType('string')], 1);
        const valueBooleanElement = createElement('String.valueBoolean', [createType('boolean')], 1);

        const valueStringNode = createNode('String.valueString', valueStringElement);
        const valueBooleanNode = createNode('String.valueBoolean', valueBooleanElement);
        const stringNode = createNode('String', stringElement, [valueStringNode, valueBooleanNode]);

        const primitiveTypeCodeMap = new Map([
            ['string', 'z.string()'],
            ['boolean', 'z.boolean()']
        ]) as PrimitiveTypeCodeMap;

        const result = constructZodSchemaCodeFromNodeTree(stringNode, 'String', 'primitive-type', primitiveTypeCodeMap);

        expect(result).toBe('z.object({\nvalueString: z.string(),\nvalueBoolean: z.boolean()\n})');
    });
}); 