import { Module } from "@nestjs/common";
import { AudioController } from "./audio.controller";
import { AbstractMediaModule } from "../abstract-media/abstract-media.module";
import { PersonTokenModule } from "../person-token/person-token.module";

@Module({
	imports: [AbstractMediaModule, PersonTokenModule],
	controllers: [AudioController]
})
export class AudioModule {}
