import { HttpModule } from "@nestjs/axios";
import { CacheModule } from "@nestjs/cache-manager";
import { Module, ValidationPipe } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { redisStore } from "cache-manager-redis-yet";
import { AccessToken } from "./access-token/access-token.entity";
import { AccessTokenModule } from "./access-token/access-token.module";
import { AppController } from "./app.controller";
import { FormsModule } from "./forms/forms.module";
import { HttpClientErrorToHttpExceptionInterceptor }
	from "./http-client-error-to-http-exception/http-client-error-to-http-exception.interceptor";
import { LajiAuthClientModule } from "./laji-auth-client/laji-auth-client.module";
import { LajiAuthClientService } from "./laji-auth-client/laji-auth-client.service";
import { MetadataModule } from "./metadata/metadata.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { PersonTokenModule } from "./person-token/person-token.module";
import { PersonsModule } from "./persons/persons.module";
import { ProfileModule } from "./profile/profile.module";
import { ProxyToOldApiFilter } from "./proxy-to-old-api/proxy-to-old-api.filter";
import { ProxyToOldApiService } from "./proxy-to-old-api/proxy-to-old-api.service";
import { SerializingInterceptor } from "./serializing/serializing.interceptor";
import { StoreModule } from "./store/store.module";
import { TriplestoreClientModule } from "./triplestore/client/triplestore-client.module";
import { TriplestoreReadonlyClientModule } from "./triplestore/readonly-client/triplestore-readonly-client.module";
import { TriplestoreModule } from "./triplestore/triplestore.module";
import { CollectionsModule } from "./collections/collections.module";
import { LangModule } from "./lang/lang.module";
import { ScheduleModule } from "@nestjs/schedule";
import { MailModule } from "./mail/mail.module";
import { ApiUsersModule } from "./api-users/api-users.module";
import { ApiUser } from "./api-users/api-user.entity";

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
				entities: [AccessToken, ApiUser]
				
			}),
			inject: [ConfigService]
		}),
		// https://github.com/dabroek/node-cache-manager-redis-store/issues/40#issuecomment-1383193211
		CacheModule.registerAsync({
			useFactory: async () => ({
				store: await redisStore({ ttl: 5000 })
			}),
			isGlobal: true
		}),
		ScheduleModule.forRoot(),
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
		NotificationsModule,
		CollectionsModule,
		LangModule,
		MailModule,
		ApiUsersModule
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
