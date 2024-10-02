import { Module, forwardRef } from "@nestjs/common";
import { ApiUsersService } from "./api-users.service";
import { ApiUsersController } from "./api-users.controller";
import { AccessTokenModule } from "src/access-token/access-token.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ApiUserEntity } from "./api-user.entity";
import { MailModule } from "src/mail/mail.module";
import { AccessTokenEntity } from "src/access-token/access-token.entity";

@Module({
	imports: [
		TypeOrmModule.forFeature([ApiUserEntity]),
		TypeOrmModule.forFeature([AccessTokenEntity]),
		forwardRef(() => AccessTokenModule),
		MailModule
	],
	providers: [ApiUsersService],
	controllers: [ApiUsersController],
	exports: [ApiUsersService]
})
export class ApiUsersModule {}
