import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ApiUserEntity } from "./api-user.entity";
import { Repository } from "typeorm";
import { MailService } from "src/mail/mail.service";
import { serializeInto } from "src/serialization/serialization.utils";
import { CACHE_30_MIN, ErrorCodeException, uuid } from "src/utils";
import { IntelligentInMemoryCache, clearMemoization } from "src/decorators/intelligent-in-memory-cache.decorator";
import { RedisMemoize, clearRedisMemoization } from "src/decorators/redis-memoize.decorator";
import { IntelligentMemoize } from "src/decorators/intelligent-memoize.decorator";
import { RedisCacheService } from "src/redis-cache/redis-cache.service";

@Injectable()
@IntelligentInMemoryCache()
export class ApiUsersService {

	protected logger = new Logger(ApiUsersService.name);

	constructor(
		@InjectRepository(ApiUserEntity) private apiUserRepository: Repository<ApiUserEntity>,
		private mailService: MailService,
		private cache: RedisCacheService
	) { }

	// Cached in app memory for optimal performance and in redis for reboot survival.
	@IntelligentMemoize({ maxAge: CACHE_30_MIN })
	@RedisMemoize(CACHE_30_MIN)
	async getByAccessToken(accessToken: string): Promise<ApiUserEntity> {
		const apiUser = await this.apiUserRepository.findOneBy({ accessToken });

		if (!apiUser) {
			throw new ErrorCodeException("NO_API_USER_FOUND_FOR_TOKEN", 404);
		}

		return apiUser;
	}

	async create(email: string): Promise<void> {
		const apiUser = await this.findByEmail(email)
			|| serializeInto(ApiUserEntity)({ email });

		apiUser.accessToken = uuid(64);

		try {
			const createdApiUser = await this.apiUserRepository.save(apiUser);
			try {
				await this.mailService.sendApiUserCreated({ emailAddress: apiUser.email }, createdApiUser.accessToken);
			} catch (e) {
				this.logger.fatal(new Error("Failed to send email to API user"), apiUser);
			}
			clearMemoization(this);
			await clearRedisMemoization(this, this.cache);
		} catch (e) {
			this.logger.fatal(e, e.stack);
			throw e;
		}
	}

	private findByEmail(email: string): Promise<ApiUserEntity | null> {
		return this.apiUserRepository.findOneBy({ email });
	}
}
