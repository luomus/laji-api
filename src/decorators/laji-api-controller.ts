import { Controller, applyDecorators } from "@nestjs/common";
import { ApiSecurity } from "@nestjs/swagger";
import { SwaggerRemote } from "src/swagger/swagger-remote.decorator";

/**
 * Makes the class a controller with our access token auth and allows usage of some of our custom decorators
 */
export function LajiApiController(prefix: string | string[]) {
	return applyDecorators(
		ApiSecurity("access_token"),
		SwaggerRemote(), // SwaggerRemoteRef doesn't work without this controller level decorator
		Controller(prefix)
	)
}
