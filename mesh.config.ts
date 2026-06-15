import { defineConfig } from "@graphql-mesh/compose-cli";
import { loadOpenAPISubgraph } from "@omnigraph/openapi";
import "dotenv";
 
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
			})
		}
	]
});
