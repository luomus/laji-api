import { defineConfig } from "@graphql-mesh/compose-cli";
import { loadOpenAPISubgraph } from "@omnigraph/openapi";
import "dotenv";
import { GraphQLSchema, GraphQLString, getNamedType, isEnumType } from "graphql";
import { mapSchema, MapperKind } from "@graphql-tools/utils";

const PORT = process.env.PORT || "3005";

export const composeConfig = defineConfig({
	subgraphs: [
		{
			sourceHandler: loadOpenAPISubgraph("Laji-API", {
				source: `http://localhost:${PORT}/openapi-json`,
				operationHeaders: {
					"Accept": "application/json",
				},
				ignoreErrorResponses: true,
			}),
			transforms: [
				// We do this because GraphQL enums don't allow dot character in enums. The generated schema would have the
				// enums with dots replaced with lower dash. Our enums have dots (like `MY.collectionQuality`), and we want to
				// keep them to keep ids stable.
				replaceEnumsWithStrings
			]
		}
	],
});

export function replaceEnumsWithStrings(schema: GraphQLSchema) {
	return mapSchema(schema, {
		[MapperKind.OBJECT_FIELD]: (fieldConfig) => {
			const namedType = getNamedType(fieldConfig.type);

			if (!isEnumType(namedType)) {
				return fieldConfig;
			}

			fieldConfig.type = GraphQLString;

			const source =
				(fieldConfig.extensions as any)?.directives?.source;

			if (source?.type) {
				source.type = "String";
			}

			return fieldConfig;
		},
	});
}
