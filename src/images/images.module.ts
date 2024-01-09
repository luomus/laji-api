import { Module } from "@nestjs/common";
import { ImagesController } from './images.controller';
import { AbstractMediaModule } from '../abstract-media/abstract-media.module';
import { PersonTokenModule } from '../person-token/person-token.module';

@Module({
    imports: [AbstractMediaModule, PersonTokenModule],
    controllers: [ImagesController],
    providers: [],
    exports: []
})
export class ImagesModule {}
