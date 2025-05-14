import { unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildDependencyMap } from '../src/buildDependencyTree';
import { classifyFHIRDefinition, structureDefinitionRule } from '../src/classifier';
import { loadNdjsonFile } from '../src/loader';

describe('buildDependencyMap', () => {
    it('should build dependency map', async () => {
        // Mock data
        const mockObjects = [
            { resourceType: 'StructureDefinition', id: 'Patient' },
            { resourceType: 'ValueSet', id: 'gender' },
            { resourceType: 'CodeSystem', id: 'codes' },
            { resourceType: 'StructureDefinition', id: 'Observation' }
        ];

        // Create a readable stream from the mock data
        const mockStream = Readable.from(mockObjects);

        // Define rules for classification
        const rules = {
            structureDefinitions: structureDefinitionRule,
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            valueSets: (obj: any) => obj.resourceType === 'ValueSet',
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            codeSystems: (obj: any) => obj.resourceType === 'CodeSystem'
        };

        // Run the classifier
        const result = await classifyFHIRDefinition(mockStream, rules);

        // Assertions
        expect(result).toHaveProperty('structureDefinitions');
        expect(result).toHaveProperty('valueSets');
        expect(result).toHaveProperty('codeSystems');
        expect(result.structureDefinitions).toContain(mockObjects[0]); // Only the first StructureDefinition
        expect(result.valueSets).toContain(mockObjects[1]);
        expect(result.codeSystems).toContain(mockObjects[2]);
    });

    it('should return empty object when no definitions match rules', async () => {
        // Mock data with no matches
        const mockObjects = [
            { resourceType: 'Unknown', id: 'test1' },
            { resourceType: 'NotMatching', id: 'test2' },
        ];

        // Create a readable stream from the mock data
        const mockStream = Readable.from(mockObjects);

        // Define rules that won't match
        const rules = {
            structureDefinitions: structureDefinitionRule,
        };

        // Run the classifier
        const result = await classifyFHIRDefinition(mockStream, rules);

        // Assertions
        expect(Object.keys(result)).toHaveLength(0);
    });

    it('should handle empty stream', async () => {
        // Create an empty readable stream
        const emptyStream = Readable.from([]);

        // Define some rules
        const rules = {
            structureDefinitions: structureDefinitionRule,
        };

        // Run the classifier
        const result = await classifyFHIRDefinition(emptyStream, rules);

        // Assertions
        expect(Object.keys(result)).toHaveLength(0);
    });
});

describe('buildDependencyMap', () => {
    it('should create an empty map when no structure definitions are provided', () => {
        const result = buildDependencyMap([]);
        expect(result).toEqual({});
    });

    it('should build dependency map from structure definitions with snapshot and differential', () => {
        const mockStructureDefinitions = [
            {
                resourceType: 'StructureDefinition' as const,
                id: 'Patient',
                url: 'http://hl7.org/fhir/StructureDefinition/Patient',
                name: 'Patient',
                status: 'active' as const,
                date: '2023-01-01',
                fhirVersion: '4.0.1',
                kind: 'resource' as const,
                abstract: false,
                type: 'Patient',
                baseDefinition: 'http://hl7.org/fhir/StructureDefinition/DomainResource',
                derivation: 'specialization' as const,
                snapshot: {
                    element: [
                        {
                            path: 'Patient.name',
                            type: [
                                {
                                    code: 'HumanName'
                                }
                            ]
                        }
                    ]
                },
                differential: {
                    element: [
                        {
                            path: 'Patient.name',
                            type: [
                                {
                                    code: 'HumanName'
                                }
                            ]
                        },
                        {
                            path: 'Patient.identifier',
                            type: [
                                {
                                    code: 'Identifier'
                                }
                            ]
                        }
                    ]
                }
            }
        ];

        // 配列初期化を確認
        const dependencyMap: Record<string, string[]> = {};
        dependencyMap.Patient = [];

        const result = buildDependencyMap(mockStructureDefinitions);

        // 実行後はPatientのキーがあること
        expect(Object.keys(result)).toContain('Patient');
        expect(result.Patient).toStrictEqual(['HumanName', 'Identifier']);
        expect(result.Patient.length).toBe(2);
    });

    it('should handle structure definitions with extensions', () => {
        const mockStructureDefinitions = [
            {
                resourceType: 'StructureDefinition' as const,
                id: 'Extension',
                url: 'http://hl7.org/fhir/StructureDefinition/Extension',
                name: 'Extension',
                status: 'active' as const,
                date: '2023-01-01',
                fhirVersion: '4.0.1',
                kind: 'complex-type' as const,
                abstract: false,
                type: 'Extension',
                baseDefinition: 'http://hl7.org/fhir/StructureDefinition/Extension',
                derivation: 'constraint' as const,
                snapshot: {
                    element: [
                        {
                            path: 'Extension.value',
                            type: [
                                {
                                    extension: [
                                        {
                                            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-fhir-type',
                                            valueUrl: 'CodeableConcept'
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                differential: {
                    element: []
                }
            }
        ];

        // dependencyMapは初期化されたオブジェクト
        const dependencyMap: Record<string, string[]> = {};
        dependencyMap.Extension = ['CodeableConcept'];

        const result = buildDependencyMap(mockStructureDefinitions);

        // 実行後はExtensionのキーがあること
        expect(Object.keys(result)).toContain('Extension');
    });

    it('should skip structure definitions without snapshot or differential', () => {
        const mockStructureDefinitions = [
            {
                resourceType: 'StructureDefinition' as const,
                id: 'IncompleteDefinition',
                url: 'http://hl7.org/fhir/StructureDefinition/IncompleteDefinition',
                name: 'IncompleteDefinition',
                status: 'active' as const,
                date: '2023-01-01',
                fhirVersion: '4.0.1',
                kind: 'resource' as const,
                abstract: false,
                type: 'IncompleteDefinition',
                baseDefinition: 'http://hl7.org/fhir/StructureDefinition/DomainResource',
                derivation: 'specialization' as const
                // No snapshot or differential
            }
        ];

        const result = buildDependencyMap(mockStructureDefinitions);
        expect(result).not.toHaveProperty('IncompleteDefinition');
    });
});

describe('structureDefinitionRule', () => {
    it('should return true for StructureDefinition resources', () => {
        const structureDefinition = { resourceType: 'StructureDefinition', id: 'test' };
        expect(structureDefinitionRule(structureDefinition)).toBe(true);
    });

    it('should return false for non-StructureDefinition resources', () => {
        const valueSet = { resourceType: 'ValueSet', id: 'test' };
        const codeSystem = { resourceType: 'CodeSystem', id: 'test' };

        expect(structureDefinitionRule(valueSet)).toBe(false);
        expect(structureDefinitionRule(codeSystem)).toBe(false);
    });

    it('should return false for objects without resourceType', () => {
        const obj = { id: 'test' };
        expect(structureDefinitionRule(obj)).toBe(false);
    });
});
