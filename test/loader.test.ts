import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadNdjsonFile } from '../src/loader';
import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('loadNdjsonFile', () => {
    const testDir = tmpdir();
    const testFilePath = join(testDir, 'test-ndjson.ndjson');

    // Sample NDJSON data
    const testData = [
        { id: 1, name: 'Test 1' },
        { id: 2, name: 'Test 2' },
        { id: 3, name: 'Test 3' }
    ];

    beforeEach(() => {
        // Create test NDJSON file
        const ndjsonContent = testData
            .map(item => JSON.stringify(item))
            .join('\n');

        writeFileSync(testFilePath, ndjsonContent, 'utf8');
    });

    afterEach(() => {
        // Clean up test file
        try {
            unlinkSync(testFilePath);
        } catch (error) {
            // Ignore if file doesn't exist
        }
    });

    it('should load and parse an NDJSON file correctly', async () => {
        const stream = loadNdjsonFile(testFilePath);
        const results: any[] = [];

        // Collect data from the stream
        for await (const data of stream) {
            results.push(data);
        }

        // Verify results
        expect(results).toHaveLength(testData.length);
        expect(results[0]).toEqual(testData[0]);
        expect(results[1]).toEqual(testData[1]);
        expect(results[2]).toEqual(testData[2]);
    });

    it('should handle empty lines in the NDJSON file', async () => {
        // Create NDJSON with empty lines
        const ndjsonWithEmptyLines =
            `${JSON.stringify(testData[0])}\n\n${JSON.stringify(testData[1])}\n\n`;

        writeFileSync(testFilePath, ndjsonWithEmptyLines, 'utf8');

        const stream = loadNdjsonFile(testFilePath);
        const results: any[] = [];

        // Collect data from the stream
        for await (const data of stream) {
            results.push(data);
        }

        // Verify results - should only have 2 items despite empty lines
        expect(results).toHaveLength(2);
        expect(results[0]).toEqual(testData[0]);
        expect(results[1]).toEqual(testData[1]);
    });

    it('should emit an error for invalid JSON lines', async () => {
        // Create NDJSON with an invalid JSON line
        const invalidJson =
            `${JSON.stringify(testData[0])}\n{"broken: "json"}\n${JSON.stringify(testData[2])}`;

        writeFileSync(testFilePath, invalidJson, 'utf8');

        const stream = loadNdjsonFile(testFilePath);

        // Set up promise to check for error event
        const errorPromise = new Promise((resolve) => {
            stream.on('error', (error) => {
                resolve(error);
            });
        });

        // Wait for the error
        const error = await errorPromise as Error;

        // Verify error
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('Failed to parse JSON line');
    });

    it('should handle relative paths correctly', async () => {
        // Create a relative path version of the test file
        const relativeTestPath = './test-relative.ndjson';
        const absoluteTestPath = join(process.cwd(), relativeTestPath);

        // Create test NDJSON file at the relative path
        const ndjsonContent = testData
            .map(item => JSON.stringify(item))
            .join('\n');

        writeFileSync(absoluteTestPath, ndjsonContent, 'utf8');

        try {
            const stream = loadNdjsonFile(relativeTestPath);
            const results: any[] = [];

            // Collect data from the stream
            for await (const data of stream) {
                results.push(data);
            }

            // Verify results
            expect(results).toHaveLength(testData.length);
            expect(results[0]).toEqual(testData[0]);
        } finally {
            // Clean up
            try {
                unlinkSync(absoluteTestPath);
            } catch (error) {
                // Ignore if file doesn't exist
            }
        }
    });
});
