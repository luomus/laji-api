import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, switchMap } from "rxjs";
import { Request } from "express";
import { FormsService } from "src/forms/forms.service";
import { NamedPlace, NamedPlaceUnitsFiltered } from "./named-places.dto";
import { serializeInto } from "src/serialization/serialization.utils";
import { applyToResult } from "src/pagination.utils";

@Injectable()
export class FilterUnitsInterceptor implements NestInterceptor {

	constructor(private formsService: FormsService) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const request = context.switchToHttp().getRequest<Request>();
		const { includeUnits } = request.query as unknown as { includeUnits: boolean };

		return next.handle().pipe(switchMap(applyToResult(this.filterUnits(includeUnits))));
	}

	private filterUnits(includeUnits: boolean) {
		return async (place: NamedPlace): Promise<NamedPlace | NamedPlaceUnitsFiltered> => {
			const shouldIncludeUnits = includeUnits
			&& place.collectionID
			&& await this.formsService.findFor(place.collectionID,
				f => f.options.namedPlaceOptions?.includeUnits
			);

			return shouldIncludeUnits
				? place
				: serializeInto(NamedPlaceUnitsFiltered)(place);
		};
	}
}

