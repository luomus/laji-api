import { HttpException, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AccessTokenService } from "src/access-token/access-token.service";
import { ApiUserEntity } from "./api-user.entity";
import { Repository, DataSource } from "typeorm";
import { MailService } from "src/mail/mail.service";
import { serializeInto } from "src/serializing/serializing";

@Injectable()
export class ApiUsersService {

	private logger = new Logger(ApiUsersService.name);

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

		// Do database operation in one transaction. Email is sent before commiting, because if the email sending fails, we
		// don't want to commit the transaction as it can't be rolled then anymore.
		try {
			await queryRunner.connect();
			await queryRunner.startTransaction();
			const createdApiUser = await queryRunner.manager.save(apiUser);
			const accessTokenEntity = this.accessTokenService.getNewForUser(createdApiUser);
			await queryRunner.manager.save(accessTokenEntity);
			await this.mailService.sendApiUserCreated({ emailAddress: apiUser.email }, accessTokenEntity.id);
		} catch (e) {
			await queryRunner.rollbackTransaction();
			await queryRunner.release();
			this.logger.error(e);
			throw e;
		}

		// Commit the transaction after succesfully sending email. If it fails, we send an email to the user and ourselves
		// that the api user creation actually failed.
		try {
			await queryRunner.commitTransaction();
		} catch (e) {
			this.logger.fatal(e, { emailAddress: apiUser.email });
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
