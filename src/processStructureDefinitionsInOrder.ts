import * as fs from 'node:fs'
import * as path from 'node:path'
import { Writable } from 'node:stream'
import { z } from 'zod'
import { buildDependencyMap } from './buildDependencyTree'
import { generateZodSchemasWithDependencies } from './constructZodSchemaCode'
import { StructureDefinitionSchemaR4 } from './types/StructureDefinitions/r4'
import { Options } from './types/options'
import { PrimitiveTypeCodeMap } from './types/primitiveTypeSchemaCodes'
import { DependencyMap } from './types/tree'
import { TypeNameUrlConverter, typeNameToZodSchemaName } from './utils'

type StructureDefinition = z.infer<typeof StructureDefinitionSchemaR4>
type StreamFactory = (filePath: string) => Writable

/**
 * Generate Zod schema code files for each structure definition
 * Uses the same topological sort to ensure dependencies are processed before dependents
 */
export const generateZodSchemaCodeFiles = (
    structureDefinitions: StructureDefinition[],
    outputDir: string,
    primitiveTypeCodeMap: PrimitiveTypeCodeMap,
    options: Options,
    streamFactory?: StreamFactory,
): void => {
    // Use file system streamFactory if none provided
    const getWriteStream = streamFactory || createFileWriteStream

    // Process the structure definitions using the stream factory
    processStructureDefinitions(
        structureDefinitions,
        outputDir,
        primitiveTypeCodeMap,
        getWriteStream,
        options,
    )
}

/**
 * Process structure definitions and generate schema files using provided stream factory
 */
