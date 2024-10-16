import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AccessTokenEntity } from "./access-token.entity";
import { Request } from "express";
import { ApiUserEntity } from "src/api-users/api-user.entity";
import { serializeInto } from "src/serialization/serialization.utils";
import { uuid } from "src/utils";

@Injectable()
export class AccessTokenService {
	constructor(
		@InjectRepository(AccessTokenEntity) private accessTokenRepository: Repository<AccessTokenEntity>,
	) {}

	async findOne(id: string): Promise<AccessTokenEntity | null> {
		return this.accessTokenRepository.findOneBy({ id });
	}

	findAccessTokenFromRequest(request: Request): string | undefined {
		return (request.query.access_token as string) || request.headers.authorization;
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
