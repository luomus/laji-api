import { Injectable } from "@nestjs/common";
import { of, switchMap } from "rxjs";
import {PersonTokenService} from "src/person-token/person-token.service";
import { rethrowHttpException } from "src/rest-client/rest-client.service";
import { StoreService } from "src/store/store.service";

@Injectable()
export class ProfileService {
	constructor(
		private storeService: StoreService,
		private personTokenService: PersonTokenService) {}

	findProfileByPersonId(personId: string) {
		return this.storeService.query("profile", `userID:"${personId}"`).pipe(
			switchMap(({ member }) => {
				//TODO should create profile.
				if (!member.length) {
					throw new Error("unimplemented profile create");
				}
				return of(member[0]);
			}),
			rethrowHttpException()
		);
	}

	findProfileByPersonToken(personToken: string) {
		return this.personTokenService.getInfo(personToken).pipe(switchMap(({ personId }) =>
			this.findProfileByPersonId(personId))
		);
	}
}
