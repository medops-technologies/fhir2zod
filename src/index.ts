#!/usr/bin/env node
import { classifyFHIRDefinition, structureDefinitionRule } from './classifier'
import { loadNdjsonFile } from './loader'
import { generateZodSchemaCodeFiles } from './processStructureDefinitionsInOrder'
import { Options } from './types/options'
import { initializePrimitiveTypeSchemasCodes } from './types/primitiveTypeSchemaCodes'

export const main = async (
    inputFiles: string[],
    outputDir: string,
    options: Options,
) => {
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
    console.info(options)

    generateZodSchemaCodeFiles(
        structureDefinitions,
        outputDir,
        initializePrimitiveTypeSchemasCodes(),
        options,
    )
}

// CLI handling
if (require.main === module) {
    const args = process.argv.slice(2)
    const inputFiles = []
    let outputDir = './output'
    const options: Options = {
        importExtension: false,
    }

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '-f' && i + 1 < args.length) {
            inputFiles.push(args[i + 1])
            i++
        } else if (args[i] === '-o' && i + 1 < args.length) {
            outputDir = args[i + 1]
            i++
        } else if (args[i] === '-E') {
            options.importExtension = true
            i++
        }
    }
    console.info(options)
    if (inputFiles.length === 0) {
        console.error(
            'Input file is required: fhir2zod -f <input-file> -o <output-dir> [-E]',
        )
        process.exit(1)
    }

    main(inputFiles, outputDir, options).catch(err => {
        console.error('Error:', err)
        process.exit(1)
    })
}
