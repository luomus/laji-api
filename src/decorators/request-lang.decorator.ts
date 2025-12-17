import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { getLang } from "src/interceptors/translator.interceptor";

export const RequestLang = createParamDecorator((
	{ allowMulti = true }: { allowMulti?: boolean } = {},
	ctx: ExecutionContext
) => 
	getLang(ctx.switchToHttp().getRequest(), allowMulti)
);
