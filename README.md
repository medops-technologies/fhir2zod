# FHIR to Zod Schema Converter (fhir2zod)

A powerful utility that converts HL7 FHIR structure definitions into Zod validation schemas, enabling type-safe validation of FHIR resources in TypeScript/JavaScript applications.

## 🌟 Features

- Converts FHIR StructureDefinitions to Zod schemas
- Handles complex nested structures and references
- Resolves circular dependencies intelligently
- Supports FHIR R4 format
- Provides both CLI and programmatic API
- Generates TypeScript code with proper type annotations

## 📦 Installation(On Preparation)

```bash
# Install globally
npm install -g fhir2zod

# Or install as a dev dependency in your project
npm install --save-dev fhir2zod
```

## 🚀 Quick Start

### Command Line Usage

```bash
# Using global installation
fhir2zod -f path/to/fhir-definitions.ndjson -o output-directory

# Using npx
npx fhir2zod -f path/to/fhir-definitions.ndjson -o output-directory

# Process multiple files
fhir2zod -f file1.ndjson -f file2.ndjson -o output-directory
```

### Programmatic Usage

```typescript
import { main } from 'fhir2zod';

// Process FHIR definitions and generate Zod schemas
await main(['path/to/fhir-definitions.ndjson'], './output');
```

## 🛠️ Development Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/fhir2zod.git
cd fhir2zod

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

## 📊 Examples

### Example 1: Validating a FHIR Patient Resource

After generating schemas with fhir2zod:

```typescript
import { Patient } from './output/schema/Patient';

// Example FHIR Patient resource
const patientData = {
  resourceType: "Patient",
  id: "example",
  name: [
    {
      use: "official",
      family: "Smith",
      given: ["John"]
    }
  ],
  gender: "male",
  birthDate: "1974-12-25"
};

// Validate the patient data
const validationResult = Patient.safeParse(patientData);

if (validationResult.success) {
  console.log("Valid patient data:", validationResult.data);
} else {
  console.error("Invalid patient data:", validationResult.error);
}
```

### Example 2: Creating and Validating a FHIR Observation

```typescript
import { Observation } from './output/schema/Observation';

// Create a new FHIR Observation
const newObservation = {
  resourceType: "Observation",
  status: "final",
  code: {
    coding: [
      {
        system: "http://loinc.org",
        code: "29463-7",
        display: "Body Weight"
      }
    ],
    text: "Body Weight"
  },
  subject: {
    reference: "Patient/example"
  },
  valueQuantity: {
    value: 70.5,
    unit: "kg",
    system: "http://unitsofmeasure.org",
    code: "kg"
  }
};

// Validate the observation data
const validationResult = Observation.safeParse(newObservation);

console.log(validationResult.success 
  ? "Valid observation" 
  : `Invalid observation: ${validationResult.error}`);
```

### Example 3: Custom Schema Enhancement

You can extend the generated schemas with additional validation:

```typescript
import { z } from 'zod';
import { Patient } from './output/schema/Patient';

// Extend the generated Patient schema with custom validation
const EnhancedPatient = Patient.extend({
  name: z.array(z.object({
    family: z.string().min(2).max(50),
    given: z.array(z.string().min(1).max(50))
  })).min(1),
  telecom: z.array(z.object({
    system: z.enum(["phone", "email", "fax", "pager", "sms", "other"]),
    value: z.string().min(5)
  })).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

// Use the enhanced schema
const result = EnhancedPatient.safeParse(patientData);
```

### Example 4: Working with FHIR Profile Constraint Types

FHIR Profiles are constraints applied to base resources. fhir2zod generates schemas for these profiles and provides a way to look them up by URL:

```typescript
import { profileMap } from './output/profileMap';

// Look up a profile schema by its canonical URL
const jpPatientProfileUrl = "http://jpfhir.jp/fhir/core/StructureDefinition/JP_Patient";
const JPPatientProfile = profileMap.get(jpPatientProfileUrl);

if (JPPatientProfile) {
  // Now you can use the JP_Patient profile to validate data
  const patientData = {
    resourceType: "Patient",
    meta: {
      profile: [jpPatientProfileUrl]
    },
    identifier: [
      {
        system: "urn:oid:1.2.392.100495.20.3.51.11234567890",
        value: "00000010"
      }
    ],
    name: [
      {
        extension: [
          {
            url: "http://hl7.org/fhir/StructureDefinition/iso21090-EN-representation",
            valueCode: "IDE"
          }
        ],
        use: "official",
        text: "山田 太郎",
        family: "山田",
        given: ["太郎"]
      },
      {
        extension: [
          {
            url: "http://hl7.org/fhir/StructureDefinition/iso21090-EN-representation",
            valueCode: "SYL"
          }
        ],
        use: "official",
        text: "ヤマダ タロウ",
        family: "ヤマダ",
        given: ["タロウ"]
      }
    ],
    gender: "male",
    birthDate: "1974-12-25"
  };
  
  const validationResult = JPPatientProfile.safeParse(patientData);
  
  if (validationResult.success) {
    console.log("Valid JP Core Patient data");
  } else {
    console.error("Invalid JP Core Patient data:", validationResult.error);
  }
}
```

