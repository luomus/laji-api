import { Module } from "@nestjs/common";
import { GoogleController } from "./google.controller";

@Module({
	controllers: [GoogleController]
})
export class GoogleModule {}
