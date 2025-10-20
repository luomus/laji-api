import { Inject, Injectable } from "@nestjs/common";
import { ELASTIC_CLIENT } from "src/provider-tokens";
import { RestClientService } from "src/rest-client/rest-client.service";
import { JSONObjectSerializable, MaybeArray } from "src/typing.utils";
import { GeoJSON } from "geojson";

@Injectable()
export class ElasticService {

	constructor(@Inject(ELASTIC_CLIENT) private elasticClient: RestClientService) {
	}

	search<T>(index: string, query: ElasticQuery) {
		return this.elasticClient.post<ElasticResponse<T>>(`${index}/_search`, query);
	}
}

export type ElasticResponse<T> = {
	hits: { total: number,  hits: { _source: T, _type: string; }[] };
	aggregations: JSONObjectSerializable;
};

export type ElasticQuery = {
	from?: number;
	pageSize?: number;
	size?: number;
	parents?: string;
	sort?: Record<string, { order: "asc" | "desc" }>[];
	aggs?: JSONObjectSerializable;
	id?: string;
	query: {
		bool?: {
			filter?: ElasticQueryBoolNode[];
		},
		ids?: { values: string[] }
	};
	_source?: { excludes: string[] } | string[];
};

export type ElasticQueryBoolNode =
	{ terms: Record<string, MaybeArray<string | number | boolean>> }
	| { term: Record<string, string | number | boolean> }
	| { range: Record<string,  { gte: number, lte: number }> }
	| { bool: { must_not?: ElasticQueryBoolNode } }
	| { geo_shape: { border: { shape: GeoJSON; }; }; };

