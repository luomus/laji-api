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

	// TODO After we get rid of the old API, we should make the password column nullable
	// and remove it's usage. It's currently there only because old api dependency to loopback.
	// eslint-disable-next-line @typescript-eslint/no-inferrable-types
	@Exclude()
	@Column({ name: "PASSWORD" })
	password: string = "noop";
}
