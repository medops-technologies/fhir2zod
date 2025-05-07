# FHIR to Zod Schema Converter (fhir2zod)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/medops-technologies/fhir2zod/run-tests.yaml?label=test)

A powerful utility that converts HL7 FHIR structure definitions into Zod validation schemas, enabling type-safe validation of FHIR resources in TypeScript/JavaScript applications.

## 🌟 Features

- Converts FHIR StructureDefinitions to Zod schemas
- Handles complex nested structures and references
- Resolves circular dependencies intelligently
- Currently supports FHIR R4 format
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

# Add .js extension on import statements
fhir2zod -f file1.ndjson -f file2.ndjson -o output-directory -E
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
// import path is depends on the command you executed.
import { PatientSchema } from './output/schema/Patient';

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
const validationResult = PatientSchema.safeParse(patientData);

if (validationResult.success) {
  console.log("Valid patient data:", validationResult.data);
} else {
  console.error("Invalid patient data:", validationResult.error);
}
```

### Example 2: Creating and Validating a FHIR Observation

```typescript
import { ObservationSchema } from './output/schema/Observation';

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
const validationResult = ObservationSchema.safeParse(newObservation);

console.log(validationResult.success 
  ? "Valid observation" 
  : `Invalid observation: ${validationResult.error}`);
```


### Example 3: Working with FHIR Profile Constraint Types

FHIR Profiles are constraints applied to base resources. fhir2zod generates schemas for these profiles and provides a way to look them up by URL:

```typescript
import { profileMap } from './output/profileMap';

// Look up a profile schema by its canonical URL
// Usually, the profile url is in the metadata of the Resources.
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

## Schema Name Convention

FHIR2Zod follows these naming conventions for generated Zod schemas:

### Base Resource and Type Schemas

For standard FHIR resources and data types:
- PascalCase naming with `Schema` suffix
- Example: `Patient` becomes `PatientSchema`
- Numbers are converted to words: `123-abc` becomes `OneTwoThreeAbcSchema`
- Hyphens trigger capitalization: `ab-cd-ef` becomes `AbCdEfSchema`

### Profile Schemas (Constraint Types)

For FHIR profiles (constrained resources):
- Format: `{BaseType}{ProfileId}Schema`  
- Example: A JP Core Patient profile with ID `jp-atient` becomes `PatientJpPatientSchema`
- These schemas implement additional validations on top of the base resource schemas

### Accessing Generated Schemas

Import generated schemas from their output location:
```typescript
// Base resource schemas
import { PatientSchema } from './output/schema/Patient';

// Profile/constrained schemas can be accessed directly or via the profileMap
import { PatientJpPatientSchema } from './output/schema/JP_Patient';
import { profileMap } from './output/profileMap';
const jpPatientSchema = profileMap.get('http://jpfhir.jp/fhir/core/StructureDefinition/JP_Patient');
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
