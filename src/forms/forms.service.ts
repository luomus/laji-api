import { HttpException, Inject, Injectable } from "@nestjs/common";
import { Form, FormListing, FormSchemaFormat, Format, Hashed, isFormSchemaFormat } from "./dto/form.dto";
import { RestClientService } from "src/rest-client/rest-client.service";
import { Lang } from "src/common.dto";
import { Person, Role } from "src/persons/person.dto";
import { CollectionsService } from "src/collections/collections.service";
import { FORM_CLIENT } from "src/provider-tokens";
import { createHash } from "crypto";

@Injectable()
export class FormsService {
	constructor(
		@Inject(FORM_CLIENT) private formClient: RestClientService<Form>,
		private collectionsService: CollectionsService
	) {}

	async getListing(lang = Lang.en) {
		return (await this.formClient.get<{forms: FormListing[]}>(undefined, { params: { lang } }, )).forms;
	}

	create(form: Form) {
		return this.formClient.post(undefined, form);
	}

	get(id: string): Promise<Form>
	get(id: string, format: Format.json, lang?: Lang, expand?: boolean): Promise<Form>
	get(id: string, format: Format.schema, lang?: Lang, expand?: boolean): Promise<Hashed<FormSchemaFormat>>
	get(id: string, format?: Format, lang?: Lang, expand?: boolean): Promise<Form | Hashed<FormSchemaFormat>>
	get(id: string, format: Format = Format.json, lang: Lang = Lang.en, expand = true)
		: Promise<Form | Hashed<FormSchemaFormat>> {
		return this.formClient.get<Form | FormSchemaFormat>(id, { params: {
			format,
			lang: formatLangParam(lang),
			expand
		} }, {
			// We add $id property, which is a hash of the schema so document validation knows when to compile a new
			// validator.
			transformer: (form) => {
				if (isFormSchemaFormat(form)) {
					(form as Hashed<FormSchemaFormat>).$id =
						createHash("md5")
							.update(JSON.stringify(form.schema))
							.digest("hex");
				}
				return form;
			}
		});
	}

	update(id: string, form: Form) {
		return this.formClient.put(id, form);
	}

	delete(id: string) {
		return this.formClient.delete(id);
	}

	transform(form: Form, lang: Lang) {
		return this.formClient.post("transform", form, { params: { lang: formatLangParam(lang) } });
	}

	async findListedByCollectionID(collectionID: string): Promise<FormListing[]> {
		return (await this.getListing()).filter(f => f.collectionID === collectionID);
	}

	async checkWriteAccessIfDisabled(collectionID?: string, person?: Person): Promise<void> {
		if (!collectionID) {
			return;
		}

		const isDisabled = await this.findFor(collectionID, (f => f.options.disabled)) || false;

		if (!isDisabled) {
			return;
		}

		if (!person || !person.role.includes(Role.Admin)) {
			throw new HttpException("Unprocessable Entity", 422, { cause: "Form is disabled" });
		}
	}

	/** Array.*find()* for the collection and its parents recursively with the given *predicate* */
	async findFor(collectionID: string, predicate: (f: FormListing) => unknown): Promise<FormListing | undefined> {
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
