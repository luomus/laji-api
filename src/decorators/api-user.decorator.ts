import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "src/request";

/** Populates an AccessTokenEntity instance to the decorated parameter from the access token query param. */
export const ApiUser = createParamDecorator((data: never, ctx: ExecutionContext) => {
	const { accessToken, apiUsersService } = ctx.switchToHttp().getRequest<Request>();
	return apiUsersService.getByAccessToken(accessToken);
});
