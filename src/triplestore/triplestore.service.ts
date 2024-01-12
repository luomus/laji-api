import { HttpException, Inject, Injectable } from "@nestjs/common";
import { RestClientService } from "src/rest-client/rest-client.service";
import { parse, serialize, graph } from "rdflib";
import { compact, NodeObject } from "jsonld";
import { isObject, JSON, JSONObject } from "../type-utils";
import { CacheOptions, promisePipe } from "src/utils";
import { ContextProperties, MetadataService, Property } from "src/metadata/metadata.service";
import { Cache } from "cache-manager";
import { MultiLang } from "src/common.dto";
import { CACHE_MANAGER } from "@nestjs/cache-manager";

const BASE_URL = "http://tun.fi/";

type ResourceIdentifierObj = { "@id": string };
const isResourceIdentifier = (data: any): data is ResourceIdentifierObj =>
	isObject(data) && Object.keys(data).length === 1 && "@id" in data;

type MultiLangResource = { "@language": string; "@value": string };
const isMultiLangResource = (data: any): data is MultiLangResource =>
	isObject(data) && "@language" in data;

type TriplestoreSearchQuery = {
	type?: string;
	predicate?: string;
	objectresource?: string;
	limit?: number;
	offset?: string;
	object?: string;
	subject?: string;
}

type TriplestoreQueryOptions = CacheOptions;

@Injectable()
export class TriplestoreService {
	constructor(
		@Inject("TRIPLESTORE_REST_CLIENT") private triplestoreClient: RestClientService,
		private metadataService: MetadataService,
		@Inject(CACHE_MANAGER) private cache: Cache
	) {
		this.triplestoreToJsonLd = this.triplestoreToJsonLd.bind(this);
		this.resolveResources = this.resolveResources.bind(this);
		this.resolveLangResources = this.resolveLangResources.bind(this);
		this.dropPrefixes = this.dropPrefixes.bind(this);
		this.rmIdAndType = this.rmIdAndType.bind(this);
		this.compactJsonLd = this.compactJsonLd.bind(this);
		this.formatJsonLd = this.formatJsonLd.bind(this);
	}
	
	private getBaseQuery() {
		return { format: "rdf/xml" };
	}

	// TODO returned items @context is different than old lajiapi
	/**
	 * Find a resource from triplestore.
	 * @param resource The resource identifier to get 
	 * @param options Cache options
	 */
	async findOne<T>(resource: string, options?: TriplestoreQueryOptions): Promise<T> {
		const { cache } = options || {};
		if (cache) {
			const cached = await this.cache.get<T>(this.getCacheKey(resource));
			if (cached) {
				return cached;
			}
		}
		return this.rdfToJsonLd<T>(
			this.triplestoreClient.get(resource, { params: this.getBaseQuery() }),
			this.getCacheKey(resource),
			options
		);
	}

	/**
	 * Find multple resources from triplestore.
	 * @param query Query options
	 * @param options Cache options
	 */
	async find<T>(query: TriplestoreSearchQuery = {}, options?: TriplestoreQueryOptions): Promise<T[]> {
		const _query = { ...this.getBaseQuery(), ...query };

		const { cache } = options || {};
		if (cache) {
			const cached = await this.cache.get<T[]>(this.getCacheKey("search", _query));
			if (cached) {
				return cached;
			}
		}

		let result = await this.rdfToJsonLd<T|T[]>(
			this.triplestoreClient.get("search", { params: _query }),
			this.getCacheKey("search", _query),
			options
		);
		if (!Array.isArray(result)) {
			result = [result];
		}
		return result;
	}

	private async rdfToJsonLd<T>(
		rdf: JSON | Promise<JSON>,
		cacheKey: string,
		options?: TriplestoreQueryOptions
	): Promise<T> {
		const jsonld = await promisePipe(
			rdf,
			this.triplestoreToJsonLd
		);
		const isArrayResult = Array.isArray(jsonld["@graph"]);
		if (isArrayResult && (jsonld["@graph"] as any).length === 0) {
			return [] as T;
		}

		const graphContext = isArrayResult
			? (jsonld["@graph"] as any)[0]["@type"]
			: jsonld["@type"];
		const context = await this.metadataService.getPropertiesForContext(MetadataService.parseContext(graphContext));

		const formatted = (isArrayResult
			? await Promise.all((jsonld["@graph"] as any).map((i: any) => this.formatJsonLd(i, context)))
			: await this.formatJsonLd(jsonld, context)
		) as T;

		return this.cacheResult(formatted, cacheKey, options);
	}

