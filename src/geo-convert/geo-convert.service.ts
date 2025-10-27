import { Inject, Injectable } from "@nestjs/common";
import { GEOCONVERT_CLIENT } from "src/provider-tokens";
import { RestClientService } from "src/rest-client/rest-client.service";
import { JSONObjectSerializable } from "src/typing.utils";
import { GetGeoConvertDto } from "./geo-convert.dto";

@Injectable()
export class GeoConvertService {

	constructor(
		@Inject(GEOCONVERT_CLIENT) private client: RestClientService<JSONObjectSerializable>,
	) {}

	get(fileId: string, { outputFormat, geometryType, crs }: GetGeoConvertDto, personToken?: string) {
		return this.client.get(`${fileId}/${outputFormat}/${geometryType}/${crs}`, {
			maxRedirects: 0,
			validateStatus: status => status <= 303,
			params: {
				personToken,
				timeout: 0
			}
		});
	}

	post(fileId: string, { outputFormat, geometryType, crs }: GetGeoConvertDto, data: any) {
		return this.client.post(`${fileId}/${outputFormat}/${geometryType}/${crs}`, data, {
			maxRedirects: 0,
			validateStatus: status => status <= 303,
			params: {
				timeout: 0
			}
		});
	}

	status(conversionId: string) {
		return this.client.get(`status/${conversionId}`, {
			maxRedirects: 0,
			validateStatus: status => status <= 303,
			params: {
				timeout: 0
			}
		});
	}

	output(conversionId: string) {
		return this.client.get(`output/${conversionId}`);
	}
}
