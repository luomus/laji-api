import { MultiLang } from "src/common.dto";

export class FeedbackDto {
	subject: string;
	message: string;
	meta: string;
}

export type InformationSystem = {
	name: MultiLang;
}
