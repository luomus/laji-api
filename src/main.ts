import { ConfigService } from "@nestjs/config";
import { createApp } from "./create-app";

async function bootstrap() {
	const app = await createApp();
	const port = app.get(ConfigService).get("PORT") || 3004;
	await app.listen(port, "0.0.0.0");
}
void bootstrap();
