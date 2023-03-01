export enum Lang {
	fi = "fi",
	sv = "sv",
	en = "en",
	multi = "multi",
}
export enum Format {
	schema = "schema",
	json = "json"
}


export class Form {
	id?: string;
	name?: string;	
	fields?: any;	
	uiSchema?: any;	
	options?: any;	
	translations?: any;	
}

export class GetDto {
	format?: Format = Format.schema;
	/*
	 * Language of fields that have multiple languages. If multi is selected fields that can have multiple languages will contain language objects. Defaults to 'en'
	 */
	lang?: Lang = Lang.en;
	/*
	 * Expand response
	 */
	expand?: boolean = true;
}

export class QueryWithPersonTokenDto {
	/*
	 * Person's authentication token
	 */
	personToken: string;
}
