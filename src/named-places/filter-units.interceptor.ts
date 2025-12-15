import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, switchMap } from "rxjs";
import { FormsService } from "src/forms/forms.service";
import { NamedPlace, NamedPlaceUnitsFiltered } from "./named-places.dto";
import { serializeInto } from "src/serialization/serialization.utils";
import { applyToResult } from "src/pagination.utils";

@Injectable()
export class FilterUnitsInterceptor implements NestInterceptor {

	constructor(private formsService: FormsService) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		return next.handle().pipe(switchMap(applyToResult(this.filterUnits.bind(this))));
	}

	private async filterUnits(place: NamedPlace): Promise<NamedPlace | NamedPlaceUnitsFiltered> {
		const includeUnits = place.collectionID
			&& await this.formsService.findFor(place.collectionID,
				f => f.options.namedPlaceOptions?.includeUnits
			);

		return includeUnits
			? place
			: serializeInto(NamedPlaceUnitsFiltered)(place);
	}
}

