import { Inject, Injectable } from "@nestjs/common";
import { RestClientService } from "src/rest-client/rest-client.service";

type Property = {
	domain: string[];
	maxOccurs: string;
	property: string;
}

type ContextToProperties = Record<string, Property>;
type Contexts = Record<string, ContextToProperties>;


@Injectable()
export class MetadataService {
	constructor(
		@Inject("TRIPLESTORE_READONLY_REST_CLIENT") private triplestoreClient: RestClientService) {}

	/**
	 * Get all properties.
	 */
	private getProperties() {
		return this.triplestoreClient.get<Property[]>("schema/property");
	}

	/**
	 * Get a mapping between contexts' and their properties.
	 */
	private async getContexts() {
		return (await this.getProperties()).reduce<Contexts>((contextMap, property) => {
			const { domain } = property;
			domain?.forEach(d => {
				contextMap[d] = contextMap[d] || {};
				contextMap[d][property.property] = property;
			});
			return contextMap;
		}, {})
	}

	/**
	 * Get a property map for a context.
	 */
	async getPropertiesForContext(context: string) {
		return (await this.getContexts())[context];
	}
	
}
