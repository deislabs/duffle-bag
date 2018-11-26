export interface ParameterDefinition {
    readonly type: string;
    readonly allowedValues?: (number | string | boolean)[];
    readonly defaultValue?: number | string | boolean;
    readonly minValue?: number;
    readonly maxValue?: number;
    readonly minLength?: number;
    readonly maxLength?: number;
    readonly metadata?: { description?: string };
}

export interface CredentialLocation {
    readonly env?: string;
    readonly path?: string;
}

export interface CredentialSetRef {
    readonly credentialSetName: string;
}

export interface BundleManifest {
    readonly name: string;
    readonly version: string;
    readonly description?: string;
    readonly parameters?: { [key: string]: ParameterDefinition };
    readonly credentials?: { [key: string]: CredentialLocation };
}
