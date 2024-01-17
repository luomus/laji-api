import { Module } from "@nestjs/common";
import { ImagesController } from "./images.controller";
import { AbstractMediaModule } from "../abstract-media/abstract-media.module";

@Module({
	imports: [AbstractMediaModule],
	controllers: [ImagesController]
})
export class ImagesModule {}
