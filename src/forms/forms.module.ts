import { Module } from "@nestjs/common";
import { FormsService } from "./forms.service";
import { FormsController } from "./forms.controller";
import { HttpModule } from "@nestjs/axios";

@Module({
	imports: [HttpModule],
	controllers: [FormsController],
	providers: [FormsService]
})
export class FormsModule {}
