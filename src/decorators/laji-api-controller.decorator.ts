import { Controller, applyDecorators } from "@nestjs/common";
import { ApiSecurity } from "@nestjs/swagger";
import { SerializeScanner } from "src/serialization/serialize.decorator";
import { SwaggerRemoteScanner } from "src/swagger/swagger-remote.decorator";

/**
 * Makes the class a controller with our access token auth and enables usage of the following method decorators:
 *
 * *  `@SwaggerRemoteRef()`
 * *  `@Serialize()`
 */
export function LajiApiController(prefix: string | string[]) {
	return applyDecorators(
		ApiSecurity("access_token"),
		Controller(prefix),
		SwaggerRemoteScanner(), // @SwaggerRemoteRef() doesn't work without this controller level decorator
		SerializeScanner(), // @Serialize() swagger changes doesn't work without this controller level decorator
	);
}
