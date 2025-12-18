import { Module } from "@nestjs/common";
import { ApiUsersService } from "./api-users.service";
import { ApiUsersController } from "./api-users.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ApiUserEntity } from "./api-user.entity";
import { MailModule } from "src/mail/mail.module";
import { APP_GUARD } from "@nestjs/core";
import { AccessTokenGuard } from "./access-token.guard";

@Module({
	imports: [
		TypeOrmModule.forFeature([ApiUserEntity]),
		MailModule
	],
	providers: [
		ApiUsersService,
		// Guards are applied globally, even though provided in this module.
		// We provide it here so it can use dependency injected AccessTokenService.
		{
			provide: APP_GUARD,
			useClass: AccessTokenGuard
		}
	],
	controllers: [ApiUsersController],
	exports: [ApiUsersService]
})
export class ApiUsersModule {}
