import * as cnab from 'cnabjs';
import { byName } from "./sort-orders";

export interface ParameterDefinition extends cnab.Parameter {
    readonly name: string;
    readonly schema: cnab.Definition;
}

export function parseParameters(json: cnab.Bundle): ReadonlyArray<ParameterDefinition> {
    const parameters = json.parameters;
    const schemas = json.definitions;
    if (!parameters || !schemas) {
      return [];
    }
    const defs = Array.of<ParameterDefinition>();
    if (parameters) {
        for (const k in parameters) {
            defs.push({ name: k, schema: schemas[parameters[k].definition], ...parameters[k] });
        }
    }
    defs.sort(byName);
    return defs;
}
