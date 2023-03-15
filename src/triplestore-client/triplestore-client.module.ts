import { Module } from "@nestjs/common";
import { TriplestoreClientService } from "./triplestore-client.service";

@Module({
	providers: [TriplestoreClientService]
})
export class TriplestoreClientModule {}
