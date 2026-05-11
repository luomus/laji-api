import { ConfigService } from "@nestjs/config";
import { createApp } from "./create-app";

void (async () => {
	const app = await createApp();
	const port = app.get(ConfigService).get("PORT") || 3005;
	await app.listen(port, "0.0.0.0");
})();
