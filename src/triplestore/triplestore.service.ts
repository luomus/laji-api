import { HttpException, Inject, Injectable } from "@nestjs/common";
import { RestClientService } from "src/rest-client/rest-client.service";
import { parse, serialize, graph } from "rdflib";
import { compact, NodeObject } from "jsonld";
import { isObject, JSON, JSONObject } from "../type-utils";
import { JsonLd, JsonLdObj } from "jsonld/jsonld-spec";
import { promisePipe } from "src/utils";

const baseUrl = "http://tun.fi/";

type Property = {
	domain: string[];
	maxOccurs: string;
	property: string;
}

type ContextToProperties = Record<string, Property>;
type Contexts = Record<string, ContextToProperties>;

type ResourceIdentifierObj = { "@id": string };
const isResourceIdentifier = (data: any): data is ResourceIdentifierObj =>
	isObject(data) && Object.keys(data).length === 1 && "@id" in data;

@Injectable()
export class TriplestoreService {
	rdfStore = graph();

	constructor(
		@Inject("TRIPLESTORE_REST_CLIENT") private triplestoreClient: RestClientService) {
		this.triplestoreToJsonLd = this.triplestoreToJsonLd.bind(this);
		this.resolveResources = this.resolveResources.bind(this);
		this.adhereToSchema = this.adhereToSchema.bind(this);
		this.dropPrefixes = this.dropPrefixes.bind(this);
		this.rmIdAndType = this.rmIdAndType.bind(this);
	}

	// TODO returned items @context is different than old lajiapi
	get<T>(resource: string) {
		return promisePipe(
			this.triplestoreClient.get(resource, { params: { format: "rdf/xml" } }),
			this.triplestoreToJsonLd,
			this.resolveResources,
			this.adhereToSchema,
			this.dropPrefixes,
			this.rmIdAndType
		) as Promise<T>;
	}

	triplestoreToJsonLd(rdf: string) {
		parse(rdf, this.rdfStore, baseUrl, "application/rdf+xml");

		return new Promise<NodeObject>((resolve, reject) => {
			serialize(null, this.rdfStore, baseUrl, "application/ld+json", async (err, data) => {
				if (err) {
					return reject(err);
				}
				if (!data) {
					return reject(new HttpException("Not found", 404));
				}

				const jsonld = JSON.parse(data);
				const context = this.getContextFromJsonLd(jsonld);
				try {
					const json: JsonLdObj = await compact(jsonld, context);
					if (json["@graph"]) {
						return resolve(json["@graph"] as NodeObject);
					}
					resolve(json);
				} catch (err) {
					reject(err);
				}
			});
		});
	}

	private getContextFromJsonLd(jsonLd: JsonLdObj): any {
		return jsonLd["@type"];
	}

	/*
	 * JsonLd resources are in the input like { "@id": "http://tun.fi/MOS.500" }.
	 * This function resolves those resources into values like "MOS.500".
	 */
	private resolveResources(data: JsonLdObj): JSON {
		const resolve = (data: JsonLd): JSON => {
			if (Array.isArray(data)) {
				return data.map(resolve);
			} else if (isObject(data)) {
				if (isResourceIdentifier(data)) {
					return data["@id"].replace(baseUrl, "");
				}
				return (Object.keys(data) as (keyof JsonLdObj)[]).reduce<JSONObject>((d, k) => {
					const value = data[k];
					// Should never happen, but doesn't matter if it does.
					// Undefined values have no semantic difference to missing keys.
					if (value === undefined) {
						return d;
					}
					// 'any' because in reality the value is JsonLd, but it's hard
					// to type that here because we are reducing nito a JSONObject.
					d[k] = resolve(value as any);
					return d;
				}, {});
			}
			return data;
		}

		return resolve(data);
	}

	/*
	 * RDF doesn't know about our properties' schema info. This function
	 * makes the output to adhere to schema - for example map a property with 
	 * maxOccurs: unbounded" to be an array always.
	 */
	private async adhereToSchema(data: JSONObject) {
		const context = data["@type"];
		if (typeof context !== "string") {
			throw new Error("Couldn't get context for triplestore data");
		}
		const properties = await this.getPropertiesForContext(context);
		return (Object.keys(data) as (keyof JSONObject)[]).reduce<JSONObject>((d, k) => {
			const property = properties[k];
			if (property?.maxOccurs === "unbounded" && !Array.isArray(data[k])) {
				d[k] = [data[k]];
			} else {
				d[k] = data[k];
			}
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
			d.id = id.replace(baseUrl, "");
		}
		return d;
	}

	/*
	 * Get all properties.
	 */
	private getProperties() {
		return this.triplestoreClient.get<Property[]>("schema/property");
	}

	/*
	 * Get a mapping between contexts' and their properties.
	 */
	private async getContexts() {
		return (await this.getProperties()).reduce<Contexts>((contextMap, property) => {
			const { domain } = property;
			if (!domain) {
				return contextMap;
			}
			domain.forEach(d => {
				contextMap[d] = contextMap[d] || {};
				contextMap[d][property.property] = property;
			});
			return contextMap;
		}, {})
	}

	/*
	 * Get a property map for a context.
	 */
	private async getPropertiesForContext(context: string) {
		return (await this.getContexts())[context];
	}
}
