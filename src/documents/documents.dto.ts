import { Document as DocumentI } from "@luomus/laji-schema";
import { ApiProperty, IntersectionType } from "@nestjs/swagger";
import { PagedDto, QueryWithPersonTokenDto } from "src/common.dto";
import { CommaSeparatedStrings, IsOptionalBoolean } from "src/serializing/serializing";
export type Document = DocumentI & { id: string };

export class GetDocumentsDto extends IntersectionType(
	PagedDto,
	QueryWithPersonTokenDto
) {
	/** Limit the list of documents to a certain observation year */
	observationYear: string;

	/**	Fetch only templates */
	@ApiProperty({ name: "templates"  })
	@IsOptionalBoolean()
	isTemplate: boolean = false;

	/** Limit the list of documents to a certain named place*/
	@ApiProperty({ name: "namedPlace"  })
	namedPlaceID: string;
	/** Collection id. Child collections are also fetched. */
	collectionID: string;
	/** Limit the list of documents to a certain source application. */
	sourceID: string;
	/** Use this form's features for the request. Doesn't limit the limit of documents to this form ID! */
	formID: string;
	/** Comma separated list of field names to include in the response */
	@CommaSeparatedStrings() selectedFields?: (keyof Document)[];
}
