import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { getLang } from "src/interceptors/translator.interceptor";

/**
 * Populates a Person instance to the decorated parameter. The request must have `personToken` in the query or in the
 * path params. By default, the person token is required and if it's missing, a 400 error is thrown.
 *
 * @param config ({ required = true })
 * */
export const RequestLang = createParamDecorator((_, ctx: ExecutionContext) => {
	return getLang(ctx.switchToHttp().getRequest());
});
