import { expect, describe, it } from "vitest";
import { resolveConstraintChain, mergeDefinitionsForTest } from "../src/merger";
import { z } from "zod";
import { StructureDefinitionSchemaR4 } from "../src/types/StructureDefinitions/r4";
import { TypeNameUrlConverter } from "../src/nameConverter";

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

describe("resolveConstraintChain", () => {
    // Base Patient
    const basePatient = {
        resourceType: "StructureDefinition" as const,
        id: "BasePatient",
        url: "http://example.org/fhir/StructureDefinition/BasePatient",
        name: "BasePatient",
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
                { path: "Patient.address", id: "Patient.address", min: 0, max: "*" },
                { path: "Patient.telecom", id: "Patient.telecom", min: 0, max: "*" }
            ]
        }
    };

    // Patient <-- Constraint1
    const constraint1 = {
        resourceType: "StructureDefinition" as const,
        id: "Constraint1Patient",
        url: "http://example.org/fhir/StructureDefinition/Constraint1Patient",
        name: "Constraint1Patient",
        status: "active" as const,
        date: "2023-01-01",
        publisher: "Test Publisher",
        fhirVersion: "4.0.1",
        kind: "resource" as const,
        abstract: false,
        type: "Patient",
        baseDefinition: "http://example.org/fhir/StructureDefinition/BasePatient",
        derivation: "constraint" as const,
        version: "1.0.0",
        differential: {
            element: [
                { path: "Patient.identifier", min: 1 }
            ]
        }
    };

    // Patient <-- Constraint1 <--Constraint2
    const constraint2 = {
        resourceType: "StructureDefinition" as const,
        id: "Constraint2Patient",
        url: "http://example.org/fhir/StructureDefinition/Constraint2Patient",
        name: "Constraint2Patient",
        status: "active" as const,
        date: "2023-01-01",
        publisher: "Test Publisher",
        fhirVersion: "4.0.1",
        kind: "resource" as const,
        abstract: false,
        type: "Patient",
        baseDefinition: "http://example.org/fhir/StructureDefinition/Constraint1Patient",
        derivation: "constraint" as const,
        version: "1.0.0",
        differential: {
            element: [
                { path: "Patient.name", min: 1 },
                { path: "Patient.identifier", max: "1" }
            ]
        }
    };

    // Patient <-- Constraint1 <-- ConstraintOther1
    const constraintOther1 = {
        resourceType: "StructureDefinition" as const,
        id: "ConstraintOtherPatient",
        url: "http://example.org/fhir/StructureDefinition/ConstraintOtherPatient",
        name: "ConstraintOtherPatient",
        status: "active" as const,
        date: "2023-01-01",
        publisher: "Test Publisher",
        fhirVersion: "4.0.1",
        kind: "resource" as const,
        abstract: false,
        type: "Patient",
        baseDefinition: "http://example.org/fhir/StructureDefinition/BasePatient",
        derivation: "constraint" as const,
        version: "1.0.0",
        differential: {
            element: [
                { path: "Patient.address", min: 1 },
                { path: "Patient.telecom", min: 1 }
            ]
        }
    };

    // Observation
    const unrelatedDefinition1 = {
        resourceType: "StructureDefinition" as const,
        id: "Observation",
        url: "http://example.org/fhir/StructureDefinition/Observation",
        name: "Observation",
        status: "active" as const,
        date: "2023-01-01",
        publisher: "Test Publisher",
        fhirVersion: "4.0.1",
        kind: "resource" as const,
        abstract: false,
        type: "Observation",
        baseDefinition: "http://hl7.org/fhir/StructureDefinition/Resource",
        derivation: "specialization" as const,
        version: "1.0.0",
        snapshot: {
            element: [
                { path: "Observation", id: "Observation" },
                { path: "Observation.code", id: "Observation.code", min: 1 }
            ]
        }
    };

    // Medication
    const unrelatedDefinition2 = {
        resourceType: "StructureDefinition" as const,
        id: "Medication",
        url: "http://example.org/fhir/StructureDefinition/Medication",
        name: "Medication",
        status: "active" as const,
        date: "2023-01-01",
        publisher: "Test Publisher",
        fhirVersion: "4.0.1",
        kind: "resource" as const,
        abstract: false,
        type: "Medication",
        baseDefinition: "http://hl7.org/fhir/StructureDefinition/Resource",
        derivation: "specialization" as const,
        version: "1.0.0",
        snapshot: {
            element: [
                { path: "Medication", id: "Medication" },
                { path: "Medication.code", id: "Medication.code", min: 0 }
            ]
        }
    };

    // StructureDefinitionMap for test
    const structureDefinitionMap = new Map();
    structureDefinitionMap.set("BasePatient", basePatient);
    structureDefinitionMap.set("Constraint1Patient", constraint1);
    structureDefinitionMap.set("Constraint2Patient", constraint2);
    structureDefinitionMap.set("ConstraintOtherPatient", constraintOther1);
    structureDefinitionMap.set("Observation", unrelatedDefinition1);
    structureDefinitionMap.set("Medication", unrelatedDefinition2);

    // URL -> TypeName converter for test
    const mockTypeNameUrlConverter = {
        urlToTypeName: (url: string) => {
            const mapping: Record<string, string> = {
                "http://example.org/fhir/StructureDefinition/BasePatient": "BasePatient",
                "http://example.org/fhir/StructureDefinition/Constraint1Patient": "Constraint1Patient",
                "http://example.org/fhir/StructureDefinition/Constraint2Patient": "Constraint2Patient",
                "http://example.org/fhir/StructureDefinition/ConstraintOtherPatient": "ConstraintOtherPatient",
                "http://example.org/fhir/StructureDefinition/Observation": "Observation",
                "http://example.org/fhir/StructureDefinition/Medication": "Medication"
            };
            return mapping[url];
        },
        typeNameToUrl: (typeName: string) => {
            const mapping: Record<string, string> = {
                "BasePatient": "http://example.org/fhir/StructureDefinition/BasePatient",
                "Constraint1Patient": "http://example.org/fhir/StructureDefinition/Constraint1Patient",
                "Constraint2Patient": "http://example.org/fhir/StructureDefinition/Constraint2Patient",
                "ConstraintOtherPatient": "http://example.org/fhir/StructureDefinition/ConstraintOtherPatient",
                "Observation": "http://example.org/fhir/StructureDefinition/Observation",
                "Medication": "http://example.org/fhir/StructureDefinition/Medication"
            };
            return mapping[typeName];
        }
    };

    it("should correctly resolve a constraint chain with multiple levels", () => {
        // Constraint2Patient is the final level of system 1
        const result = resolveConstraintChain(
            constraint2,
            structureDefinitionMap,
            mockTypeNameUrlConverter as TypeNameUrlConverter
        );

        // ID, URL, name are the same as the final constraint (constraint2)
        expect(result.id).toEqual(constraint2.id);
        expect(result.url).toEqual(constraint2.url);
        expect(result.name).toEqual(constraint2.name);

        // Snapshot exists
        expect(result.snapshot).toBeDefined();

        // Elements are correctly combined
        const identifierElement = result.snapshot?.element?.find(e => e.path === "Patient.identifier");
        const nameElement = result.snapshot?.element?.find(e => e.path === "Patient.name");
        const addressElement = result.snapshot?.element?.find(e => e.path === "Patient.address");
        const telecomElement = result.snapshot?.element?.find(e => e.path === "Patient.telecom");

        // Patient.identifier is applied both from constraint1 (min=1) and constraint2 (max="1")
        expect(identifierElement?.min).toEqual(1);
        expect(identifierElement?.max).toEqual("1");

        // Patient.name is applied from constraint2 (min=1)
        expect(nameElement?.min).toEqual(1);
        expect(nameElement?.max).toEqual("*"); // Base value remains unchanged

        // Patient.address and Patient.telecom remain unchanged
        expect(addressElement?.min).toEqual(0);
        expect(telecomElement?.min).toEqual(0);
    });

    it("should correctly resolve a constraint from a different chain (系統2)", () => {
        // ConstraintOtherPatient is from system 2
        const result = resolveConstraintChain(
            constraintOther1,
            structureDefinitionMap,
            mockTypeNameUrlConverter as TypeNameUrlConverter
        );

        // ID, URL, name are the same as the final constraint (constraintOther1)
        expect(result.id).toEqual(constraintOther1.id);
        expect(result.url).toEqual(constraintOther1.url);
        expect(result.name).toEqual(constraintOther1.name);

        // Snapshot exists
        expect(result.snapshot).toBeDefined();

        // Elements are correctly combined
        const identifierElement = result.snapshot?.element?.find(e => e.path === "Patient.identifier");
        const nameElement = result.snapshot?.element?.find(e => e.path === "Patient.name");
        const addressElement = result.snapshot?.element?.find(e => e.path === "Patient.address");
        const telecomElement = result.snapshot?.element?.find(e => e.path === "Patient.telecom");

        // Patient.identifier and Patient.name remain unchanged
        expect(identifierElement?.min).toEqual(0);
        expect(nameElement?.min).toEqual(0);

        // Patient.address and Patient.telecom are applied from constraintOther1
        expect(addressElement?.min).toEqual(1);
        expect(telecomElement?.min).toEqual(1);
    });

    it("should throw an error if base definition URL cannot be converted to a type name", () => {
        const badConverter = {
            urlToTypeName: () => undefined,
            typeNameToUrl: () => undefined
        };

        expect(() => {
            resolveConstraintChain(
                constraint2,
                structureDefinitionMap,
                badConverter as unknown as TypeNameUrlConverter
            );
        }).toThrow("Base definition URL");
    });

    it("should throw an error if base definition is not found in the map", () => {
        const emptyMap = new Map();

        expect(() => {
            resolveConstraintChain(
                constraint2,
                emptyMap,
                mockTypeNameUrlConverter as TypeNameUrlConverter
            );
        }).toThrow("Base definition");
    });
});