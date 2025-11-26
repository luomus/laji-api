import { Module } from "@nestjs/common";
import { TraitController } from "./trait.controller";

@Module({
	controllers: [TraitController]
})
export class TraitModule {}
