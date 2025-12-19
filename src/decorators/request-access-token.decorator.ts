import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { findAccessTokenFromRequest } from "src/api-users/access-token.guard";

export const RequestAccessToken = createParamDecorator((_, ctx: ExecutionContext) => {
	return findAccessTokenFromRequest(ctx.switchToHttp().getRequest());
});
