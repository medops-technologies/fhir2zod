import { describe, it, expect } from "vitest";
import { typeNameToZodSchemaName, TypeNameUrlConverter } from "../src/nameConverter";

describe("typeNameToZodSchemaName", () => {
    it("should convert type name to zod schema name", () => {
        expect(typeNameToZodSchemaName("Patient")).toBe("PatientSchema");
        expect(typeNameToZodSchemaName("234-abc")).toBe("TwoThreeFourAbcSchema");
        expect(typeNameToZodSchemaName("abc-123")).toBe("AbcOneTwoThreeSchema");
        expect(typeNameToZodSchemaName("abc")).toBe("AbcSchema");
    });
});

describe("TypeNameUrlConverter", () => {
    const mockStructureDefinitions = [
        {
            resourceType: "StructureDefinition" as const,
            id: "Patient",
            url: "http://hl7.org/fhir/StructureDefinition/Patient",
            name: "Patient",
            status: "active" as const,
            date: "2022-01-01",
            fhirVersion: "4.0.1",
            kind: "resource" as const,
            abstract: false
        },
        {
            resourceType: "StructureDefinition" as const,
            id: "Observation",
            url: "http://hl7.org/fhir/StructureDefinition/Observation",
            name: "Observation",
            status: "active" as const,
            date: "2022-01-01",
            fhirVersion: "4.0.1",
            kind: "resource" as const,
            abstract: false
        },
        {
            resourceType: "StructureDefinition" as const,
            id: "Condition",
            url: "http://hl7.org/fhir/StructureDefinition/Condition",
            name: "Condition",
            status: "active" as const,
            date: "2022-01-01",
            fhirVersion: "4.0.1",
            kind: "resource" as const,
            abstract: false
        }
    ];

    it("should map type names to URLs correctly", () => {
        const converter = new TypeNameUrlConverter(mockStructureDefinitions);

        expect(converter.typeNameToUrl("Patient")).toBe("http://hl7.org/fhir/StructureDefinition/Patient");
        expect(converter.typeNameToUrl("Observation")).toBe("http://hl7.org/fhir/StructureDefinition/Observation");
        expect(converter.typeNameToUrl("Condition")).toBe("http://hl7.org/fhir/StructureDefinition/Condition");
        expect(converter.typeNameToUrl("Unknown")).toBeUndefined();
    });

    it("should map URLs to type names correctly", () => {
        const converter = new TypeNameUrlConverter(mockStructureDefinitions);

        expect(converter.urlToTypeName("http://hl7.org/fhir/StructureDefinition/Patient")).toBe("Patient");
        expect(converter.urlToTypeName("http://hl7.org/fhir/StructureDefinition/Observation")).toBe("Observation");
        expect(converter.urlToTypeName("http://hl7.org/fhir/StructureDefinition/Condition")).toBe("Condition");
        expect(converter.urlToTypeName("http://unknown/url")).toBeUndefined();
    });

    it("should handle empty structure definitions", () => {
        const converter = new TypeNameUrlConverter([]);

        expect(converter.typeNameToUrl("Patient")).toBeUndefined();
        expect(converter.urlToTypeName("http://hl7.org/fhir/StructureDefinition/Patient")).toBeUndefined();
    });
});
