import { HasJsonLdContext, MultiLang } from "src/common.dto";

export class FeedbackDto {
	subject: string;
	message: string;
	meta: string;
}

export type InformationSystem = HasJsonLdContext & {
	name: MultiLang;
}
