import { Inject, Injectable } from "@nestjs/common";
import { TRIPLESTORE_CLIENT } from "src/provider-tokens";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";
import { RestClientService } from "src/rest-client/rest-client.service";
import { CACHE_30_MIN } from "src/utils";

export type Property = {
	domain: string[];
	maxOccurs: string;
	property: string;
	multiLanguage: boolean;
	shortName: string;
}

export type ContextProperties = Record<string, Property>;
type Contexts = Record<string, ContextProperties>;

@Injectable()
export class MetadataService {
	constructor(
		@Inject(TRIPLESTORE_CLIENT) private triplestoreRestClient: RestClientService<unknown>,
		private cache: RedisCacheService
	) {}

	/** Get all properties. */
	private getProperties() {
		return this.triplestoreRestClient.get<Property[]>("schema/property", undefined);
	}

	/** Get a mapping between contexts' and their properties. */
	private async getContexts(): Promise<Contexts> {
		const cached = await this.cache.get<Contexts>("properties");
		if (cached) {
			return cached;
		}
		const contexts = (await this.getProperties()).reduce<Contexts>((contextMap, property) => {
			const { domain } = property;
			domain?.forEach(d => {
				contextMap[d] = contextMap[d] || ({} as ContextProperties);
				contextMap[d]![property.property] = property;
			});
			return contextMap;
		}, {});
		await this.cache.set("properties", contexts, CACHE_30_MIN);
		return contexts;
	}

	/** Get a property map for a context. */
	async getPropertiesForContext(context: string) {
		const properties = (await this.getContexts())[MetadataService.parseContext(context)];
		if (!properties) {
			throw new Error(`Unknown context "${context}"`);
		}
		return properties;
	}

	static parseContext(context: string) {
		if (context.startsWith("http://tun.fi")) {
			return context.replace("http://tun.fi/", "");
		}
		return context;
	}
}
