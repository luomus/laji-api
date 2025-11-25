import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AccessTokenEntity } from "./access-token.entity";
import { Request } from "express";
import { ApiUserEntity } from "src/api-users/api-user.entity";
import { serializeInto } from "src/serialization/serialization.utils";
import { LocalizedException, uuid } from "src/utils";

@Injectable()
export class AccessTokenService {
	constructor(
		@InjectRepository(AccessTokenEntity) private accessTokenRepository: Repository<AccessTokenEntity>,
	) {}

	async findOne(id: string): Promise<AccessTokenEntity | null> {
		return this.accessTokenRepository.findOneBy({ id });
	}

	findByUserID(userId: number): Promise<AccessTokenEntity | null> {
		return this.accessTokenRepository.findOneBy({ userId });
	}

	/**
	 * Creates a new entity without saving it to the database yet.
	 * The client of this method is responsible for the database transaction.
	 */
	getNewForUser(user: Pick<ApiUserEntity, "id">): AccessTokenEntity {
		return this.getNew({ userId: user.id });
	}

	private getNew(accessTokenEntity: Omit<AccessTokenEntity, "id" | "created" | "ttl">): AccessTokenEntity {
		const id = uuid(64);
		return serializeInto(AccessTokenEntity)({ ...accessTokenEntity, id });
	}
}

export const findAccessTokenFromRequest = (request: Request): string | undefined => {
	if (request.query.access_token) {
		if (request.headers["api-version"] === "1") {
			// eslint-disable-next-line max-len
			throw new LocalizedException("BAD_ACCESS_TOKEN_SIGNATURE", 422);
		}
		return request.query.access_token as string;
	}
	const { authorization } = request.headers;
	if (authorization) {
		return authorization.replace("Bearer ", "").replace("bearer ", "");
	}
	return (request.query.access_token as string) || request.headers.authorization;
};
