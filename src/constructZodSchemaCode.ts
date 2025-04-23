import { initializePrimitiveTypeSchemasCodes, PrimitiveTypeCodeMap } from "./types/primitiveTypeSchemaCodes";
import { StructureDefinitionSchemaR4 } from "./types/StructureDefinitions/r4";
import { z } from "zod";

type StructureDefinition = z.infer<typeof StructureDefinitionSchemaR4>;
type ZodSchema = z.ZodObject<any, any>;

// ResourceLoader interface for loading StructureDefinitions
export interface ResourceLoader {
    loadStructureDefinition(url: string): StructureDefinition | null;
}

// Local file based resource loader implementation
export class LocalResourceLoader implements ResourceLoader {
    private definitionMap: Map<string, StructureDefinition> = new Map();

    constructor(structureDefinitions: StructureDefinition[]) {
        // Index by both URL and ID for faster lookups
        for (const def of structureDefinitions) {
            if (def.url) this.definitionMap.set(def.url, def);
            if (def.id) this.definitionMap.set(def.id, def);
        }
    }

    loadStructureDefinition(urlOrId: string): StructureDefinition | null {
        return this.definitionMap.get(urlOrId) || null;
    }
}

// Merge a base definition with a constraint definition
export const mergeDefinitions = (
    base: StructureDefinition,
    constraint: StructureDefinition
): StructureDefinition => {
    // Create a deep copy of base
    const merged = JSON.parse(JSON.stringify(base)) as StructureDefinition;

    // Override with constraint properties
    merged.id = constraint.id;
    merged.name = constraint.name;
    merged.url = constraint.url;
    merged.version = constraint.version;

    // Keep track of base's elements by path for faster lookups
    const baseElementsByPath = new Map<string, any>();
    if (merged.snapshot?.element) {
        for (const element of merged.snapshot.element) {
            if (element.path) {
                baseElementsByPath.set(element.path, element);
            }
        }
    }

    // Apply constraints from the constraint definition
    if (constraint.snapshot?.element && merged.snapshot?.element) {
        for (const constraintElement of constraint.snapshot.element) {
            if (constraintElement.path) {
                const baseElement = baseElementsByPath.get(constraintElement.path);

                if (baseElement) {
                    // Merge the constraint element over the base element
                    // For any property that's defined in the constraint, use that value
                    // otherwise keep the base value
                    Object.entries(constraintElement).forEach(([key, value]) => {
                        if (value !== undefined) {
                            baseElement[key] = value;
                        }
                    });
                } else {
                    // If element doesn't exist in base, add it
                    merged.snapshot.element.push(constraintElement);
                }
            }
        }
    }

    return merged;
};

// Export the typeNameToZodSchemaName function
export const typeNameToZodSchemaName = (rawTypeName: string) => {
    // ab-cd-ef -> AbCdEfSchema
    // 123-abc -> OneTwoThreeAbcSchema
    // abc -> AbcSchema

    const numberWords = [
        'Zero', 'One', 'Two', 'Three', 'Four',
        'Five', 'Six', 'Seven', 'Eight', 'Nine'
    ];

    let result = '';
    let capitalizeNext = true;

    for (let i = 0; i < rawTypeName.length; i++) {
        const char = rawTypeName[i];

        if (char === '-') {
            capitalizeNext = true;
            continue;
        }

        // Handle numeric characters
        if (/\d/.test(char)) {
            result += numberWords[parseInt(char)];
            capitalizeNext = false;
        } else {
            // Handle alphabetic characters
            result += capitalizeNext ? char.toUpperCase() : char;
            capitalizeNext = false;
        }
    }

    // Ensure first character is capitalized
    if (result.length > 0) {
        result = result.charAt(0).toUpperCase() + result.slice(1);
    }

    return result + 'Schema';
};

