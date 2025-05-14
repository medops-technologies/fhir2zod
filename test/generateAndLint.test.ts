import { spawnSync } from 'node:child_process';
import { describe, expect, test } from 'vitest';
describe('generateAndLint', () => {
    test('should generate and pass lint a zod schema', () => {
        spawnSync('npx',['tsx', 'src/index.ts', '-f', 'examples/hl7.fhir.r4.core@4.0.1/hl7.fhir.r4.core-4.0.1.ndjson', '-f', 'examples/jp.core.r4/jp-core.r4-1.1.1-rc.ndjson', '-o', 'test/tmp', '2> /dev/null'])
        const output = spawnSync('npx',['biome', 'lint', 'test/tmp'])
        spawnSync('rm',['-rf', 'test/tmp'])
        
        expect(output.status).toBe(0)

    });
}, {
    timeout: 10000,
});