import { defineConfig } from "@graphql-mesh/compose-cli";
import { loadOpenAPISubgraph } from "@omnigraph/openapi";

export const composeConfig = defineConfig({
	subgraphs: [
		{
			sourceHandler: loadOpenAPISubgraph("Laji-API", {
				source: "http://localhost:3004/openapi-json",
				operationHeaders: {
					"Person-Token": "{context.headers[\"person-token\"]}",
					"Authorization": "{context.headers[\"authorization\"]}",
				},
				ignoreErrorResponses: true,
			}),
		}
	]
});

