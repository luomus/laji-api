import { HttpException, Inject, Injectable } from "@nestjs/common";
import { TRIPLESTORE_CLIENT } from "src/provider-tokens";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";
import { RestClientService } from "src/rest-client/rest-client.service";
import { CACHE_30_MIN, dictionarifyByKey } from "src/utils";
import { RedisMemoize } from "src/decorators/redis-memoize.decorator";
import { IntelligentMemoize } from "src/decorators/intelligent-memoize.decorator";
import { Alt, MetadataClass, Property } from "./metadata.dto";
import { Lang } from "src/common.dto";
import { LangService } from "src/lang/lang.service";
import { omit } from "src/typing.utils";
import { addLocalJsonLdContext } from "src/json-ld/json-ld.utils";

export type ClassProperties = { [ propertyName: string ]: Property };
type DomainsToClassProperties = { [domain: string]: ClassProperties };

@Injectable()
export class MetadataService {
	constructor(
		@Inject(TRIPLESTORE_CLIENT) private triplestoreRestClient: RestClientService<unknown>,
		// (It's used by @RedisMemoize())
		// eslint-disable-next-line no-unused-vars
		private cache: RedisCacheService,
		private langService: LangService
	) {}

	/** Get all properties */
	@RedisMemoize(CACHE_30_MIN)
	async getProperties() {
		return [
			...await this.triplestoreRestClient.get<Property[]>(
				"schema/property",
				undefined,
				{
					serializeInto: Property as any,
					transformer: properties =>
						properties.map(property => {
							(property as any).range = (property as any).range?.length
								? (property as any).range[0]
								: "rdf:Resource";
							return property;
						})
				}
			),
			...MAGIC_PROPERTIES
		];
	}

	/** Get a mapping between contexts' and their properties. */
	@RedisMemoize(CACHE_30_MIN)
	private async getDomainToProperties(): Promise<DomainsToClassProperties> {
		return (await this.getProperties()).reduce<DomainsToClassProperties>((contextMap, property) => {
			const { domain } = property;
			domain?.forEach(d => {
				contextMap[d] = contextMap[d] || ({} as ClassProperties);
				contextMap[d]![property.property] = property;
			});
			return contextMap;
		}, {});
	}

	async getClass(className: string) {
		const clazz = (await this.getClassesDict())[className];
		if (!clazz) {
			throw new HttpException(`Class '${className}' not found`, 404);
		}
		return clazz;
	}

	@RedisMemoize(CACHE_30_MIN)
	getClasses() {
		return this.triplestoreRestClient.get<MetadataClass[]>("schema/class");
	}

	@IntelligentMemoize()
	private async getClassesDict() {
		return dictionarifyByKey(await this.getClasses(), "class");
	}

	@IntelligentMemoize()
	private async getPropertiesDict() {
		return dictionarifyByKey(await this.getProperties(), "property");
	}

	async getClassProperties(clasclassName: string) {
		const clazz = await this.getClass(clasclassName);
		const domain = clazz.class;
		const properties = (await this.getDomainToProperties())[domain];
		if (!properties) {
			return [];
		}
		return Object.values(properties);
	}

	async getProperty(propertyName: string) {
		const property = (await this.getPropertiesDict())[propertyName];
		if (!property) {
			throw new HttpException(`Property '${propertyName}' not found`, 404);
		}
		return property;
	}


	async getPropertyAlt(propertyName: string) {
		const property = await this.getProperty(propertyName);
		if (!property) {
			throw new HttpException(`Property '${propertyName}' not found`, 404);
		}
		const { range } = property;
		const alts = await this.getAlts();
		if (!alts[range]) {
			throw new HttpException("Property isn't an alt", 404);
		}
		return alts[range];
	}

	async getAlt(altName: string) {
		const alts = await this.getAlts();
		const alt = alts[altName];
		if (!alt) {
			throw new HttpException("Alt not found", 404);
		}
		return alt;
	}

	private getAlts() {
		return this.triplestoreRestClient.get<{ [propertyName: string]: Alt[] }>("schema/alt");
	}

