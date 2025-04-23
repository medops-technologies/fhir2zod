import { z } from "zod";
import { StructureDefinitionSchemaR4 } from "./types/StructureDefinitions/r4";
import { buildDependencyMap } from "./buildDependencyTree";
import {
    constructZodSchemaCode,
    typeNameToZodSchemaName,
    LocalResourceLoader,
    generateZodSchemasWithDependencies
} from "./constructZodSchemaCode";
import { DependencyMap } from "./types/tree";
import { PrimitiveTypeCodeMap } from "./types/primitiveTypeSchemaCodes";
import * as fs from 'fs';
import * as path from 'path';
import { Writable } from 'stream';

type StructureDefinition = z.infer<typeof StructureDefinitionSchemaR4>;
type StreamFactory = (filePath: string) => Writable;

/**
 * Generate Zod schema code files for each structure definition
 * Uses the same topological sort to ensure dependencies are processed before dependents
 */
export const generateZodSchemaCodeFiles = (
    structureDefinitions: StructureDefinition[],
    outputDir: string,
    primitiveTypeCodeMap: PrimitiveTypeCodeMap,
    streamFactory?: StreamFactory
): void => {
    // Use file system streamFactory if none provided
    const getWriteStream = streamFactory || createFileWriteStream;

    // Process the structure definitions using the stream factory
    processStructureDefinitions(
        structureDefinitions,
        outputDir,
        primitiveTypeCodeMap,
        getWriteStream
    );
};

/**
 * Process structure definitions and generate schema files using provided stream factory
 */
export const processStructureDefinitions = (
    structureDefinitions: StructureDefinition[],
    outputDir: string,
    primitiveTypeCodeMap: PrimitiveTypeCodeMap,
    streamFactory: StreamFactory
): void => {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Use the new dependency resolution and schema generation
    const schemaResults = generateZodSchemasWithDependencies(
        structureDefinitions,
        primitiveTypeCodeMap
    );

    // Build dependency map for the index file ordering
    const dependencyMap = buildDependencyMap(structureDefinitions);
    const processingOrder = topologicalSort(dependencyMap);

    // Create a map of structure definitions by ID for quick lookup
    const structureDefinitionMap = new Map<string, StructureDefinition>();
    structureDefinitions.forEach(def => {
        structureDefinitionMap.set(def.id, def);
    });

    // Write each schema file
    for (const [id, schemaCode] of schemaResults.entries()) {
        try {
            const filePath = path.join(outputDir, `${id}.ts`);
            const writeStream = streamFactory(filePath);
            writeStream.write(schemaCode);
            writeStream.end();
            console.log(`Generated schema code for ${id}`);
        } catch (error) {
            console.error(`Error writing schema file for ${id}:`, error);
        }
    }

    // Generate an index file that exports all schemas
    const indexFilePath = path.join(outputDir, 'index.ts');
    let indexFileContent = '// Generated index file for FHIR Zod schemas\n\n';

    // Use the topological sort ordering for the index file
    for (const id of processingOrder) {
        if (schemaResults.has(id)) {
            const schemaName = typeNameToZodSchemaName(id);
            indexFileContent += `export { ${schemaName} } from './${id}';\n`;
        }
    }

    // Write index file using stream
    const indexWriteStream = streamFactory(indexFilePath);
    indexWriteStream.write(indexFileContent);
    indexWriteStream.end();

    console.log('Generated index file for all schemas');
};

/**
 * Default file stream factory that creates a writable file stream
 */
export const createFileWriteStream = (filePath: string): Writable => {
    return fs.createWriteStream(filePath, { encoding: 'utf8' });
};

/**
 * Performs a topological sort on the dependency map
 * Returns a list of IDs in processing order (dependencies first)
 */
const topologicalSort = (dependencyMap: DependencyMap): string[] => {
    const result: string[] = [];
    const visited = new Set<string>();
    const temp = new Set<string>();  // For cycle detection

    // Create a function for depth-first search
    const visit = (id: string) => {
        // Skip if already processed
        if (visited.has(id)) return;

        // Detect cycles
        if (temp.has(id)) {
            return;
        }

        // Mark as temporarily visited for cycle detection
        temp.add(id);

        // Visit all dependencies first
        const dependencies = dependencyMap[id] || [];
        for (const depId of dependencies) {
            if (dependencyMap[depId]) {  // Only visit if it's a structure definition we have
                visit(depId);
            }
        }

        // Mark as visited and add to result
        temp.delete(id);
        visited.add(id);
        result.push(id);
    };

    // Visit all nodes
    for (const id of Object.keys(dependencyMap)) {
        visit(id);
    }

    return result;
}; 