	private formatJsonLd(jsonld: any, context: ContextProperties) {
		return promisePipe(
			jsonld,
			this.compactJsonLd,
			this.resolveResources,
			this.adhereToSchema(context),
			this.resolveLangResources,
			this.dropPrefixes,
			this.rmIdAndType
		);
	}

	private getCacheKey(resource: string, query?: TriplestoreSearchQuery) {
		return resource + JSON.stringify(query || {});
	}

	private async cacheResult<T>(item: T, cacheKey: string, options?: TriplestoreQueryOptions): Promise<T> {
		options?.cache && await this.cache.set(cacheKey, item, options.cache);
		return item;
	}

	triplestoreToJsonLd(rdf: string): Promise<NodeObject> {
		const rdfStore = graph();
		parse(rdf, rdfStore, BASE_URL, "application/rdf+xml");

		return new Promise<NodeObject>((resolve, reject) => {
			serialize(null, rdfStore, BASE_URL, "application/ld+json", async (err, data) => {
				if (err) {
					return reject(err);
				}
				if (!data) {
					return reject(new HttpException("Not found", 404));
				}

				const jsonld = JSON.parse(data);
				resolve(jsonld);
			});
		});
	}

	compactJsonLd(jsonld: any) {
		return compact(jsonld, jsonld["@type"]) as unknown as JSON;
	}

	private traverseJsonLd(data: JSONObject, op: (jsonLd: JSONObject | JSON[]) => (JSON | undefined)): JSONObject {
		const traverse = (data: JSON | JSON[]): JSON => {
			if (Array.isArray(data)) {
				const operated = op(data);
				if (operated !== undefined) {
					return operated;
				}
				return data.map(traverse);
			} else if (isObject(data)) {
				const operated = op(data);
				if (operated !== undefined) {
					return operated;
				}
				return (Object.keys(data) as (keyof JSONObject)[]).reduce<JSONObject>((d, k) => {
					const value = data[k];
					// Should never happen, but doesn't matter if it does.
					// Undefined values have no semantic difference to missing keys.
					// We want the result to be JSON, and JSON doesn't have 'undefined'.
					if (value === undefined) {
						return d;
					}
					d[k] = traverse(value);
					return d;
				}, {});
			}
			return data;
		};

		return traverse(data) as JSONObject;
	}

	/**
	 * JsonLd resources are in the input like { "@id": "http://tun.fi/MOS.500" }.
	 * This function resolves those resources into values like "MOS.500".
	 */
	private resolveResources(data: JSONObject): JSONObject {
		return this.traverseJsonLd(data, (value: JSONObject | JSON[]) => {
			if (isResourceIdentifier(value)) {
				return value["@id"].replace(BASE_URL, "");
			}
		});
	}

	private resolveLangResources(data: JSONObject): JSONObject {
		return this.traverseJsonLd(data, (value: JSONObject | JSON[]) => {
			if (Array.isArray(value) && isMultiLangResource(value[0])) {
				return value.reduce<MultiLang>((langObj: MultiLang, resource: MultiLangResource) => ({
					...langObj,
					[resource["@language"]]: resource["@value"]
				}), {});
			}
		});
	}

	/** RDF doesn't know about our properties' schema info. This function makes the output to adhere to schema.  */
	private adhereToSchema = (properties: ContextProperties) => async (data: JSONObject) => {
		function asArray(value: any, property: Property) {
			if (property?.maxOccurs === "unbounded" && value && !Array.isArray(value)) {
				return [value];
			}
		}
		function multiLangAsArr(value: any, property: Property) {
			if (property.multiLanguage && value && !Array.isArray(value)) {
				return [value];
			}
		}

		const transformations: ((value: any, property: Property) => any | undefined)[] =
			[asArray, multiLangAsArr];

		return (Object.keys(data) as (keyof JSONObject)[]).reduce<JSONObject>((d, k) => {
			const property = properties[k];
			let value = data[k];
			if (!property) {
				d[k] = value;
				return d;
			}
			for (const transform of transformations) {
				const transformed = transform(value, property);
				if (transformed !== undefined) {
					value = transformed;
				}
			}

			d[k] = value;
			return d;
		}, {});
	}

	private dropPrefixes(data: JSONObject) {
		const unprefix = (k: string) => k.split(".").pop() as string;

		return (Object.keys(data) as string[]).reduce<JSONObject>((d, k) => {
			d[unprefix(k)] = data[k];
			return d;
		}, {});
	}

	private rmIdAndType(data: JSONObject) {
		const { "@type": type, "@id": id, ...d } = data;
		if (typeof id === "string") {
			d.id = id.replace(BASE_URL, "");
		}
		return d;
	}
}
