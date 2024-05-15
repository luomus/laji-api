import { HttpException, Inject, Injectable, forwardRef } from "@nestjs/common";
import { DocumentValidator, ValidationException } from "../document-validator.utils";
import { NamedPlace } from "@luomus/laji-schema/models";
import { NamedPlacesService } from "src/named-places/named-places.service";

@Injectable()
export class UniqueNamedPlaceAlternativeIDsValidatorService implements DocumentValidator<NamedPlace> {

	constructor(@Inject(forwardRef(() => NamedPlacesService)) private namedPlacesService: NamedPlacesService) {}

	async validate(namedPlace: Pick<NamedPlace, "id" | "collectionID" | "alternativeIDs">, path?: string) {
		const { collectionID, alternativeIDs } = namedPlace;
		if (!alternativeIDs || alternativeIDs.length < 1) {
			return;
		}
		if (!collectionID) {
			throw new HttpException(
				"uniqueNamedPlaceAlternativeIDs validator can't be used without a collectionID",
				422
			);
		}

		const namedPlaces = (await this.namedPlacesService.getPage(
			{ collectionID, alternativeIDs }, undefined, undefined, 1, 2, ["id"]
		)).results;

		if (this.hasDuplicate(namedPlaces, namedPlace.id)) {
			throw new ValidationException({ [path ?? ".alternativeIDs"]:
				["There already exists a named place with one or more given alternative IDs"]
			});
		}
	}

	private hasDuplicate(namedPlaces: { id: string }[], id?: string): boolean {
		return namedPlaces.some(namedPlace => namedPlace.id !== id);
	}
}

