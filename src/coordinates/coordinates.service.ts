import { HttpException, Inject, Injectable, Logger } from "@nestjs/common";
import { GeoJSON, GeometryCollection, Polygon, Point, FeatureCollection, Feature } from "geojson";
import { convex } from "@turf/convex";
import { center } from "@turf/center";
import { explode } from "@turf/explode";
import { buffer } from "@turf/buffer";
import { booleanContains } from "@turf/boolean-contains";
import { ElasticService } from "src/elastic/elastic.service";
import { Lang, MultiLang, MultiLangDto } from "src/common.dto";
import { translateMaybeMultiLang } from "src/lang/lang.service";
import { GLOBAL_CLIENT } from "src/provider-tokens";
import { RestClientService } from "src/rest-client/rest-client.service";
import { ConfigService } from "@nestjs/config";
import { Location } from "./coordinates.dto";
import { firstFromNonEmptyArr } from "src/utils";

export const FINLAND_BOUNDS: Polygon = {
	type: "Polygon",
	coordinates: [[
		[15.316, 56.311],
		[36.783, 56.311],
		[36.783, 71.348],
		[15.316, 71.348],
		[15.316, 56.311] 
	]]
};

@Injectable()
export class CoordinatesService {

	private logger = new Logger(CoordinatesService.name);

	constructor(
		private elasticService: ElasticService,
		@Inject(GLOBAL_CLIENT) private globalClient: RestClientService,
		private config: ConfigService
	) {}

	async getLocationInformation(geoJSON: GeoJSON, lang: Lang): Promise<Location[]> {
		geoJSON = normalizeGeoJSON(geoJSON);
		const featureCollection = explode(geoJSON);
		const polygon = convex(featureCollection)
			|| buffer(featureCollection, 0.001, { units: "kilometers" })?.features[0];

		if (!polygon) {
			throw new HttpException("Couldn't interpret geoJSON", 422);
		}

		if (!booleanContains(FINLAND_BOUNDS, polygon)) {
			return this.fetchGoogle(geoJSON, lang);
		}

		let elasticResult: Location[];
		try {
			 elasticResult = await this.fetchElastic(geoJSON, lang);
		} catch (e) {
			return this.fetchGoogle(geoJSON, lang);
		}
		if (elasticResult.length) {
			return elasticResult;
		}
		return this.fetchGoogle(geoJSON, lang);
	}

	private async fetchElastic(geoJSON: GeoJSON, lang: Lang): Promise<Location[]> {
		const { hits } = await this.elasticService.search<LocationElastic>("location", geometryToESQuery(geoJSON));
		const results: Location[] = hits.hits.map(hit => {
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
					? descriptionTranslated && nameTranslated
						? `${descriptionTranslated} (${nameTranslated})`
						: descriptionTranslated
					: nameTranslated,
				place_id: qname,
				types: _type ? [_type] : []
			};
		});
		if (results.length) {
			results.push({
				address_components: [{
					long_name: {
						[lang]: "Suomi",
					},
					short_name: {
						[lang]: "Suomi",
					},
					types: ["country"]
				}],
				formatted_address: "Suomi",
				types: ["country"],
				place_id: "ML.206"
			});
		}
		return results;
	}

	private async fetchGoogle(geoJSON: GeoJSON, lang: Lang): Promise<Location[]> {
		const [ lng, lat ] = center(geoJSON).geometry.coordinates;
		const { results } = await this.globalClient.get<{ results: Location[] }>(`
			https://maps.googleapis.com/maps/api/geocode/json\
				?latlng=${lat},${lng}\
				&key=${this.config.get<string>("GOOGLE_API_KEY")}\
				&language=${lang}\
				&filter=
					country|\
					administrative_area_level_1|\
					administrative_area_level_2|\
					administrative_area_level_3`
		);

		return results.map(result => {
			result.address_components = result.address_components.map(addressComponent => ({
				...addressComponent,
				long_name: {
					fi: addressComponent.long_name,
					sv: addressComponent.long_name,
					en: addressComponent.long_name
				} as MultiLangDto,
				short_name: {
					fi: addressComponent.short_name,
					sv: addressComponent.short_name,
					en: addressComponent.short_name
				} as MultiLangDto
			}));
			return result;
		});
	}


	getPolygon(geoJSON: GeoJSON) {
		const featureCollection = explode(geoJSON);
		const hull = convex(featureCollection);
		if (hull) {
			return hull;
		}

		const polygonalFeatureCollection = buffer(featureCollection, 0.001, { units: "kilometers" });
		if (!polygonalFeatureCollection || polygonalFeatureCollection.features.length > 1) {
			const err = new HttpException("Couldn't interpret polygon from geoJSON", 500);
			this.logger.fatal(err, err.stack, { geoJSON });
			throw err;
		}
		return polygonalFeatureCollection.features[0];
	}
}

type LocationElastic = {
	description: MultiLang;
	name: MultiLang;
	qname: string;
}

const geometryToESQuery = (geoJSON: GeoJSON) => {
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
							shape: geoJSON
						}
					}
				}]
			}
		}
	};
};

type Circle = Point & { radius: number };
const isCircle = (geometry: GeoJSON): geometry is Circle => geometry.type === "Point" && (geometry as any).radius;

const circlePointToPolygon = (pointGeoJSON: Circle): Polygon => {
	const [lng, lat] = pointGeoJSON.coordinates as [number, number];
	const radius = pointGeoJSON.radius;
	const steps = 8;

	const coords: [number, number][] = [];
	const earthRadius = 6371000;

	for (let i = 0; i < steps; i++) {
		const angle = (i / steps) * 2 * Math.PI;

		const dx = radius * Math.cos(angle);
		const dy = radius * Math.sin(angle);

		const dLat = (dy / earthRadius) * (180 / Math.PI);
		const dLng =
			(dx / (earthRadius * Math.cos((lat * Math.PI) / 180))) * (180 / Math.PI);

		coords.push([lng + dLng, lat + dLat]);
	}

	coords.push(firstFromNonEmptyArr(coords));

	return {
		type: "Polygon",
		coordinates: [coords]
	};
};

const traverseGeoJSON = (geoJSON: GeoJSON, geometryOp: (g: GeoJSON.Geometry) => GeoJSON.Geometry): GeoJSON => {
	if (geoJSON.type === "FeatureCollection") {
		return { ...geoJSON, features: geoJSON.features.map(f => traverseGeoJSON(f, geometryOp)) } as FeatureCollection;
	} else if (geoJSON.type === "Feature") {
		return { ...geoJSON, geometry: traverseGeoJSON(geoJSON.geometry, geometryOp) } as Feature;
	} else if (geoJSON.type === "GeometryCollection") {
		return {
			...geoJSON,
			geometries: geoJSON.geometries.map(g => traverseGeoJSON(g, geometryOp))
		} as GeometryCollection;
	} else {
		return geometryOp(geoJSON);
	}
};

const normalizeGeoJSON = (geoJSON: GeoJSON): GeoJSON => {
	return traverseGeoJSON(geoJSON, geometry => {
		if (isCircle(geometry)) {
			return circlePointToPolygon(geometry);
		}
		return geometry;
	});
};
