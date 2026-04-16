import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, switchMap } from "rxjs";
import { FormsService } from "src/forms/forms.service";
import { NamedPlace, NamedPlaceUnitsFiltered } from "./named-places.dto";
import { serializeInto } from "src/serialization/serialization.utils";
import { applyToResult } from "src/pagination.utils";
import { firstFromNonEmptyArr } from "src/utils";

@Injectable()
export class FilterUnitsInterceptor implements NestInterceptor {

	constructor(private formsService: FormsService) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		return next.handle().pipe(switchMap(async (places: NamedPlace[]) => {
			if (!places.length) {
				return places;
			}
			const place = firstFromNonEmptyArr(places);
			const includeUnits = place.collectionID
				&& await this.formsService.findFor(place.collectionID,
					f => f.options.namedPlaceOptions?.includeUnits
				);
			if (includeUnits) {
				return places;
			}
			return applyToResult(serializeInto(NamedPlaceUnitsFiltered))(places);
		}));
	}
}

