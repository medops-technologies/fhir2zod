#!/usr/bin/env node
import { classifyFHIRDefinition, structureDefinitionRule } from './classifier'
import { loadNdjsonFile } from './loader'
import { generateZodSchemaCodeFiles } from './processStructureDefinitionsInOrder'
import { initializePrimitiveTypeSchemasCodes } from './types/primitiveTypeSchemaCodes'

export const main = async (inputFiles: string[], outputDir: string) => {
    // Load and process multiple input files
    const allStructureDefinitions = []

    for (const inputFile of inputFiles) {
        const fhirDefinitions = loadNdjsonFile(inputFile)
        const classifiedDefinitions = await classifyFHIRDefinition(
            fhirDefinitions,
            {
                structureDefinitions: structureDefinitionRule,
            },
        )

        const fileStructureDefinitions =
            classifiedDefinitions.structureDefinitions || []
        allStructureDefinitions.push(...fileStructureDefinitions)
    }

    const structureDefinitions = allStructureDefinitions

    generateZodSchemaCodeFiles(
        structureDefinitions,
        outputDir,
        initializePrimitiveTypeSchemasCodes(),
    )
}

// CLI handling
if (require.main === module) {
    const args = process.argv.slice(2)
    const inputFiles = []
    let outputDir = './output'

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '-f' && i + 1 < args.length) {
            inputFiles.push(args[i + 1])
            i++
        } else if (args[i] === '-o' && i + 1 < args.length) {
            outputDir = args[i + 1]
            i++
        }
    }

    if (inputFiles.length === 0) {
        console.error(
            'Input file is required: fhir2zod -f <input-file> -o <output-dir>',
        )
        process.exit(1)
    }

    main(inputFiles, outputDir).catch(err => {
        console.error('Error:', err)
        process.exit(1)
    })
}
