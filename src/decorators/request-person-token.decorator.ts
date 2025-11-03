import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { RequestPersonDecoratorConfig, personTokenMethods } from "./request-person.decorator";
import { LocalizedException } from "src/utils";

/**
 * Populates a Person instance to the decorated parameter. The request must have `personToken` in the query or in the
 * path params. By default, the person token is required and if it's missing, a 400 error is thrown.
 *
 * @param config ({ required = true })
 * */
const RequestPersonRuntime = createParamDecorator((data: RequestPersonDecoratorConfig = {}, ctx: ExecutionContext) => {
	const { required = true } = data;
	const { personToken } = ctx.switchToHttp().getRequest();
	if (!personToken && required) {
		throw new LocalizedException("PERSON_TOKEN_IS_REQUIRED", 400);
	}
	return personToken;
});

export function RequestPersonToken(data?: RequestPersonDecoratorConfig) {
	return (target: any, propertyKey: string, parameterIndex: number) => {
		personTokenMethods.push({
			controllerClass: target.constructor,
			controllerClassMethod: (target as any)[propertyKey],
			personTokenConfig: data || {}
		});
		RequestPersonRuntime(data)(target, propertyKey, parameterIndex);
	};
}
