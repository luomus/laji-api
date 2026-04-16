import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { getLangPreferences } from "src/lang/lang.utils";
import { firstFromNonEmptyArr } from "src/utils";

type Params = {
	/** Return only the dominating lang as Lang */
	single?: boolean
}

/** Returns lang preferences from the Accept-Language header as `Lang[]`. Use `single` argument to fetch only the dominant
 * language as `Lang` */
export const RequestLang = createParamDecorator((
	{ single = false }: Params = {},
	ctx: ExecutionContext
) => {
	const langPreferences = getLangPreferences(ctx.switchToHttp().getRequest());
	return single ? firstFromNonEmptyArr(langPreferences).lang : langPreferences;
}
);
