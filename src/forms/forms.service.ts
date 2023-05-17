import { Inject, Injectable } from "@nestjs/common";
import { Form, Format } from "./dto/form.dto";
import { RestClientService } from "src/rest-client/rest-client.service";
import { CACHE_1_MIN, pageResult } from "src/utils";
import { Lang } from "src/common.dto";


@Injectable()
export class FormsService {
	constructor(@Inject("FORM_REST_CLIENT") private formClient: RestClientService<Form>) {}

	create(form: Form, personToken: string) {
		return this.formClient.post("", form, { params: { personToken } });
	}

	async getPage(lang: Lang, page?: number, pageSize?: number) {
		return pageResult(
			(await this.formClient.get<{forms: Form[]}>("", { params: { lang } }, { cache: CACHE_1_MIN })).forms,
			page,
			pageSize
		)
	}

	findOne(id: string, format: Format, lang: Lang, expand: boolean) {
		return this.formClient.get(id, { params: { format, lang, expand } }, { cache: CACHE_1_MIN });
	}

	update(id: string, form: Form, personToken: string) {
		return this.formClient.put(id, form, { params: { personToken } });
	}

	remove(id: string, personToken: string) {
		return this.formClient.delete(id, { params: { personToken } });
	}

	transform(form: Form, personToken: string) {
		return this.formClient.post("transform", form, { params: { personToken } });
	}
}
