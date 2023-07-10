import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccessToken } from "./access-token.entity";
import { AccessTokenGuard } from "./access-token.guard";
import { AccessTokenService } from "./access-token.service";

@Module({
	imports: [TypeOrmModule.forFeature([AccessToken])],
	providers: [
		AccessTokenService,
		// Guards are applied globally, even though provided in this module.
		// We provide it here so it can use dependecy injected AccessTokenService.
		{
			provide: APP_GUARD,
			useClass: AccessTokenGuard
		}
	],
	exports: [AccessTokenService]
})
export class AccessTokenModule {}
