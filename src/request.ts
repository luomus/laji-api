import { Request as _Request } from "express";
import { Person } from "./persons/person.dto";
import { ApiUsersService } from "./api-users/api-users.service";

export type Request = _Request & {
	person?: Person;
	accessToken: string;
	apiUsersService: ApiUsersService;
}
