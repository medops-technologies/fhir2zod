import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadNdjsonFile } from '../src/loader';
import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { classifyFHIRDefinition, structureDefinitionRule } from '../src/classifier';
import { Readable } from 'node:stream';

describe('classifyFHIRDefinition', () => {
    it('should classify FHIR definitions based on rules', async () => {
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
            valueSets: (obj: any) => obj.resourceType === 'ValueSet',
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