export const constructZodSchemaCode = (
    structureDefinition: StructureDefinition,
    primitiveTypeCodeMap: PrimitiveTypeCodeMap,
    resourceLoader?: ResourceLoader
): string => {
    // Handle derivation=constraint if resourceLoader is provided
    if (resourceLoader && structureDefinition.derivation === "constraint" && structureDefinition.baseDefinition) {
        const baseDefinition = resourceLoader.loadStructureDefinition(structureDefinition.baseDefinition);

        if (!baseDefinition) {
            console.warn(
                `Warning: Base definition ${structureDefinition.baseDefinition} not found for ${structureDefinition.id}. ` +
                `Proceeding with partial schema generation.`
            );
        } else {
            // Merge base definition with constraint
            structureDefinition = mergeDefinitions(baseDefinition, structureDefinition);
        }
    }

    let zodSchemaCodeFields = new Map<string, string>(); // key is the field name, value is the field code
    let importStatements = ""
    const importedTypes = new Set<string>();
    const isPrimitiveType = structureDefinition.kind === "primitive-type";
    const snapshot = structureDefinition.snapshot;
    for (const element of snapshot?.element || []) {
        if (element.path) {
            const rawElementName = element.path.split('.').pop() as string
            const types = element.type?.map((t: any) => {
                if (t.extension) {
                    for (const extension of t.extension) {
                        if (extension.url === "http://hl7.org/fhir/StructureDefinition/structuredefinition-fhir-type") {
                            return extension.valueUrl as string;
                        }
                    }
                }
                return t.code as string;
            })
            // Skip the root element which is the resource itself
            if (element.path === structureDefinition.id) {
                continue;
            }

            // Determine if the field is optional based on min value
            const isOptional = element.min === 0;

            // Determine if the field is an array based on max value
            const isArray = element.max === "*";

            if (rawElementName.endsWith('[x]')) {
                const elementNameBase = rawElementName.slice(0, -3)
                for (const type of types) {
                    const capitalizedType = type.charAt(0).toUpperCase() + type.slice(1)
                    const elementName = `${elementNameBase}${capitalizedType}`
                    let elementSchema = "";

                    if (isPrimitiveType) {
                        elementSchema = primitiveTypeCodeMap.get(type) || "z.unknown()";
                    } else {
                        const typeSchemaName = typeNameToZodSchemaName(type);
                        if (!importedTypes.has(type) && type !== structureDefinition.id) {
                            importStatements += `import { ${typeSchemaName} } from "./${type}"\n`
                            importedTypes.add(type);
                        }
                        elementSchema = typeSchemaName;
                    }

                    // Apply array wrapper if needed
                    if (isArray) {
                        elementSchema = `z.array(${elementSchema})`;
                    }

                    // Apply optional modifier if needed
                    if (isOptional) {
                        elementSchema = `${elementSchema}.optional()`;
                    }

                    // Self-referencing type
                    if (type === structureDefinition.id && !isPrimitiveType) {
                        elementSchema = `z.lazy(() => ${elementSchema})`;
                    }

                    zodSchemaCodeFields.set(elementName, elementSchema);
                }
            } else {
                const elementName = rawElementName
                const type = types?.[0]

                if (!type) {
                    // Skip elements without a type
                    continue;
                }

                let elementSchema = "";

                if (isPrimitiveType) {
                    elementSchema = primitiveTypeCodeMap.get(type) || "z.unknown()";
                } else {
                    const typeSchemaName = typeNameToZodSchemaName(type);
                    if (!importedTypes.has(type) && type !== structureDefinition.id) {
                        importStatements += `import { ${typeSchemaName} } from "./${type}"\n`
                        importedTypes.add(type);
                    }
                    elementSchema = typeSchemaName;
                }

                // Apply array wrapper if needed
                if (isArray) {
                    elementSchema = `z.array(${elementSchema})`;
                }

                // Apply optional modifier if needed
                if (isOptional) {
                    elementSchema = `${elementSchema}.optional()`;
                }
                // Self-referencing type
                if (type === structureDefinition.id && !isPrimitiveType) {
                    elementSchema = `z.lazy(() => ${elementSchema})`;
                }

                zodSchemaCodeFields.set(elementName, elementSchema);
            }
        }
    }
    let zodSchemaCode = ""
    zodSchemaCode += `import { z } from "zod";\n`
    zodSchemaCode += importStatements
    zodSchemaCode += `\nexport const ${typeNameToZodSchemaName(structureDefinition.id)} = z.object({\n`
    for (const [key, value] of zodSchemaCodeFields.entries()) {
        zodSchemaCode += `    ${key}: ${value},\n`
    }
    zodSchemaCode += `});\n\n`
    return zodSchemaCode
}

// Generate all Zod schemas with proper dependency resolution
export const generateZodSchemasWithDependencies = (
    structureDefinitions: StructureDefinition[],
    primitiveTypeCodeMap: PrimitiveTypeCodeMap
): Map<string, string> => {
    const resourceLoader = new LocalResourceLoader(structureDefinitions);
    const results = new Map<string, string>();
    const processed = new Set<string>();
    const processing = new Set<string>();

    // Recursively process dependencies
    const processDependencies = (id: string): void => {
        // Skip if already processed
        if (processed.has(id)) return;

        // Detect circular dependencies
        if (processing.has(id)) {
            // Circular dependency detected, will be handled with z.lazy()
            return;
        }

        processing.add(id);
        const definition = resourceLoader.loadStructureDefinition(id);

        if (!definition) {
            //console.warn(`Warning: Definition for ${id} not found`);
            processing.delete(id);
            return;
        }

        // Process base definition dependency first
        if (definition.derivation === "constraint" && definition.baseDefinition) {
            // Extract the id part from the URL
            const baseUrl = definition.baseDefinition;
            const baseId = baseUrl.split('/').pop() || baseUrl;
            processDependencies(baseId);
        }

        // Process type dependencies from snapshot.element
        if (definition.snapshot?.element) {
            for (const element of definition.snapshot.element) {
                if (element.type) {
                    for (const typeRef of element.type) {
                        const typeCode = typeRef.code;
                        if (typeCode && typeCode !== definition.id && !primitiveTypeCodeMap.has(typeCode)) {
                            processDependencies(typeCode);
                        }
                    }
                }
            }
        }

        // Generate schema code
        const schemaCode = constructZodSchemaCode(definition, primitiveTypeCodeMap, resourceLoader);
        results.set(definition.id, schemaCode);

        processed.add(id);
        processing.delete(id);
    };

    // Process all definitions
    for (const def of structureDefinitions) {
        processDependencies(def.id);
    }

    return results;
}