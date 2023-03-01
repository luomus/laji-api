import {HttpService} from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { map } from "rxjs";
import { Form, Format, Lang } from "./dto/form.dto";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class FormsService {
	constructor(private readonly httpService: HttpService,
	private readonly configService: ConfigService) {}

	private readonly path = this.configService.get("FORM_PATH")
	private readonly auth = this.configService.get("FORM_AUTH")

	create(form: Form, personToken: string) {
		return this.httpService.post(this.path, form, {params: {personToken}, headers: {Authorization: this.auth}}).pipe(map(r => r.data));
	}

	findAll() {
		return this.httpService.get(this.path, {headers: {Authorization: this.auth}}).pipe(map(r => r.data));
	}

	findOne(id: string, format: Format, lang: Lang, expand: boolean) {
		return this.httpService.get(this.path + id, {params: {format, lang, expand}, headers: {Authorization: this.auth}}).pipe(map(r => r.data));
	}

	update(id: string, form: Form, personToken: string) {
		return this.httpService.put(this.path + id, form, {params: {personToken}, headers: {Authorization: this.auth}}).pipe(map(r => r.data));
	}

	remove(id: string, personToken: string) {
		return this.httpService.delete(this.path + id, {params: {personToken}, headers: {Authorization: this.auth}}).pipe(map(r => r.data));
	}

	transform(form: Form, personToken: string) {
		return this.httpService.post(this.path + "/transform", form, {params: {personToken}, headers: {Authorization: this.auth}}).pipe(map(r => r.data));
	}
}
