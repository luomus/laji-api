import { HttpModule } from "@nestjs/axios";
import { Module, ValidationPipe } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccessTokenEntity } from "./access-token/access-token.entity";
import { AccessTokenModule } from "./access-token/access-token.module";
import { AppController } from "./app.controller";
import { FormsModule } from "./forms/forms.module";
import { HttpClientErrorToHttpExceptionInterceptor }
	from "./interceptors/http-client-error-to-http-exception.interceptor";
import { LajiAuthClientModule } from "./laji-auth-client/laji-auth-client.module";
import { LajiAuthClientService } from "./laji-auth-client/laji-auth-client.service";
import { MetadataModule } from "./metadata/metadata.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { PersonTokenModule } from "./person-token/person-token.module";
import { PersonsModule } from "./persons/persons.module";
import { ProfileModule } from "./profile/profile.module";
import { ProxyToOldApiFilter } from "./proxy-to-old-api/proxy-to-old-api.filter";
import { ProxyToOldApiService } from "./proxy-to-old-api/proxy-to-old-api.service";
import { SerializingInterceptor } from "./serialization/serializing.interceptor";
import { TriplestoreModule } from "./triplestore/triplestore.module";
import { CollectionsModule } from "./collections/collections.module";
import { LangModule } from "./lang/lang.module";
import { ScheduleModule } from "@nestjs/schedule";
import { MailModule } from "./mail/mail.module";
import { ApiUsersModule } from "./api-users/api-users.module";
import { ApiUserEntity } from "./api-users/api-user.entity";
import { SwaggerModule } from "./swagger/swagger.module";
import { ImagesModule } from "./images/images.module";
import { AudioModule } from "./audio/audio.module";
import { WarehouseModule } from "./warehouse/warehouse.module";
import { NamedPlacesModule } from "./named-places/named-places.module";
import { TaxaModule } from "./taxa/taxa.module";
import { AreaModule } from "./area/area.module";
import { DocumentsModule } from "./documents/documents.module";
import { TriplestoreReadonlyModule } from "./triplestore/triplestore-readonly.module";
import { RedisCacheModule } from "./redis-cache/redis-cache.module";
import { TraitModule } from "./trait/trait.module";
import { ErrorSignatureBackwardCompatibilityFilter }
	from "./error-signature-backward-compatibility/error-signature-backward-compatibility.filter";
import { PersonTokenInterceptor } from "./interceptors/person-token.interceptor";
import { AnnotationsModule } from "./annotations/annotations.module";
import { InformationModule } from "./information/information.module";
import { ChecklistModule } from "./checklist/checklist.module";
import { ChecklistVersionsModule } from "./checklist-versions/checklist-versions.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { LoggerInterceptor } from "./interceptors/logger.interceptor";
import { LoggerModule } from "./logger/logger.module";
import { InformalTaxonGroupsModule } from "./informal-taxon-groups/informal-taxon-groups.module";
import { ErrorLoggerFilter } from "./filters/error-logger.filter";

@Module({
	imports: [
		{
			...HttpModule.register({}),
			global: true
		},
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
				entities: [AccessTokenEntity, ApiUserEntity]
			}),
			inject: [ConfigService]
		}),
		RedisCacheModule,
		ScheduleModule.forRoot(),
		FormsModule,
		AccessTokenModule,
		PersonsModule,
		LajiAuthClientModule,
		PersonTokenModule,
		TriplestoreModule,
		TriplestoreReadonlyModule,
		ProfileModule,
		MetadataModule,
		NotificationsModule,
		CollectionsModule,
		LangModule,
		MailModule,
		ApiUsersModule,
		SwaggerModule,
		ImagesModule,
		AudioModule,
		WarehouseModule,
		NamedPlacesModule,
		TaxaModule,
		AreaModule,
		DocumentsModule,
		TraitModule,
		AnnotationsModule,
		InformationModule,
		ChecklistModule,
		ChecklistVersionsModule,
		OrganizationsModule,
		LoggerModule,
		InformalTaxonGroupsModule
	],
	controllers: [AppController],
	providers: [
		{
			provide: APP_INTERCEPTOR,
			useClass: LoggerInterceptor
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
			provide: APP_INTERCEPTOR,
			useClass: PersonTokenInterceptor
		},
		{
			provide: APP_PIPE,
			useValue: new ValidationPipe({ transform: true })
		},
		{
			provide: APP_FILTER,
			useClass: ErrorLoggerFilter
		},
		{
			provide: APP_FILTER,
			useClass: ErrorSignatureBackwardCompatibilityFilter
		},
		ProxyToOldApiService,
		{
			provide: APP_FILTER,
			useClass: ProxyToOldApiFilter
		},
		LajiAuthClientService,
	],
})
export class AppModule {}
