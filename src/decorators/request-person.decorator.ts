import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { LocalizedException } from "src/utils";

export type RequestPersonDecoratorConfig = {
	/** Defaults to true */
	required?: boolean;
	/** Will be displayed in the swagger UI for the person token parameter */
	description?: string;
}

export const personTokenMethods: {
	// eslint-disable-next-line @typescript-eslint/ban-types
	controllerClass: Function,
	// eslint-disable-next-line @typescript-eslint/ban-types
	controllerClassMethod: Function,
	personTokenConfig: RequestPersonDecoratorConfig
}[] = [];

/**
 * Populates a Person instance to the decorated parameter. The request must have `personToken` in the query or in the
 * path params. By default, the person token is required and if it's missing, a 400 error is thrown.
 *
 * @param config ({ required = true })
 * */
const RequestPersonRuntime = createParamDecorator((data: RequestPersonDecoratorConfig = {}, ctx: ExecutionContext) => {
	const { required = true } = data;
	const { person } = ctx.switchToHttp().getRequest();
	if (!person && required) {
		throw new LocalizedException("PERSON_TOKEN_IS_REQUIRED", 400);
	}
	return person;
});

export function RequestPerson(data?: RequestPersonDecoratorConfig) {
	return (target: any, propertyKey: string, parameterIndex: number) => {
		personTokenMethods.push({
			controllerClass: target.constructor,
			controllerClassMethod: (target as any)[propertyKey],
			personTokenConfig: data || {}
		});
		RequestPersonRuntime(data)(target, propertyKey, parameterIndex);
	};
}
