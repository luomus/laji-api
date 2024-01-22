import { Controller, applyDecorators } from "@nestjs/common";
import { ApiSecurity } from "@nestjs/swagger";
import { SerializeScanner } from "src/serializing/serialize.decorator";
import { SwaggerRemoteScanner } from "src/swagger/swagger-remote.decorator";

/**
 * Makes the class a controller with our access token auth and allows usage of some of our custom decorators
 */
export function LajiApiController(prefix: string | string[]) {
	return applyDecorators(
		ApiSecurity("access_token"),
		Controller(prefix),
		SwaggerRemoteScanner(), // @SwaggerRemoteRef() doesn't work without this controller level decorator
		SerializeScanner(), // @Serialize() swagger changes doesn't work without this controller level decorator
	);
}
