import { createParamDecorator, ExecutionContext, HttpException } from "@nestjs/common";

type PersonTokenDecoratorConfig = {
	required?: boolean;
}

/**
 * Populates a Person instance to the decorated parameter. The request must have `personToken` in the query or in the
 * path params. By default, the person token is required and if it's missing, a 400 error is thrown.
 *
 * @param config ({ required = true })
 * */
export const PersonToken = createParamDecorator((data: PersonTokenDecoratorConfig = {}, ctx: ExecutionContext) => {
	const { required = true } = data;
	const { person } = ctx.switchToHttp().getRequest();
	if (!person && required) {
		throw new HttpException("personToken is required", 400);
	}
	return person;
});
