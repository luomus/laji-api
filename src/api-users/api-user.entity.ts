import { Exclude } from "src/type-utils";
import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "APIUSER" })
export class ApiUser {

	@Exclude()
	@PrimaryGeneratedColumn({ name: "ID" })
	id: number;

	@Column({ name: "EMAIL" })
	email: string;

	@Column({ name: "SYSTEMID" })
	systemID?: string;

	@Column({ name: "FEEDBACKEMAIL" })
	feedbackEmail?: string;

	@Exclude()
	@Column({ name: "PASSWORD" })
	password?: string;
}
