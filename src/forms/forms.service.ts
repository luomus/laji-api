import {HttpService} from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { map } from "rxjs";
import { Form, Format, Lang, PaginatedDto } from "./dto/form.dto";
import { ConfigService } from "@nestjs/config";

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
	constructor(private readonly httpService: HttpService,
	private readonly configService: ConfigService) {}

	private readonly path = this.configService.get("FORM_PATH")
	private readonly auth = this.configService.get("FORM_AUTH")

	create(form: Form, personToken: string) {
		return this.httpService.post<Form>(this.path, form, {params: {personToken}, headers: {Authorization: this.auth}}).pipe(map(r => r.data));
	}

	findAll(lang: Lang, page?: number, pageSize?: number) {
		return this.httpService.get<{forms: Form[]}>(this.path, {params: {lang}, headers: {Authorization: this.auth}}).pipe(map(r => pageResult(r.data.forms, page, pageSize)));
	}

	findOne(id: string, format: Format, lang: Lang, expand: boolean) {
		return this.httpService.get<Form>(this.path + id, {params: {format, lang, expand}, headers: {Authorization: this.auth}}).pipe(map(r => r.data));
	}

	update(id: string, form: Form, personToken: string) {
		return this.httpService.put<Form>(this.path + id, form, {params: {personToken}, headers: {Authorization: this.auth}}).pipe(map(r => r.data));
	}

	remove(id: string, personToken: string) {
		return this.httpService.delete(this.path + id, {params: {personToken}, headers: {Authorization: this.auth}}).pipe(map(r => r.data));
	}

	transform(form: Form, personToken: string) {
		return this.httpService.post<Form>(this.path + "/transform", form, {params: {personToken}, headers: {Authorization: this.auth}}).pipe(map(r => r.data));
	}
}
