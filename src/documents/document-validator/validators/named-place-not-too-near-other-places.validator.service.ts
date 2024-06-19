import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { DocumentValidator, ValidationException } from "../document-validator.utils";
import * as lajiValidate from "@luomus/laji-validate";
import { NamedPlace } from "@luomus/laji-schema/models";
import { NamedPlacesService } from "src/named-places/named-places.service";

@Injectable()
export class NamedPlaceNotTooNearOtherPlacesValidatorService implements DocumentValidator<NamedPlace> {

	constructor(@Inject(forwardRef(() => NamedPlacesService)) private namedPlacesService: NamedPlacesService) {}

	async validate(place: NamedPlace) {
		const { collectionID } = place;
		if (
			!collectionID ||
			!place.geometry ||
			lajiValidate.validators.geometry(place.geometry) !== undefined
		) {
			return;
		}
		const namedPlaces = await this.namedPlacesService.getAll(
			{ collectionID }, undefined, undefined, ["id", "geometry"]
		);
		for (const comparePlace of namedPlaces) {
			if (comparePlace.id === place.id) {
				continue;
			}
			if (comparePlace.geometry && lajiValidate.validators.geometry(place.geometry, {
				minDistanceWith: comparePlace.geometry,
				minDistance: 200
			}) !== undefined) {
				throw new ValidationException(
					{ ["/geometry"]: ["There already exists a named place in that location"] }
				);
			}
		}
	}
}
