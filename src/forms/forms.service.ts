import { HttpException, Inject, Injectable } from "@nestjs/common";
import { Form, FormListing, FormSchemaFormat, Format } from "./dto/form.dto";
import { RestClientService } from "src/rest-client/rest-client.service";
import { Lang } from "src/common.dto";
import { Person, Role } from "src/persons/person.dto";
import { CollectionsService } from "src/collections/collections.service";
import { FORM_CLIENT } from "src/provider-tokens";

@Injectable()
export class FormsService {
	constructor(
		@Inject(FORM_CLIENT) private formClient: RestClientService<Form>,
		private collectionsService: CollectionsService
	) {}

	async getListing(lang = Lang.en) {
		return (await this.formClient.get<{forms: FormListing[]}>("", { params: { lang } }, )).forms;
	}

	create(form: Form, personToken: string) {
		return this.formClient.post("", form, { params: { personToken } });
	}

	get(id: string, format: Format.json, lang?: Lang, expand?: boolean): Promise<Form>
	get(id: string, format: Format.schema, lang?: Lang, expand?: boolean): Promise<FormSchemaFormat>
	get(id: string, format?: Format, lang?: Lang, expand?: boolean): Promise<Form | FormSchemaFormat>
	get(id: string, format: Format = Format.json, lang: Lang = Lang.en, expand = true)
		: Promise<Form | FormSchemaFormat> {
		return this.formClient.get(id, { params: {
			format,
			lang: formatLangParam(lang),
			expand
		} }
		);
	}

	update(id: string, form: Form, personToken: string) {
		return this.formClient.put(id, form, { params: { personToken } });
	}

	delete(id: string, personToken: string) {
		return this.formClient.delete(id, { params: { personToken } });
	}

	transform(form: Form, lang: Lang, personToken: string) {
		return this.formClient.post("transform", form, { params: { lang: formatLangParam(lang), personToken } });
	}

	async findListedByCollectionID(collectionID: string): Promise<FormListing[]> {
		return (await this.getListing()).filter(f => f.collectionID === collectionID);
	}

	async checkPersonCanAccessCollectionID(collectionID: string, person: Person): Promise<void> {
		const collectionForms = await this.findListedByCollectionID(collectionID);
		const isDisabled = collectionForms.some(f => f?.options.disabled) || false;

		if (!isDisabled) {
			return;
		}

		if (!person.role.includes(Role.Admin)) {
			throw new HttpException("Unprocessable Entity", 422, { cause: "Form is disabled" });
		}
	}

	/** Use Array.*find* *for the collection* and it's parents with the *predicate* */
	async findFor(collectionID: string, predicate: (f: Form) => unknown)
		: Promise<Form | undefined> {
		const forms = await this.findListedByCollectionID(collectionID);
		const matches = forms.find(predicate);
		if (matches) {
			return matches;
		}
		const parentCollections = await this.collectionsService.getParents(collectionID);
		for (const parentCollection of parentCollections) {
			const matches = await this.findFor(parentCollection.id, predicate);
			if (matches) {
				return matches;
			}
		}
	}
}

function formatLangParam(lang: Lang) {
	return lang === "multi" ? undefined : lang;
}
