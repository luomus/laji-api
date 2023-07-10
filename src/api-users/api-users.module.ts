import { Module } from "@nestjs/common";
import { ApiUsersService } from "./api-users.service";
import { ApiUsersController } from "./api-users.controller";
import { AccessTokenModule } from "src/access-token/access-token.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ApiUser } from "./api-user.entity";
import {MailModule} from "src/mail/mail.module";
import {AccessToken} from "src/access-token/access-token.entity";

@Module({
	imports: [
		TypeOrmModule.forFeature([ApiUser]),
		TypeOrmModule.forFeature([AccessToken]),
		AccessTokenModule,
		MailModule
	],
	providers: [ApiUsersService],
	controllers: [ApiUsersController]
})
export class ApiUsersModule {}
