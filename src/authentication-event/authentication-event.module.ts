import { Module } from "@nestjs/common";
import { PersonTokenService } from "./authentication-event.service";
import { PersonTokenController } from "./authentication-event.controller";
import { LajiAuthClientModule } from "src/laji-auth-client/laji-auth-client.module";

@Module({
	imports: [LajiAuthClientModule],
	providers: [PersonTokenService],
	exports: [PersonTokenService],
	controllers: [PersonTokenController]
})
export class PersonTokenModule {}
