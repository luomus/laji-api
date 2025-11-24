export enum OutputFormat {
	gpkg = "gpkg"
}

export enum GeometryFormat {
	point = "point",
	bbox = "bbox",
	footprint = "footprint"
}

export enum GeoconvertLang {
	fi = "fi",
	en = "en",
	tech = "tech"
}

export class GetGeoConvertDto {
	/** The output file format (in the form of a file extension) for the geographic data */
	lang: GeoconvertLang;
	/** The geometry type of the output */
	geometryType: GeometryFormat = GeometryFormat.point;
	/** The coordinate reference system for the output. One of "kkj", "euref", "wgs84" or any valid numeric EPSG code */
	crs: string = "wgs84";
}
