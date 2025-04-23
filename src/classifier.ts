import { Readable } from "node:stream";

export const classifyFHIRDefinition = async (
    definition: Readable,
    rules: Record<string, (obj: any) => boolean>
) => {
    const result: Record<string, any[]> = {};

    for await (const obj of definition) {
        for (const [key, rule] of Object.entries(rules)) {
            if (rule(obj)) {
                result[key] = result[key] || [];
                result[key].push(obj);
                break;
            }
        }
    }
    return result;
}

export const structureDefinitionRule = (obj: any) => {
    return obj.resourceType === 'StructureDefinition';
}