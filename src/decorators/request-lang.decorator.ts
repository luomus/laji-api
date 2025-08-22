import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { getLang } from "src/interceptors/translator.interceptor";

export const RequestLang = createParamDecorator((_, ctx: ExecutionContext) => {
	return getLang(ctx.switchToHttp().getRequest());
});
