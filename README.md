# FHIR to Zod Schema Converter

This project converts HL7 FHIR structure definitions into Zod validation schemas.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

3. Install globally (optional):
```bash
npm install -g .
```

## Usage

### CLI Usage

After global installation:

```bash
fhir2zod -f <path-to-fhir-definitions.ndjson> -o <output-directory>
```

Or run directly with:

```bash
npx fhir2zod -f <path-to-fhir-definitions.ndjson> -o <output-directory>
```

### Local Development Usage

Generate Zod schemas from FHIR definitions:

```bash
npm run generate
# Or specify custom input/output
npm run generate -- -f <path-to-fhir-definitions.ndjson> -o <output-directory>
```

### Compile the Project

```bash
npm run build
```

### Run Tests

```bash
npm test
```

## Project Structure

- `src/` - Core source code
  - `types/` - TypeScript type definitions
  - `constructZodSchema.ts` - Creates Zod schemas from structure definitions
  - `constructZodSchemaCode.ts` - Generates TypeScript code for Zod schemas
  - `processStructureDefinitionsInOrder.ts` - Processes definitions in dependency order
- `playground.ts` - Script to generate schemas from FHIR definitions
- `output/` - Generated Zod schema files

## License

MIT

## Problem: Circular References with Primitive Types

When converting FHIR StructureDefinitions to Zod schemas, we encounter circular references between types, particularly with primitive types. This project provides a solution to resolve these circular dependencies.

## Solution

Our solution uses a dependency-ordered approach to handle circular references:

1. **Pre-define primitive types**: Create a map of all FHIR primitive types with their corresponding Zod schemas
2. **Dependency analysis**:
   - Build a dependency map of all FHIR structure definitions
   - Perform a topological sort to determine the optimal processing order
3. **Ordered schema construction**: Process structure definitions in dependency order

## Usage

```typescript
import { processFHIRDefinitions, convertFHIRDefinitionsFromFiles } from './src';

// Option 1: Process from array of definitions
const structureDefinitions = [...]; // Your FHIR StructureDefinition objects
const schemas = processFHIRDefinitions(structureDefinitions);

// Option 2: Load definitions from JSON files in a directory
const schemasFromFiles = await convertFHIRDefinitionsFromFiles('./fhir-definitions');

// Use the schemas
const patientSchema = schemas.get('Patient');
const validationResult = patientSchema.safeParse(patientData);
```

## Key Components

### 1. Primitive Type Schemas (`primitiveTypeSchemas.ts`)

Pre-defines all FHIR primitive types (string, boolean, integer, etc.) as Zod schemas to prevent circular references.

### 2. Dependency Analysis (`buildDependencyTree.ts`)

Analyzes dependencies between FHIR structure definitions to determine the correct processing order.

### 3. Schema Construction (`constructZodSchema.ts`)

Builds Zod schemas from FHIR StructureDefinitions, handling both primitive and complex types.

### 4. Ordered Processing (`processStructureDefinitionsInOrder.ts`)

Processes structure definitions in dependency order using topological sorting to ensure dependencies are available when needed.

## Testing

Run tests with:

```bash
npm test
```

## Example
```bash
# After global installation
cd examples/hl7.fhir.r4.core@4.0.1
fhir2zod -f hl7.fhir.r4.core-4.0.1.ndjson -o output

# Or with npx
cd examples/hl7.fhir.r4.core@4.0.1
npx fhir2zod -f hl7.fhir.r4.core-4.0.1.ndjson -o output
```

## Test
Run `vitest`.

## Contribution