import { CACHE_MANAGER, Inject, Injectable } from "@nestjs/common";
import { Cache } from "cache-manager";
import { RestClientService } from "src/rest-client/rest-client.service";

export type Property = {
	domain: string[];
	maxOccurs: string;
	property: string;
	multiLanguage: boolean;
	shortName: string;
}

export type ContextProperties = Record<string, Property>;
type Contexts = Record<string, ContextProperties>;

const CACHE_30_MIN = 1000 * 60 * 30;

@Injectable()
export class MetadataService {
	constructor(
		@Inject("TRIPLESTORE_READONLY_REST_CLIENT") private triplestoreRestClient: RestClientService,
		@Inject(CACHE_MANAGER) private cache: Cache) {}

	/**
	 * Get all properties.
	 */
	private getProperties() {
		return this.triplestoreRestClient.get<Property[]>("schema/property", undefined);
	}

	/**
	 * Get a mapping between contexts' and their properties.
	 */
	private async getContexts() {
		const cached = await this.cache.get<Contexts>("properties");
		if (cached) {
			return cached;
		}
		const contexts = (await this.getProperties()).reduce<Contexts>((contextMap, property) => {
			const { domain } = property;
			domain?.forEach(d => {
				contextMap[d] = contextMap[d] || {};
				contextMap[d][property.property] = property;
			});
			return contextMap;
		}, {});
		await this.cache.set("properties", contexts, CACHE_30_MIN); 
		return contexts;
	}

	/**
	 * Get a property map for a context.
	 */
	async getPropertiesForContext(context: string) {
		return (await this.getContexts())[MetadataService.parseContext(context)];
	}

	static parseContext(context: string) {
		if (context.startsWith("http://tun.fi")) {
			return context.replace("http://tun.fi/", "");
		}
		return context;
	}
}
