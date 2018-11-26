import { ParameterDefinition, BundleManifest } from "./duffle.objectmodel";

export interface NamedParameterDefinition extends ParameterDefinition {
    readonly name: string;
}

export function parseParameters(json: BundleManifest): NamedParameterDefinition[] {
    const parameters = json.parameters;
    const defs: NamedParameterDefinition[] = [];
    if (parameters) {
        for (const k in parameters) {
            defs.push({ name: k, ...parameters[k] });
        }
    }
    return defs;
}
