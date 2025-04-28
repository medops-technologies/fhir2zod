import { z } from 'zod'

// Basic FHIR utility schemas
const CodingSchema = z.object({
    system: z.string().url().optional(),
    version: z.string().optional(),
    code: z.string().optional(),
    display: z.string().optional(),
    userSelected: z.boolean().optional(),
})

const CodeableConceptSchema = z.object({
    coding: z.array(CodingSchema).optional(),
    text: z.string().optional(),
})

const PeriodSchema = z.object({
    start: z.string().optional(), // dateTime
    end: z.string().optional(), // dateTime
})

const IdentifierSchema = z.object({
    use: z.enum(['usual', 'official', 'temp', 'secondary', 'old']).optional(),
    type: CodeableConceptSchema.optional(),
    system: z.string().url().optional(),
    value: z.string().optional(),
    period: PeriodSchema.optional(),
    assigner: z.object({ display: z.string().optional() }).optional(),
})

const ContactPointSchema = z.object({
    system: z
        .enum(['phone', 'fax', 'email', 'pager', 'url', 'sms', 'other'])
        .optional(),
    value: z.string().optional(),
    use: z.enum(['home', 'work', 'temp', 'old', 'mobile']).optional(),
    rank: z.number().int().optional(),
    period: PeriodSchema.optional(),
})

const ContactDetailSchema = z.object({
    name: z.string().optional(),
    telecom: z.array(ContactPointSchema).optional(),
})

const QuantitySchema = z.object({
    value: z.number().optional(),
    unit: z.string().optional(),
    system: z.string().url().optional(),
    code: z.string().optional(),
})

const RangeSchema = z.object({
    low: QuantitySchema.optional(),
    high: QuantitySchema.optional(),
})

const UsageContextSchema = z.object({
    code: CodingSchema,
    valueCodeableConcept: CodeableConceptSchema.optional(),
    valueQuantity: QuantitySchema.optional(),
    valueRange: RangeSchema.optional(),
})

export const ElementDefinitionSchemaR4 = z.object({
    id: z.string().optional(),
    path: z.string(),
    representation: z.array(z.string()).optional(),
    sliceName: z.string().optional(),
    label: z.string().optional(),
    code: z.array(CodingSchema).optional(),
    slicing: z.any().optional(),
    short: z.string().optional(),
    definition: z.string().optional(),
    comment: z.string().optional(),
    requirements: z.string().optional(),
    alias: z.array(z.string()).optional(),
    min: z.number().int().optional(),
    max: z.string().optional(),
    base: z.any().optional(),
    contentReference: z.string().optional(),
    type: z.any().optional(),
    defaultValue: z.any().optional(),
    meaningWhenMissing: z.string().optional(),
    orderMeaning: z.string().optional(),
    fixed: z.any().optional(),
    pattern: z.any().optional(),
    example: z.array(z.any()).optional(),
    minValue: z.any().optional(),
    maxValue: z.any().optional(),
    maxLength: z.number().int().optional(),
    condition: z.array(z.string()).optional(),
    constraint: z.array(z.any()).optional(),
    mustSupport: z.boolean().optional(),
    isModifier: z.boolean().optional(),
    isSummary: z.boolean().optional(),
    binding: z.any().optional(),
    mapping: z.array(z.any()).optional(),
})

export const StructureDefinitionSchemaR4 = z.object({
    resourceType: z.literal('StructureDefinition'),
    id: z.string(),
    url: z.string().url(),
    identifier: z.array(IdentifierSchema).optional(),
    version: z.string().optional(),
    name: z.string(),
    title: z.string().optional(),
    status: z.enum(['draft', 'active', 'retired', 'unknown']),
    experimental: z.boolean().optional(),
    date: z.string(), // dateTime
    publisher: z.string().optional(),
    contact: z.array(ContactDetailSchema).optional(),
    description: z.string().optional(),
    useContext: z.array(UsageContextSchema).optional(),
    jurisdiction: z.array(CodeableConceptSchema).optional(),
    purpose: z.string().optional(),
    copyright: z.string().optional(),
    keyword: z.array(CodingSchema).optional(),
    fhirVersion: z.string(),
    mapping: z
        .array(
            z.object({
                identity: z.string(),
                uri: z.string().url().optional(),
                name: z.string().optional(),
                comment: z.string().optional(),
            }),
        )
        .optional(),
    kind: z.enum(['primitive-type', 'complex-type', 'resource', 'logical']),
    abstract: z.boolean(),
    context: z
        .array(
            z.object({
                type: z.enum(['fhirpath', 'element', 'extension']),
                expression: z.string(),
            }),
        )
        .optional(),
    contextInvariant: z.array(z.string()).optional(),
    type: z.string().url().optional(),
    baseDefinition: z.string().url().optional(),
    derivation: z.enum(['specialization', 'constraint']).optional(),
    snapshot: z
        .object({ element: z.array(ElementDefinitionSchemaR4) })
        .optional(),
    differential: z
        .object({ element: z.array(ElementDefinitionSchemaR4) })
        .optional(),
})
