import { HttpException, Injectable } from "@nestjs/common";
import { StoreService } from "src/store/store.service";
import { NamedPlace } from "./named-places.dto";
import { PersonsService } from "src/persons/persons.service";
import { storePageAdapter } from "src/pagination";
import { or, and, StoreQuery, StoreQueryMapLiteral } from "src/store/store-query";

@Injectable()
export class NamedPlacesService {

	private store = this.storeService.forResource<NamedPlace>("namedPlace");

	constructor(
		private storeService: StoreService,
		private personsService: PersonsService
	) {}

	async getPage(
		query: StoreQueryMapLiteral<NamedPlace, "AND">,
		personToken?: string,
		includePublic?: boolean,
		page?: number,
		pageSize = 20,
		selectedFields?: (keyof NamedPlace)[]
	) {
		let storeQuery: StoreQuery<NamedPlace>;

		if (personToken) {
			const person = await this.personsService.getByToken(personToken);
			const readAllowedClause = or<NamedPlace>({ owners: person.id, editors: person.id });
			if (includePublic) {
				readAllowedClause.public = true;
			}
			storeQuery = and(query, readAllowedClause);
		} else {
			query.public = true;
			storeQuery = query;
		}

		return storePageAdapter(await this.store.getPage(storeQuery, page, pageSize, selectedFields));
	}

	async get(id: string, personToken?: string) {
		const place = await this.store.get(id);

		if (place.public) {
			return place;
		}

		if (!personToken) {
			throw new HttpException("You must provide a personToken when fetching private named places", 403);
		}

		const person = await this.personsService.getByToken(personToken);

		if (!place.isEditableFor(person)) {
			throw new HttpException("You are not an editor or an owner of the place", 403);
		}

		return place;
	}
}
