import { Module } from "@nestjs/common";
import { AuthenticationEventService } from "./authentication-event.service";
import { PersonTokenController } from "./authentication-event.controller";
import { LajiAuthClientModule } from "src/laji-auth-client/laji-auth-client.module";

@Module({
	imports: [LajiAuthClientModule],
	providers: [AuthenticationEventService],
	exports: [AuthenticationEventService],
	controllers: [PersonTokenController]
})
export class PersonTokenModule {}