	@RedisMemoize()
	async getAltsTranslated(lang: Lang) {
		const alts = await this.getAlts();
		const translatedAlts: any = {};
		for (const altName of Object.keys(alts)) {
			translatedAlts[altName] = [];
			for (const alt of alts[altName]!) {
				translatedAlts[altName].push(omit(
					await this.langService.translate(addLocalJsonLdContext("metadata-alt")(alt), lang),
					"@context"
				));
			}
		}
		return addLocalJsonLdContext("metadata-alt")(translatedAlts);
	}

	/** Get a property lookup table for a domain. */
	async getPropertiesForJsonLdContext(jsonLdContext: string) {
		const className = MetadataService.parseClassNameFromJsonLdContext(jsonLdContext);
		const properties = (await this.getDomainToProperties())[className];
		if (!properties) {
			throw new Error(`Unknown JSON-LD context "${jsonLdContext}"`);
		}
		return properties;
	}

	static parseClassNameFromJsonLdContext(jsonLdContext: string) {
		if (jsonLdContext.startsWith("http://tun.fi")) {
			return jsonLdContext.replace("http://tun.fi/", "");
		}
		if (jsonLdContext.startsWith("http://schema.laji.fi")) {
			return jsonLdContext.replace("http://schema.laji.fi/context/", "").replace(".jsonld", "");
		}
		return jsonLdContext;
	}
}

const MAGIC_PROPERTIES: Property[] = [
	{
		"property": "MY.gatherings",
		"label": {
			sv: "Insamlingshändelse",
			en: "Gathering events",
			fi: "Keruutapahtumat"
		},
		"domain": [
			"MY.document"
		],
		"range": "MY.gathering",
		"minOccurs": "1",
		"maxOccurs": "unbounded",
		"required": true,
		"hasMany": true,
		"sortOrder": -1,
		"isEmbeddable": true,
		"multiLanguage": false,
		"shortName": "gatherings"
	},
	{
		"property": "MY.units",
		"label": {
			sv: "Prov",
			en: "Specimen",
			fi: "Havainto"
		},
		"domain": [
			"MY.gathering"
		],
		"range": "MY.unit",
		"minOccurs": "0",
		"maxOccurs": "unbounded",
		"required": false,
		"hasMany": true,
		"sortOrder": -1,
		"isEmbeddable": true,
		"multiLanguage": false,
		"shortName": "units"
	},
	{
		"property": "MY.identifications",
		"label": {
			sv: "Identifiering",
			en: "Identification",
			fi: "Määritys"
		},
		"domain": [
			"MY.unit"
		],
		"range": "MY.identification",
		"minOccurs": "0",
		"maxOccurs": "unbounded",
		"required": false,
		"hasMany": true,
		"sortOrder": -1,
		"isEmbeddable": true,
		"multiLanguage": false,
		"shortName": "identifications"
	},
	{
		"property": "MY.typeSpecimens",
		"label": {
			sv: "Type identifiering",
			en: "Type identification",
			fi: "Tyyppimääritys"
		},
		"domain": [
			"MY.unit"
		],
		"range": "MY.typeSpecimen",
		"minOccurs": "0",
		"maxOccurs": "unbounded",
		"required": false,
		"hasMany": true,
		"sortOrder": -1,
		"isEmbeddable": true,
		"multiLanguage": false,
		"shortName": "typeSpecimens"
	},
	{
		"property": "MY.samples",
		"label": {
			sv: "Prover",
			en: "Samples",
			fi: "Näytteet"
		},
		"domain": [
			"MY.unit"
		],
		"range": "MF.sample",
		"minOccurs": "0",
		"maxOccurs": "unbounded",
		"required": false,
		"hasMany": true,
		"sortOrder": -1,
		"isEmbeddable": true,
		"multiLanguage": false,
		"shortName": "samples"
	},
	{
		"property": "HRA.permits",
		"label": {
			sv: "Permits",
			en: "Permits",
			fi: "Luvat"
		},
		"domain": [
			"HRA.transaction"
		],
		"range": "HRA.permitClass",
		"minOccurs": "0",
		"maxOccurs": "unbounded",
		"required": false,
		"hasMany": true,
		"sortOrder": -1,
		"isEmbeddable": true,
		"multiLanguage": false,
		"shortName": "permits"
	}
];
