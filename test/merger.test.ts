import { expect, describe, it } from "vitest";
import { resolveConstraintChain, mergeDefinitionsForTest } from "../src/merger";

describe("mergeDefinitionsForTest", () => {
    const { mergeDefinitions } = mergeDefinitionsForTest;

    it("should not modify the original base and constraint objects", () => {
        // Arrange
        const base = {
            resourceType: "StructureDefinition" as const,
            id: "baseId",
            url: "baseUrl",
            name: "baseName",
            status: "active" as const,
            date: "2023-01-01",
            publisher: "Test Publisher",
            fhirVersion: "4.0.1",
            kind: "resource" as const,
            abstract: false,
            type: "Patient",
            baseDefinition: "http://hl7.org/fhir/StructureDefinition/Resource",
            derivation: "specialization" as const,
            version: "1.0.0",
            snapshot: {
                element: [
                    { path: "Patient", id: "Patient" },
                    { path: "Patient.identifier", id: "Patient.identifier", min: 0 },
                    { path: "Patient.name", id: "Patient.name", min: 0 }
                ]
            }
        };

        const constraint = {
            resourceType: "StructureDefinition" as const,
            id: "constraintId",
            url: "constraintUrl",
            name: "constraintName",
            status: "active" as const,
            date: "2023-01-01",
            publisher: "Test Publisher",
            fhirVersion: "4.0.1",
            kind: "resource" as const,
            abstract: false,
            type: "Patient",
            baseDefinition: "http://hl7.org/fhir/StructureDefinition/Resource",
            derivation: "constraint" as const,
            version: "2.0.0",
            differential: {
                element: [
                    { path: "Patient.identifier", min: 1 }
                ]
            }
        };

        const baseClone = JSON.parse(JSON.stringify(base));
        const constraintClone = JSON.parse(JSON.stringify(constraint));

        // Act
        mergeDefinitions(base, constraint);

        // Assert
        expect(base).toEqual(baseClone);
        expect(constraint).toEqual(constraintClone);
    });

    it("should return an object with all fields matching constraint except snapshot", () => {
        // Arrange
        const base = {
            resourceType: "StructureDefinition" as const,
            id: "baseId",
            url: "baseUrl",
            name: "baseName",
            status: "active" as const,
            date: "2023-01-01",
            publisher: "Test Publisher",
            fhirVersion: "4.0.1",
            kind: "resource" as const,
            abstract: false,
            type: "Patient",
            baseDefinition: "http://hl7.org/fhir/StructureDefinition/Resource",
            derivation: "specialization" as const,
            version: "1.0.0",
            snapshot: {
                element: [
                    { path: "Patient", id: "Patient" },
                    { path: "Patient.identifier", id: "Patient.identifier", min: 0 }
                ]
            }
        };

        const constraint = {
            resourceType: "StructureDefinition" as const,
            id: "constraintId",
            url: "constraintUrl",
            name: "constraintName",
            status: "active" as const,
            date: "2023-01-01",
            publisher: "Test Publisher",
            fhirVersion: "4.0.1",
            kind: "resource" as const,
            abstract: false,
            type: "Patient",
            baseDefinition: "http://hl7.org/fhir/StructureDefinition/Resource",
            derivation: "constraint" as const,
            version: "2.0.0",
            description: "A constraint definition",
            differential: {
                element: []
            }
        };

        // Act
        const result = mergeDefinitions(base, constraint);

        // Assert
        expect(result.id).toEqual(constraint.id);
        expect(result.name).toEqual(constraint.name);
        expect(result.url).toEqual(constraint.url);
        expect(result.version).toEqual(constraint.version);
        expect(result.derivation).toEqual(constraint.derivation);
        expect(result.description).toEqual(constraint.description);
        expect(result.snapshot).toEqual(base.snapshot);
    });

    it("should override base.snapshot elements with constraint.differential elements based on path", () => {
        // Arrange
        const base = {
            resourceType: "StructureDefinition" as const,
            id: "baseId",
            url: "baseUrl",
            name: "baseName",
            status: "active" as const,
            date: "2023-01-01",
            publisher: "Test Publisher",
            fhirVersion: "4.0.1",
            kind: "resource" as const,
            abstract: false,
            type: "Patient",
            baseDefinition: "http://hl7.org/fhir/StructureDefinition/Resource",
            derivation: "specialization" as const,
            version: "1.0.0",
            snapshot: {
                element: [
                    { path: "Patient", id: "Patient" },
                    { path: "Patient.identifier", id: "Patient.identifier", min: 0, max: "*" },
                    { path: "Patient.name", id: "Patient.name", min: 0, max: "*" },
                    { path: "Patient.address", id: "Patient.address", min: 0 }
                ]
            }
        };

        const constraint = {
            resourceType: "StructureDefinition" as const,
            id: "constraintId",
            url: "constraintUrl",
            name: "constraintName",
            status: "active" as const,
            date: "2023-01-01",
            publisher: "Test Publisher",
            fhirVersion: "4.0.1",
            kind: "resource" as const,
            abstract: false,
            type: "Patient",
            baseDefinition: "http://hl7.org/fhir/StructureDefinition/Resource",
            derivation: "constraint" as const,
            version: "2.0.0",
            differential: {
                element: [
                    { path: "Patient.identifier", min: 1, max: "1" },
                    { path: "Patient.name", min: 1 }
                ]
            }
        };

        // Act
        const result = mergeDefinitions(base, constraint);

        // Assert
        expect(result.snapshot).toBeDefined();

        // Find elements by path in the result
        const patientElement = result.snapshot?.element?.find(e => e.path === "Patient");
        const identifierElement = result.snapshot?.element?.find(e => e.path === "Patient.identifier");
        const nameElement = result.snapshot?.element?.find(e => e.path === "Patient.name");
        const addressElement = result.snapshot?.element?.find(e => e.path === "Patient.address");

        // Patient should remain unchanged
        expect(patientElement?.id).toEqual("Patient");

        // Patient.identifier should be overridden
        expect(identifierElement?.id).toEqual("Patient.identifier");
        expect(identifierElement?.min).toEqual(1);
        expect(identifierElement?.max).toEqual("1");

        // Patient.name should be partially overridden
        expect(nameElement?.id).toEqual("Patient.name");
        expect(nameElement?.min).toEqual(1);
        expect(nameElement?.max).toEqual("*"); // max should remain unchanged

        // Patient.address should remain unchanged
        expect(addressElement?.id).toEqual("Patient.address");
        expect(addressElement?.min).toEqual(0);
    });
});