import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { APP_FILTER } from '@nestjs/core';
import { HttpModule } from '@nestjs/axios';
import { ProxyToOldApiFilter } from './proxy-to-old-api/proxy-to-old-api.filter';
import { ProxyToOldApiService } from './proxy-to-old-api/proxy-to-old-api.service';
import { AppController } from './app.controller';
import { FormsModule } from './forms/forms.module';
import { ConfigModule } from "@nestjs/config";

@Module({
	imports: [HttpModule, ConfigModule.forRoot({isGlobal: true}), FormsModule],
	controllers: [AppController],
	providers: [
		AppService,
		ProxyToOldApiService,
		{
			provide: APP_FILTER,
			useClass: ProxyToOldApiFilter
		}
	],
})
export class AppModule {}
