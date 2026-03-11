import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { getLangPreferences } from "src/lang/lang.utils";
import { firstFromNonEmptyArr } from "src/utils";

export const RequestLang = createParamDecorator((
	{ single = false }: { single?: boolean } = {},
	ctx: ExecutionContext
) => {
	const langPreferences = getLangPreferences(ctx.switchToHttp().getRequest())
	return single ? firstFromNonEmptyArr(langPreferences).lang : langPreferences;
}
);
