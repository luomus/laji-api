import { Inject, Injectable } from "@nestjs/common";
import { Form, Format, Lang, PaginatedDto } from "./dto/form.dto";
import { RestClientService } from "src/rest-client/rest-client.service";

const CACHE_1_MIN = 1000 * 60;

const pageResult = <T>(data: T[], page = 1, pageSize = 20): PaginatedDto<T> => {
	if (page <= 0) {
		page = 1;
	}

	const total = data.length;
	const last = Math.ceil(total / pageSize);
	const  result: PaginatedDto<T> = {
		total,
		results: data.slice((page - 1) * pageSize, page * pageSize),
		currentPage: page,
		pageSize,
		last
	};
	if (page > 1) {
		result.prevPage = page - 1;
	}
	if (last > page) {
		result.nextPage = page + 1;
	}
	return result;
}

@Injectable()
export class FormsService {
	constructor(@Inject("FORM_REST_CLIENT") private formClient: RestClientService<Form>) {}

	create(form: Form, personToken: string) {
		return this.formClient.post("", form, { params: { personToken } });
	}

	async findAll(lang: Lang, page?: number, pageSize?: number) {
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
