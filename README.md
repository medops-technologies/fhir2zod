# FHIR2Zod
A simple converter from HL7-FHIR StructureDefinition to Zod schema.

## Usage
`fhir2zod -f <path/to/the/ndjson> -f <path/to/the/another/ndjson> -o <output/directory>`


## Example
```
cd examples/hl7.fhir.r4.core@4.0.1
fhir2zod -f hl7.fhir.r4.core-4.0.1.ndjson -o output
```

## Test
Run `vitest`.

## Contribution
