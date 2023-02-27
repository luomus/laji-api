import {HttpService} from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { map } from "rxjs";
import { Form } from "./dto/form.dto";
import { AxiosRequestConfig } from "axios";
import {ConfigService} from "@nestjs/config";

@Injectable()
export class FormsService {
	constructor(private readonly httpService: HttpService,
	private readonly configService: ConfigService) {}

	private readonly path = this.configService.get("FORM_PATH")
	private readonly auth = this.configService.get("FORM_AUTH")

	create(form: Form) {
		return this.httpService.post(this.path, form, {headers: {Authorization: this.auth}}).pipe(map(r => r.data));
	}

	findAll() {
		return this.httpService.get(this.path, {headers: {Authorization: this.auth}}).pipe(map(r => r.data));
	}

	findOne(id: string) {
		return this.httpService.get(this.path + id, {headers: {Authorization: this.auth}}).pipe(map(r => r.data));
	}

	update(id: string, form: Form) {
		return this.httpService.put(this.path + id, form, {headers: {Authorization: this.auth}}).pipe(map(r => r.data));
	}

	remove(id: string) {
		return this.httpService.delete(this.path + id, {headers: {Authorization: this.auth}}).pipe(map(r => r.data));
	}

	transform(form: Form) {
		return this.httpService.post(this.path + "/transform", form, {headers: {Authorization: this.auth}}).pipe(map(r => r.data));
	}
}
