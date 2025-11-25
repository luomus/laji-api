import { Module } from "@nestjs/common";
import { LoginController } from "./login.controller";
import { LoginService } from "./login.service";
import { LajiAuthClientModule } from "src/laji-auth-client/laji-auth-client.module";

@Module({
	imports: [LajiAuthClientModule],
	controllers: [LoginController],
	providers: [LoginService]
})
export class LoginModule {}
