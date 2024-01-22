import { Module } from "@nestjs/common";
import { AudioController } from "./audio.controller";
import { AbstractMediaModule } from "../abstract-media/abstract-media.module";

@Module({
	imports: [AbstractMediaModule],
	controllers: [AudioController]
})
export class AudioModule {}