### Example 5: Accessing Multiple JP Core Profiles

fhir2zod generates a profileMap that allows you to access all available profiles by their canonical URLs:

```typescript
import { profileMap } from './output/profileMap';

// Get JP Core profiles by their canonical URLs
const jpPatientProfile = profileMap.get("http://jpfhir.jp/fhir/core/StructureDefinition/JP_Patient");
const jpOrganizationProfile = profileMap.get("http://jpfhir.jp/fhir/core/StructureDefinition/JP_Organization");
const jpEncounterProfile = profileMap.get("http://jpfhir.jp/fhir/core/StructureDefinition/JP_Encounter");

// Print all available profile URLs
console.log("Available profile URLs:");
profileMap.forEach((_, url) => {
  console.log(url);
});

// Find all JP Core profiles
const jpCoreProfiles = Array.from(profileMap.entries())
  .filter(([url, _]) => url.includes("jpfhir.jp"))
  .map(([url, schema]) => ({ url, schema }));

console.log(`Found ${jpCoreProfiles.length} JP Core profiles`);
```

### Example 6: Programmatically Validating Against JP Core Profiles

You can validate resources against JP Core profiles and check for specific Japanese extensions and patterns:

```typescript
import { profileMap } from './output/profileMap';
import { z } from 'zod';

// Resource to validate
const patientResource = {
  resourceType: "Patient",
  // ... patient data ...
};

// Function to validate against any JP Core profile
function validateJpCore(resource, profileUrl) {
  const profile = profileMap.get(profileUrl);
  if (!profile) {
    return { success: false, error: `Profile not found: ${profileUrl}` };
  }
  
  return profile.safeParse(resource);
}

// Validate a Patient against JP_Patient profile
const jpPatientResult = validateJpCore(
  patientResource, 
  "http://jpfhir.jp/fhir/core/StructureDefinition/JP_Patient"
);

// Get the fully typed data if validation succeeds
if (jpPatientResult.success) {
  // Type-safe access to JP_Patient fields
  const typedPatient = jpPatientResult.data;
  
  // Extract JP-specific extensions
  const nameRepresentations = typedPatient.name?.flatMap(name => 
    name.extension?.filter(ext => 
      ext.url === "http://hl7.org/fhir/StructureDefinition/iso21090-EN-representation"
    ) ?? []
  ) ?? [];
  
  console.log("Name representations:", nameRepresentations);
}
```

## 🔄 How It Works

The conversion process follows these steps:

1. **Parsing** - Loads FHIR definitions from NDJSON files
2. **Classification** - Identifies StructureDefinition resources
3. **Dependency Analysis** - Builds a dependency tree and sorts definitions
4. **Schema Generation** - Creates Zod schemas following the dependency order
5. **Code Generation** - Outputs TypeScript code for the schemas

### Handling Circular References

FHIR resources often contain circular references. fhir2zod resolves this by:

1. Pre-defining primitive types
2. Using lazy evaluation with `z.lazy()`
3. Processing definitions in dependency order

## 📋 Supported FHIR Versions

- FHIR R4 (4.0.1) - Full support
- FHIR JP Core - Experimental support

## 🧪 Testing

Run tests with:

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- HL7 FHIR® standard - https://hl7.org/fhir/
- Zod type validation library - https://github.com/colinhacks/zod

## Project Structure

- `src/` - Core source code
  - `types/` - TypeScript type definitions
  - `constructZodSchema.ts` - Creates Zod schemas from structure definitions
  - `constructZodSchemaCode.ts` - Generates TypeScript code for Zod schemas
  - `processStructureDefinitionsInOrder.ts` - Processes definitions in dependency order
- `playground.ts` - Script to generate schemas from FHIR definitions
- `output/` - Generated Zod schema files

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