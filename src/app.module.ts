import { Module, ValidationPipe } from "@nestjs/common";
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { HttpModule } from "@nestjs/axios";
import { ProxyToOldApiFilter } from "./proxy-to-old-api/proxy-to-old-api.filter";
import { ProxyToOldApiService } from "./proxy-to-old-api/proxy-to-old-api.service";
import { AppController } from "./app.controller";
import { FormsModule } from "./forms/forms.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccessToken } from "./access-token/access-token.entity";
import { AccessTokenModule } from "./access-token/access-token.module";
import { PersonsModule } from "./persons/persons.module";
import { LajiAuthClientService } from "./laji-auth-client/laji-auth-client.service";
import { LajiAuthClientModule } from "./laji-auth-client/laji-auth-client.module";
import { PersonTokenModule } from "./person-token/person-token.module";
import { TriplestoreModule } from "./triplestore/triplestore.module";
import { ProfileModule } from "./profile/profile.module";
import { StoreModule } from "./store/store.module";
import { MetadataModule } from "./metadata/metadata.module";
import { TriplestoreClientModule } from "./triplestore/client/triplestore-client.module";
import { TriplestoreReadonlyClientModule } from "./triplestore/readonly-client/triplestore-readonly-client.module";
import { SerializingInterceptor } from "./serializing/serializing.interceptor";
import { NotificationsModule } from "./notifications/notifications.module";
import { HttpClientErrorToHttpExceptionInterceptor }
	from "./http-client-error-to-http-exception/http-client-error-to-http-exception.interceptor";

@Module({
	imports: [
		HttpModule,
		ConfigModule.forRoot({ isGlobal: true }),
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
		AccessTokenModule,
		PersonsModule,
		LajiAuthClientModule,
		PersonTokenModule,
		TriplestoreModule,
		TriplestoreClientModule,
		TriplestoreReadonlyClientModule,
		ProfileModule,
		StoreModule,
		MetadataModule,
		NotificationsModule
	],
	controllers: [AppController],
	providers: [
		ProxyToOldApiService,
		{
			provide: APP_FILTER,
			useClass: ProxyToOldApiFilter
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: SerializingInterceptor
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: HttpClientErrorToHttpExceptionInterceptor
		},
		{
			provide: APP_PIPE,
			useValue: new ValidationPipe({ transform: true })
		},
		LajiAuthClientService
	],
})
export class AppModule {}
