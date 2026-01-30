import { Get, Param, UseInterceptors, Version } from "@nestjs/common";
import { MetadataService } from "./metadata.service";
import { LajiApiController } from "src/decorators/laji-api-controller.decorator";
import { ApiExtraModels, ApiOkResponse, ApiTags, getSchemaPath } from "@nestjs/swagger";
import { Translator } from "src/interceptors/translator.interceptor";
import { Alt, MetadataClass, Property } from "./metadata.dto";
import { Serializer } from "src/serialization/serializer.interceptor";
import { ResultsArray, swaggerResponseAsResultsArray } from "src/interceptors/results-array.interceptor";
import { RequestLang } from "src/decorators/request-lang.decorator";
import { Lang } from "src/common.dto";

@ApiTags("Metadata")
@LajiApiController("metadata")
export class MetadataController {

	constructor(private metadataService: MetadataService) {}

	/** Get all classes */
	@Version("1")
	@Get("classes")
	@UseInterceptors(
		Translator,
		ResultsArray,
		Serializer(MetadataClass)
	)
	@ApiOkResponse({ schema: swaggerResponseAsResultsArray({ $ref: getSchemaPath(MetadataClass) }) })
	getClasses() {
		return this.metadataService.getClasses();
	}

	/** Get a class by name */
	@Version("1")
	@Get("classes/:class")
	@UseInterceptors(
		Translator,
		Serializer(MetadataClass)
	)
	getClass(@Param("class") className: string) {
		return this.metadataService.getClass(className);
	}

	/** Get class' properties by name */
	@Version("1")
	@Get("classes/:class/properties")
	@UseInterceptors(
		Translator,
		ResultsArray,
		Serializer(Property)
	)
	getClassProperty(@Param("class") className: string) {
		return this.metadataService.getClassProperties(className);
	}

	/** Get all properties */
	@Version("1")
	@Get("properties")
	@UseInterceptors(
		Translator,
		ResultsArray,
		Serializer(Property)
	)
	@ApiOkResponse({ schema: swaggerResponseAsResultsArray({ $ref: getSchemaPath(Property) }) })
	getProperties() {
		return this.metadataService.getProperties();
	}

	/** Get a property by name */
	@Version("1")
	@Get("properties/:property")
	@UseInterceptors(
		Translator,
		Serializer(Property)
	)
	getProperty(@Param("property") property: string) {
		return this.metadataService.getProperty(property);
	}

	/** Get property's alt by property name */
	@Version("1")
	@Get("properties/:property/alt")
	@UseInterceptors(
		Translator,
		ResultsArray,
		Serializer(Alt)
	)
	@ApiExtraModels(Alt)
	@ApiOkResponse({ schema: swaggerResponseAsResultsArray({ $ref: getSchemaPath(Alt) }) })
	getPropertyAlt(@Param("property") property: string) {
		return this.metadataService.getPropertyAlt(property);
	}

	/** Get all alts as a lookup object where keys are property names and values are alts */
	@Version("1")
	@Get("alts")
	@ApiOkResponse({ schema: { type: "object", additionalProperties: { $ref: getSchemaPath(Alt) } } })
	async getAlts(@RequestLang() lang: Lang) {
		return this.metadataService.getAltsTranslated(lang);
	}

	/** Get alt values by alt name */
	@Version("1")
	@Get("alts/:alt")
	@UseInterceptors(
		Translator,
		ResultsArray,
		Serializer(Alt)
	)
	@ApiOkResponse({ schema: { type: "array", items: { $ref: getSchemaPath(Alt) } } })
	async getAlt(@Param("alt") alt: string) {
		return this.metadataService.getAlt(alt);
	}
}