export const processStructureDefinitions = (
    structureDefinitions: StructureDefinition[],
    outputDir: string,
    primitiveTypeCodeMap: PrimitiveTypeCodeMap,
    streamFactory: StreamFactory,
    options: Options,
): void => {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
    }

    // Create schema subdirectory
    const schemaDir = path.join(outputDir, 'schema')
    if (!fs.existsSync(schemaDir)) {
        fs.mkdirSync(schemaDir, { recursive: true })
    }

    // Build dependency map for the index file ordering
    const dependencyMap = buildDependencyMap(structureDefinitions)
    const processingOrder = topologicalSort(dependencyMap)
    const typeNameUrlConverter = new TypeNameUrlConverter(structureDefinitions)
    // Create a map of structure definitions by ID for quick lookup
    const structureDefinitionMap = new Map<string, StructureDefinition>()
    for (const def of structureDefinitions) {
        structureDefinitionMap.set(def.id, def)
    }

    const sortedStructureDefinitions = processingOrder.map(id => {
        const structureDefinition = structureDefinitionMap.get(id)
        if (!structureDefinition) {
            throw new Error(`StructureDefinition ${id} not found`)
        }
        return structureDefinition
    })

    // Use the new dependency resolution and schema generation
    const schemaResults = generateZodSchemasWithDependencies(
        sortedStructureDefinitions,
        primitiveTypeCodeMap,
        options,
    )

    // For the profileMap - store constraint profiles mapping
    const profileMap = new Map<string, string>()

    // Write each schema file
    for (const [id, schemaCode] of schemaResults.entries()) {
        try {
            const filePath = path.join(schemaDir, `${id}.js`)
            const writeStream = streamFactory(filePath)
            writeStream.write(schemaCode)
            writeStream.end()

            // Get structure definition to check if it's a constraint
            const structureDefinition = structureDefinitionMap.get(id)
            if (
                structureDefinition &&
                structureDefinition.derivation === 'constraint'
            ) {
                // Store the URL and schema name for the profile map
                const baseDefinitionId =
                    structureDefinition.snapshot?.element?.[0]?.path.split(
                        '.',
                    )[0] ||
                    structureDefinition.differential?.element?.[0]?.path.split(
                        '.',
                    )[0]
                const schemaName = `${typeNameToZodSchemaName(`${baseDefinitionId}-${id}`)}`
                profileMap.set(structureDefinition.url, schemaName)
            }

            console.info(`Generated schema code for ${id}`)
        } catch (error) {
            console.error(`Error writing schema file for ${id}:`, error)
        }
    }

    // Generate an index file that exports all schemas
    const indexFilePath = path.join(
        outputDir,
        `index${options.importExtension ? '.js' : '.ts'}`,
    )
    let indexFileContent = '// Generated index file for FHIR Zod schemas\n\n'

    // Use the topological sort ordering for the index file
    const importExtension = options.importExtension ? '.js' : ''
    for (const id of processingOrder) {
        if (schemaResults.has(id)) {
            const structureDefinition = structureDefinitionMap.get(id)
            if (!structureDefinition) {
                throw new Error(`StructureDefinition ${id} not found`)
            }
            const isConstraint = structureDefinition.derivation === 'constraint'
            let schemaName = ''
            if (isConstraint) {
                const snapshotFirstElement =
                    structureDefinition.snapshot?.element?.[0]
                const differentialFirstElement =
                    structureDefinition.differential?.element?.[0]
                if (!(snapshotFirstElement || differentialFirstElement)) {
                    throw new Error(
                        `Snapshot first element or differential first element not found for ${id}`,
                    )
                }
                const baseDefinitionId =
                    snapshotFirstElement?.path.split('.')[0] ||
                    differentialFirstElement?.path.split('.')[0]
                schemaName = `${typeNameToZodSchemaName(`${baseDefinitionId}-${id}`)}`
            } else {
                schemaName = typeNameToZodSchemaName(id)
            }
            indexFileContent += `export { ${schemaName} } from './schema/${id}${importExtension}';\n`
        }
    }

    // Write index file using stream
    const indexWriteStream = streamFactory(indexFilePath)
    indexWriteStream.write(indexFileContent)
    indexWriteStream.end()

    console.info('Generated index file for all schemas')

    // Generate profileMap.ts file that maps URLs to schemas for constraint profiles
    const profileMapFilePath = path.join(
        outputDir,
        `profileMap${options.importExtension ? '.js' : '.ts'}`,
    )
    let profileMapContent =
        '// Generated profile map for constraint profiles\n\n'
    profileMapContent += 'import { z } from "zod";\n'

    // Import all constraint schemas
    for (const [url, schemaName] of profileMap.entries()) {
        const id = typeNameUrlConverter.urlToTypeName(url)
        if (!id) {
            throw new Error(`ID not found for ${url}`)
        }
        profileMapContent += `import { ${schemaName} } from './schema/${id}${importExtension}';\n`
    }

    profileMapContent += '\n// Map of profile URLs to their schemas\n'
    profileMapContent +=
        'export const profileMap = new Map<string, z.ZodType>(['

    // Add entries to the map
    for (const [url, schemaName] of profileMap.entries()) {
        profileMapContent += `\n  ["${url}", ${schemaName}],`
    }

    profileMapContent += '\n]);\n'

    // Write profileMap file using stream
    const profileMapWriteStream = streamFactory(profileMapFilePath)
    profileMapWriteStream.write(profileMapContent)
    profileMapWriteStream.end()

    console.info('Generated profile map for constraint profiles')
}

/**
 * Default file stream factory that creates a writable file stream
 */
export const createFileWriteStream = (filePath: string): Writable => {
    return fs.createWriteStream(filePath, { encoding: 'utf8' })
}

/**
 * Performs a topological sort on the dependency map
 * Returns a list of IDs in processing order (dependencies first)
 */
const topologicalSort = (dependencyMap: DependencyMap): string[] => {
    const result: string[] = []
    const visited = new Set<string>()
    const temp = new Set<string>() // For cycle detection

    // Create a function for depth-first search
    const visit = (id: string) => {
        // Skip if already processed
        if (visited.has(id)) return

        // Detect cycles
        if (temp.has(id)) {
            return
        }

        // Mark as temporarily visited for cycle detection
        temp.add(id)

        // Visit all dependencies first
        const dependencies = dependencyMap[id] || []
        for (const depId of dependencies) {
            if (dependencyMap[depId]) {
                // Only visit if it's a structure definition we have
                visit(depId)
            }
        }

        // Mark as visited and add to result
        temp.delete(id)
        visited.add(id)
        result.push(id)
    }

    // Visit all nodes
    for (const id of Object.keys(dependencyMap)) {
        visit(id)
    }

    return result
}
