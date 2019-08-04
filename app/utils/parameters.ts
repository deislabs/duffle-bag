import * as cnab from 'cnabjs';

export interface ParameterDefinition extends cnab.Parameter {
    readonly name: string;
    readonly schema: cnab.Definition;
}

export function parseParameters(json: cnab.Bundle, action: string): ReadonlyArray<ParameterDefinition> {
    const parameters = json.parameters;
    const schemas = json.definitions;
    if (!parameters || !schemas) {
      return [];
    }

    const actionParameters = cnab.Parameters.forAction(json, action);
    const parameterSequence = Array.of(...actionParameters).sort();

    const defs = parameterSequence.map((k) => ({ name: k, schema: schemas[parameters[k].definition], ...parameters[k] }));
    return defs;
}
