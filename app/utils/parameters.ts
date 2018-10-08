export interface ParameterDefinition {
    readonly name: string;
    readonly type: string;
    readonly allowedValues?: (number | string | boolean)[]; // number[] | string[] | boolean[];
    readonly defaultValue?: number | string | boolean;
    readonly metadata?: { description?: string };
}

export function parseParameters(json: any): ParameterDefinition[] {
    const parameters = json.parameters;
    const defs: ParameterDefinition[] = [];
    if (parameters) {
        for (const k in parameters) {
            defs.push({ name: k, ...parameters[k] });
        }
    }
    return defs;
}
