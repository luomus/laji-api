import { InformationSystem } from "@luomus/laji-schema/models";
import { MultiLangDto } from "src/common.dto";

export class Source implements Pick<InformationSystem, "id" | "name" | "description"> {
	id?: string | undefined;
	name: MultiLangDto;
	description: MultiLangDto;
}
