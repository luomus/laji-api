import { Module } from "@nestjs/common";
import { SoundIdentificationController } from "./sound-identification.controller";

@Module({
	providers: [],
	controllers: [SoundIdentificationController],
	exports: []
})
export class SoundIdentificationModule {}
