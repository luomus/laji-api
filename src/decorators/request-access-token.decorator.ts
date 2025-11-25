import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { findAccessTokenFromRequest } from "src/access-token/access-token.service";

export const RequestAccessToken = createParamDecorator((_, ctx: ExecutionContext) => {
	return findAccessTokenFromRequest(ctx.switchToHttp().getRequest());
});
