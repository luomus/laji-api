import { HttpException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AccessTokenService } from "src/access-token/access-token.service";
import { ApiUserEntity } from "./api-user.entity";
import { Repository, DataSource } from "typeorm";
import { MailService } from "src/mail/mail.service";
import { serializeInto } from "src/serializing/serializing";

@Injectable()
export class ApiUsersService {
	constructor(
		@InjectRepository(ApiUserEntity) private apiUserRepository: Repository<ApiUserEntity>,
		private accessTokenService: AccessTokenService,
		private mailService: MailService,
		private dataSource: DataSource
	) {}

	async getByAccessToken(accessToken: string): Promise<ApiUserEntity> {
		const token = await this.accessTokenService.findOne(accessToken);

		if (!token) {
			throw new HttpException("no data found with given token", 404);
		}

		const apiUser = await this.apiUserRepository.findOneBy({ id: token.userId });

		if (!apiUser) {
			throw new HttpException("No api user found for token", 404);
		}

		return apiUser;
	}

	async create(apiUserWithEmail: Pick<ApiUserEntity, "email">): Promise<void> {
		const apiUser = serializeInto(ApiUserEntity)(apiUserWithEmail);
		const existing = await this.findByEmail(apiUser.email);

		if (existing) {
			// eslint-disable-next-line max-len
			throw new HttpException("This email has been registered already. Use the /renew endpoint to request a new access token to your email.", 400);
		}

		const queryRunner = this.dataSource.createQueryRunner();

		try {
			await queryRunner.connect();
			await queryRunner.startTransaction();
			const createdApiUser = await queryRunner.manager.save(apiUser);
			const accessTokenEntity = this.accessTokenService.getNewForUser(createdApiUser);
			await queryRunner.manager.save(accessTokenEntity);
			await queryRunner.commitTransaction();
			await this.mailService.sendApiUserCreated({ emailAddress: apiUser.email }, accessTokenEntity.id);
		} catch (e) {
			await queryRunner.rollbackTransaction();
			throw e;
		} finally {
			await queryRunner.release();
		}
	}

	async renew(apiUserWithEmail: Pick<ApiUserEntity, "email">): Promise<void> {
		const apiUser = serializeInto(ApiUserEntity)(apiUserWithEmail);
		const existing = await this.findByEmail(apiUser.email);

		if (!existing) {
			// eslint-disable-next-line max-len
			throw new HttpException("This email hasn't been registered already. Use the create endpoint to create a new access token for your email.", 400);
		}

		const accessTokenEntity = await this.accessTokenService.findByUserID(existing.id);

		const queryRunner = this.dataSource.createQueryRunner();

		try {
			await queryRunner.connect();
			await queryRunner.startTransaction();
			if (accessTokenEntity) {
				await queryRunner.manager.remove(accessTokenEntity);
			}
			const newAccessTokenEntity = this.accessTokenService.getNewForUser(apiUser);
			await queryRunner.manager.save(newAccessTokenEntity);
			await queryRunner.commitTransaction();
			await this.mailService.sendApiUserCreated({ emailAddress: apiUser.email }, newAccessTokenEntity.id);
		} catch (e) {
			await queryRunner.rollbackTransaction();
			throw e;
		} finally {
			await queryRunner.release();
		}
	}

	private findByEmail(email: string): Promise<ApiUserEntity | null> {
		return this.apiUserRepository.findOneBy({ email });
	}
}
