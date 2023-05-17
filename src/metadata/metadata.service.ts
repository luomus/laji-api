import { Inject, Injectable } from "@nestjs/common";
import { RestClientService } from "src/rest-client/rest-client.service";

export type Property = {
	domain: string[];
	maxOccurs: string;
	property: string;
	multiLanguage: boolean;
	shortName: string;
}

type ContextToProperties = Record<string, Property>;
type Contexts = Record<string, ContextToProperties>;

const CACHE_30_MIN = 1000 * 60 * 30;

@Injectable()
export class MetadataService {
	constructor(
		@Inject("TRIPLESTORE_READONLY_REST_CLIENT") private triplestoreRestClient: RestClientService) {}

	/**
	 * Get all properties.
	 */
	private getProperties() {
		return this.triplestoreRestClient.get<Property[]>("schema/property", undefined, { cache: CACHE_30_MIN });
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
		return (await this.getContexts())[this.parseContext(context)];
	}

	parseContext(context: string) {
		if (context.startsWith("http://tun.fi")) {
			return context.replace("http://tun.fi/", "");
		}
		return context;
	}
	
}
