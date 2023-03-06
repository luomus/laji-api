import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { HttpModule } from "@nestjs/axios";
import { ProxyToOldApiFilter } from "./proxy-to-old-api/proxy-to-old-api.filter";
import { ProxyToOldApiService } from "./proxy-to-old-api/proxy-to-old-api.service";
import { AppController } from "./app.controller";
import { FormsModule } from "./forms/forms.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccessToken } from "./access-token/access-token.entity";
import { AccessTokenModule } from "./access-token/access-token.module";

@Module({
	imports: [
		HttpModule,
		ConfigModule.forRoot({isGlobal: true}),
		TypeOrmModule.forRootAsync({
			imports: [ConfigModule],
			useFactory: (configService: ConfigService) => ({
				type: "oracle",
				connectString: configService.get("ORACLE_TNS"),
				username: configService.get("ORACLE_USER"),
				password: configService.get("ORACLE_PASS"),
				synchronize: false,
				retryAttempts: 100,
				retryDelay: 3000,
				entities: [AccessToken]
			}),
			inject: [ConfigService]
		}),
		FormsModule,
		AccessTokenModule
	],
	controllers: [AppController],
	providers: [
		ProxyToOldApiService,
		{
			provide: APP_FILTER,
			useClass: ProxyToOldApiFilter
		}
	],
})
export class AppModule {}
