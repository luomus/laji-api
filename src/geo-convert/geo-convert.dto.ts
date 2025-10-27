export enum OutputFormat {
	gpkg = "gpkg"
}

export enum GeometryFormat {
	point = "point",
	bbox = "bbox",
	footprint = "footprint"
}

export class GetGeoConvertDto {
	/** The output file format (in the form of a file extension) for the geographic data */
	outputFormat: OutputFormat = OutputFormat.gpkg;
	/** The geometry type of the output */
	geometryType: GeometryFormat = GeometryFormat.point;
	/** The coordinate reference system for the output. One of "kkj", "euref", "wgs84" or any valid numeric EPSG code */
	crs: string = "wgs84";
}
