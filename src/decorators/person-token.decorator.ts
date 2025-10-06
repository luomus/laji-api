import { createParamDecorator, ExecutionContext, HttpException } from "@nestjs/common";

export type PersonTokenDecoratorConfig = {
	/** Defaults to true */
	required?: boolean;
}

export const personTokenMethods: {
	// eslint-disable-next-line @typescript-eslint/ban-types
	controllerClass: Function,
	// eslint-disable-next-line @typescript-eslint/ban-types
	controllerClassMethod: Function,
	personTokenConfig: PersonTokenDecoratorConfig
}[] = [];

/**
 * Populates a Person instance to the decorated parameter. The request must have `personToken` in the query or in the
 * path params. By default, the person token is required and if it's missing, a 400 error is thrown.
 *
 * @param config ({ required = true })
 * */
const PersonTokenRuntime = createParamDecorator((data: PersonTokenDecoratorConfig = {}, ctx: ExecutionContext) => {
	const { required = true } = data;
	const { person } = ctx.switchToHttp().getRequest();
	if (!person && required) {
		throw new HttpException("personToken is required", 400);
	}
	return person;
});

export function PersonToken(data?: PersonTokenDecoratorConfig) {
	return (target: any, propertyKey: string, parameterIndex: number) => {
		personTokenMethods.push({
			controllerClass: target.constructor,
			controllerClassMethod: (target as any)[propertyKey],
			personTokenConfig: data || {}
		});
		PersonTokenRuntime(data)(target, propertyKey, parameterIndex);
	};
}
