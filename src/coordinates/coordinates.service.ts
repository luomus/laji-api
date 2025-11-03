import { Injectable } from "@nestjs/common";
import { GeoJSON, GeometryCollection } from "geojson";
import { convex } from "@turf/convex";
import { ElasticService } from "src/elastic/elastic.service";
import { Lang, MultiLang } from "src/common.dto";
import { translateMaybeMultiLang } from "src/lang/lang.service";

@Injectable()
export class CoordinatesService {

	constructor(private elasticService: ElasticService) {}

	async getLocationInformation(geoJSON: GeoJSON, lang: Lang) {
		const { hits } = await this.elasticService.search<LocationElastic>("location", geometryToESQuery(geoJSON));
		return hits.hits.map(hit => {
			const { name, description, qname } = hit["_source"];
			const { _type } = hit;
			const descriptionTranslated = translateMaybeMultiLang(description, lang);
			const nameTranslated = translateMaybeMultiLang(name, lang);
			return {
				address_components: [{
					long_name: description,
					short_name: name,
					types: _type ? [_type] : []
				}],
				formatted_address: _type === "biogeographicalProvince"
					? `${descriptionTranslated} (${nameTranslated})`
					: nameTranslated,
				place_id: qname,
				types: _type ? [_type] : []
			};
		});
	}
}

type LocationElastic = {
	description: MultiLang;
	name: MultiLang;
	qname: string;
}

const geometryToESQuery = (geometry: GeoJSON) => {
	geometry = makeGeometryESFriendly(geometry);
	return {
		size: 30,
		query: {
			bool: {
				must: {
					terms: {
						_type: ["municipality", "biogeographicalProvince", "region"]
					}
				},
				filter: [{
					geo_shape: {
						border: {
							shape: geometry
						}
					}
				}]
			}
		}
	};
};

const makeGeometryESFriendly = (geometry: GeoJSON): GeoJSON => {
	if (typeof geometry === "object" && !Array.isArray(geometry)) {
		if (geometry.type === "Point" && typeof (geometry as any).radius !== "undefined") {
			return {
				...geometry,
				type: "circle"
			} as any;
		} else if (
			geometry.type === "LineString" &&
			Array.isArray(geometry.coordinates) &&
			geometry.coordinates.length > 3
		) {
			return {
				type: "Polygon",
				coordinates: convex(geometry)?.geometry.coordinates || [[]]
			};
		} else if (geometry.type === "GeometryCollection" && Array.isArray(geometry.geometries)) {
			return { 
				...geometry,
				geometries: geometry.geometries.map(geom => makeGeometryESFriendly(geom))
			} as GeometryCollection;
		}
	}
	return geometry;
};

