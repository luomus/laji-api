import { Module, forwardRef } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccessTokenEntity } from "./access-token.entity";
import { AccessTokenGuard } from "./access-token.guard";
import { AccessTokenService } from "./access-token.service";
import { ApiUsersModule } from "src/api-users/api-users.module";

@Module({
	imports: [TypeOrmModule.forFeature([AccessTokenEntity]), forwardRef(() => ApiUsersModule)],
	providers: [
		AccessTokenService,
		// Guards are applied globally, even though provided in this module.
		// We provide it here so it can use dependency injected AccessTokenService.
		{
			provide: APP_GUARD,
			useClass: AccessTokenGuard
		}
	],
	exports: [AccessTokenService]
})
export class AccessTokenModule {}
