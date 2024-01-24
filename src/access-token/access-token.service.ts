import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AccessToken } from "./access-token.entity";
import { Request } from "express";
import { ApiUser } from "src/api-users/api-user.entity";
import { serializeInto } from "src/serializing/serializing";
import { uuid } from "src/utils";

@Injectable()
export class AccessTokenService {
	constructor(
		@InjectRepository(AccessToken) private accessTokenRepository: Repository<AccessToken>,
	) {}

	async findOne(id: string): Promise<AccessToken | null> {
		return this.accessTokenRepository.findOneBy({ id });
	}

	findAccessTokenFromRequest(request: Request): string | undefined {
		return (request.query.access_token as string) || request.headers.authorization;
	}

	findByUserID(userId: number): Promise<AccessToken | null> {
		return this.accessTokenRepository.findOneBy({ userId });
	}

	/**
	 * Creates a new entity without saving it to the database yet.
	 * The client of this method is responsible for the database transaction.
	 */
	getNewForUser(user: Pick<ApiUser, "id">): AccessToken {
		return this.getNew({ userId: user.id });
	}

	private getNew(accessTokenEntity: Omit<AccessToken, "id" | "created" | "ttl">): AccessToken {
		const id = uuid(64);
		return serializeInto(AccessToken)({ ...accessTokenEntity, id });
	}
}
