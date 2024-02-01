import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, switchMap } from "rxjs";
import { Request } from "express";
import { FormsService } from "src/forms/forms.service";
import { NamedPlace, NamedPlaceUnitsFiltered } from "./named-places.dto";
import { serializeInto } from "src/serializing/serializing";

@Injectable()
export class FilterUnitsInterceptor implements NestInterceptor {

	constructor(private formsService: FormsService) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const request = context.switchToHttp().getRequest<Request>();
		const { includeUnits } = request.query as unknown as { includeUnits: boolean };

		return next.handle().pipe(switchMap((place: NamedPlace) => this.filterUnits(place, includeUnits)));
	}

	private async filterUnits(place: NamedPlace, includeUnits: boolean): Promise<NamedPlace | NamedPlaceUnitsFiltered> {
		const shouldIncludeUnits = includeUnits && (await this.formsService.getAll()).find(f =>
			f.collectionID === place.collectionID
			&& f.options.namedPlaceOptions?.includeUnits
		);

		return shouldIncludeUnits
			? place
			: serializeInto(NamedPlaceUnitsFiltered)(place);
	}
}
