import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AccessToken } from "./access-token.entity";

@Injectable()
export class AccessTokenService {
	constructor(
		@InjectRepository(AccessToken)
		private accessTokenRepository: Repository<AccessToken>,
	) {}

	findOne(id: string) {
		return this.accessTokenRepository.findOneBy({ id });
	}
}
