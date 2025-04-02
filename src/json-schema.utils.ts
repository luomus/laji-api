export type TypedJSONSchema =
	JSONSchemaObject
	| JSONSchemaArray
	| JSONSchemaNumber
	| JSONSchemaInteger
	| JSONSchemaBoolean
	| JSONSchemaString
	| JSONSchemaEnumOneOf
	| JSONSchemaEnum;

// We use our own typings instead of "json-schema" package because we use only a subset of the schema,
// and so it'll be easier to work with this subset.
export type JSONSchema =
	TypedJSONSchema
	| JSONSchemaRef
	| JSONSchemaOneOf;

type JSONShemaTypeCommon<T, D> = {
	type: T;
	default?: D;
	title?: string;
}

export type JSONSchemaObject = JSONShemaTypeCommon<"object", Record<string, unknown>> & {
	properties?: Record<string, JSONSchema>;
	required?: string[];
}

export function isJSONSchemaObject(schema: JSONSchema): schema is JSONSchemaObject {
	return (schema as any).type === "object";
}

export type JSONSchemaArray = JSONShemaTypeCommon<"array", unknown[]> & {
	items: JSONSchema;
	uniqueItems?: boolean;
}

export function isJSONSchemaArray(jsonSchema: JSONSchema): jsonSchema is JSONSchemaArray {
	return (jsonSchema as any).type === "array";
}


export type JSONSchemaNumber = JSONShemaTypeCommon<"number", number>;

export type JSONSchemaInteger = JSONShemaTypeCommon<"integer", number>;

export type JSONSchemaBoolean = JSONShemaTypeCommon<"boolean", boolean>;

export type JSONSchemaString = JSONShemaTypeCommon<"string", string>;

export type JSONSchemaEnumOneOf = JSONSchemaString & {
	oneOf: {const: string, title: string}[];
}

export function isJSONSchemaEnumOneOf(jsonSchema: JSONSchema): jsonSchema is JSONSchemaEnumOneOf {
	return !!(jsonSchema as any).oneOf;
}

export type JSONSchemaEnum = JSONSchemaString & {
	enum: string[];
}

export function isJSONSchemaEnum(jsonSchema: JSONSchema): jsonSchema is JSONSchemaEnum {
	return !!(jsonSchema as any).enum;
}

export type JSONSchemaRef = { $ref: string };

export function isJSONSchemaRef(jsonSchema: JSONSchema): jsonSchema is JSONSchemaRef {
	return !!(jsonSchema as any).$ref;
}

export type JSONSchemaOneOf = {
	oneOf: JSONSchema[];
};

/** For compatibility with our JSONSchema types. There already exists `OpenAPIObject` but it's not compatible. */
export type OpenAPIDocument = { components: { schemas: Record<string, JSONSchema> } };
