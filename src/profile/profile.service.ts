import { HttpException, Injectable } from "@nestjs/common";
import { catchError, map, Observable, of, switchMap } from "rxjs";
import { PersonTokenService } from "src/person-token/person-token.service";
import { rethrowHttpException } from "src/rest-client/rest-client.service";
import { StoreService } from "src/store/store.service";
import { Profile } from "./profile.dto";
import * as crypto from "crypto";

@Injectable()
export class ProfileService {
	constructor(
		private storeService: StoreService,
		private personTokenService: PersonTokenService) {}

	/*
	 * Get a profile or creates one if person doesn't have a profile yet.
	 */
	getByPersonId(personId: string): Observable<Profile> {
		return this.findByPersonId(personId).pipe(switchMap(profile =>
			profile
				? of(profile)
				: this.create(personId, {})
		));
	}

	getByPersonToken(personToken: string) {
		return this.personTokenService.getInfo(personToken).pipe(switchMap(({ personId }) => {
			if (personId === null) {
				throw new HttpException("No personId found for personToken", 404);
			}
			return this.getByPersonId(personId);
		}));
	}

	/*
	 * Create new profile, if person has no profile.
	 */
	createWithPersonId(personId: string, profile: Partial<Profile>): Observable<Profile> {
		return this.findByPersonId(personId).pipe(
			catchError(e => {
				if (e.response?.status === 404) {
					return of(undefined);
				}
				throw e;
			}),
			switchMap((existingProfile?: Profile) => {
				if (existingProfile) {
					throw new HttpException("User already has a profile", 422);
				}
				profile.userID = personId;
				profile.profileKey = crypto.randomUUID().substr(0, 6);
				return this.create(personId, profile);
			})
		);
	}

	private create(personId: string,profile: Partial<Profile>) {
		profile.userID = personId;
		profile.profileKey = crypto.randomUUID().substr(0, 6);
		return this.storeService.create("profile", profile);
	}

	private findByPersonId(personId: string): Observable<Profile | undefined> {
		return this.storeService.query<Profile>("profile", `userID:"${personId}"`).pipe(
			map(({ member }) => member[0]),
			rethrowHttpException()
		);
	}
}
