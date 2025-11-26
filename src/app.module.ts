import { HttpModule } from "@nestjs/axios";
import { Module, ValidationPipe } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccessTokenEntity } from "./access-token/access-token.entity";
import { AccessTokenModule } from "./access-token/access-token.module";
import { AppController } from "./app.controller";
import { FormsModule } from "./forms/forms.module";
import { LajiAuthClientModule } from "./laji-auth-client/laji-auth-client.module";
import { LajiAuthClientService } from "./laji-auth-client/laji-auth-client.service";
import { MetadataModule } from "./metadata/metadata.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { PersonTokenModule } from "./authentication-event/authentication-event.module";
import { PersonsModule } from "./persons/persons.module";
import { ProfileModule } from "./profile/profile.module";
import { ProxyToOldApiFilter } from "./proxy-to-old-api/proxy-to-old-api.filter";
import { ProxyToOldApiService } from "./proxy-to-old-api/proxy-to-old-api.service";
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
	from "./filters/error-signature-backward-compatibility.filter";
import { PersonTokenInterceptor } from "./interceptors/person-token.interceptor";
import { AnnotationsModule } from "./annotations/annotations.module";
import { InformationModule } from "./information/information.module";
import { ChecklistModule } from "./checklist/checklist.module";
import { ChecklistVersionsModule } from "./checklist-versions/checklist-versions.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { LoggerInterceptor } from "./interceptors/logger.interceptor";
import { ConsoleLoggerModule } from "./console-logger/console-logger.module";
import { InformalTaxonGroupsModule } from "./informal-taxon-groups/informal-taxon-groups.module";
import { ErrorLoggerFilter } from "./filters/error-logger.filter";
import { GlobalRestClientModule } from "./rest-client/global-rest-client.module";
import { InstanceToPlainInterceptor } from "./interceptors/instance-to-plain.interceptor";
import { JsonLdModule } from "./json-ld/json-ld.module";
import { SoundIdentificationModule } from "./sound-identification/sound-identifiation.module";
import { AutocompleteModule } from "./autocomplete/autocomplete.module";
import { ShorthandModule } from "./shorthand/shorthand.module";
import { CoordinatesModule } from "./coordinates/coordinates.module";
import { FeedbackModule } from "./feedback/feedback.module";
import { GeoConvertModule } from "./geo-convert/geo-convert.module";
import { HtmlToPdfModule } from "./html-to-pdf/html-to-pdf.module";
import { LocalizerExceptionFilter } from "./filters/localize-exception.filter";
import { ValidatorErrorFormatFilter } from "./documents/validatior-error-format/validatior-error-format.filter";
import { AxiosErrorFilter } from "./filters/axios-error.filter";
import { StoreValidationFilter } from "./filters/store-validation.filter";
import { FormPermissionsModule } from "./form-permissions/form-permissions.module";
import { LoggerModule } from "./logger/logger.module";
import { SourcesModule } from "./sources/sources.module";
import { RedListEvaluationGroupsModule } from "./red-list-evaluation-groups/red-list-evaluation-groups.module";
import { LoginModule } from "./login/login.module";
import { PublicationsModule } from "./publications/publications.module";
import { NewsModule } from "./news/news.module";


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
		FormPermissionsModule,
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
		ConsoleLoggerModule,
		InformalTaxonGroupsModule,
		GlobalRestClientModule,
		JsonLdModule,
		SoundIdentificationModule,
		AutocompleteModule,
		ShorthandModule,
		CoordinatesModule,
		FeedbackModule,
		GeoConvertModule,
		HtmlToPdfModule,
		LoggerModule,
		SourcesModule,
		RedListEvaluationGroupsModule,
		LoginModule,
		PublicationsModule,
		NewsModule
	],
	controllers: [AppController],
	providers: [
		{
			provide: APP_INTERCEPTOR,
			useClass: LoggerInterceptor
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: InstanceToPlainInterceptor
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
		{
			provide: APP_FILTER,
			useClass: LocalizerExceptionFilter
		},
		{
			provide: APP_FILTER,
			useClass: ValidatorErrorFormatFilter
		},
		{
			provide: APP_FILTER,
			useClass: AxiosErrorFilter
		},
		{
			provide: APP_FILTER,
			useClass: StoreValidationFilter
		},
		ProxyToOldApiService,
		{
			provide: APP_FILTER,
			useClass: ProxyToOldApiFilter
		},
		LajiAuthClientService
	],
})
export class AppModule {}
