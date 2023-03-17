import { Injectable } from "@nestjs/common";
import { of, switchMap } from "rxjs";
import { rethrowHttpException } from "src/rest-client/rest-client.service";
import { StoreService } from "src/store/store.service";

@Injectable()
export class ProfileService {
	constructor(
		private storeService: StoreService) {}

	getProfileByPersonId(personId: string) {
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
}
