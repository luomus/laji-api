import { HttpException, Inject, Injectable } from "@nestjs/common";
import { INFORMATION_CLIENT } from "src/provider-tokens";
import { RestClientService } from "src/rest-client/rest-client.service";
import { Information, RemoteInformation } from "./information.dto";
import { serializeInto } from "src/serialization/serialization.utils";
import { Lang } from "src/common.dto";

@Injectable()
export class InformationService {

	constructor(@Inject(INFORMATION_CLIENT) private informationClient: RestClientService<RemoteInformation>) {}

	async getAll(lang: Omit<Lang, "multi">) {
		return parseInformation(await this.informationClient.get(undefined, { params: { locale: lang } }));
	}

	async get(id: string) {
		return parseInformation(await this.informationClient.get(id));
	}

	getIndex(lang: Omit<Lang, "multi">) {
		return this.informationClient.get(undefined, { params: { locale: lang } });
	}
}

const parseInformation = (remote: RemoteInformation): Information => {
	const { page } = remote;
	if (!page) {
		throw new HttpException("Information not found", 404);
	}
	const parsed = serializeInto(Information)(page);
	if (page.featuredImage) {
		parsed.featuredImage = page.featuredImage;
	}
	if (page.modified) {
		parsed.modified = page.modified;
	}
	if (remote.children) {
		parsed.children = remote.children;
	}
	if (remote.breadcrumb) {
		parsed.parents = remote.breadcrumb;
	}
	return parsed;
};
