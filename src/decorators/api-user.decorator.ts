import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "src/request";

/** Populates an AccessTokenEntity instance to the decorated parameter from the access token query param. */
export const ApiUser = createParamDecorator((data: never, ctx: ExecutionContext) => {
	const { apiUser } = ctx.switchToHttp().getRequest<Request>();
	if (!apiUser) {
		// eslint-disable-next-line max-len
		throw new Error("@ApiUser() decorator was used for a request without access token. The AccessTokenGuard should have binded it to the request. Did you bypass the access token check with @BypassAccessTokenAuth()?");
	}
	return apiUser;
});
