import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, switchMap } from "rxjs";
import { FormsService } from "src/forms/forms.service";
import { NamedPlace, NamedPlaceUnitsFiltered } from "./named-places.dto";
import { serializeInto } from "src/serialization/serialization.utils";
import { applyToResult, getSampleFromResultLike } from "src/pagination.utils";

@Injectable()
export class FilterUnitsInterceptor implements NestInterceptor {

	constructor(private formsService: FormsService) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		return next.handle().pipe(switchMap(async (placesOrPlace: NamedPlace | NamedPlace[]) => {
			const sample = getSampleFromResultLike(placesOrPlace);
			if (!sample) {
				return placesOrPlace;
			}
			const includeUnits = sample.collectionID
				&& await this.formsService.findFor(sample.collectionID,
					f => f.options.namedPlaceOptions?.includeUnits
				);
			if (includeUnits) {
				return placesOrPlace;
			}
			return applyToResult(serializeInto(NamedPlaceUnitsFiltered))(placesOrPlace);
		}));
	}
}

