import { Module } from "@nestjs/common";
import { AbstractMediaService } from './abstract-media.service';
import { TriplestoreModule } from '../triplestore/triplestore.module';

@Module({
    imports: [TriplestoreModule],
    controllers: [],
    providers: [AbstractMediaService],
    exports: [AbstractMediaService]
})
export class AbstractMediaModule {}
