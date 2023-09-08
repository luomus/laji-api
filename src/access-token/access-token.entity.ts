import { Exclude } from "src/type-utils";
import { Entity, Column, CreateDateColumn, PrimaryColumn } from "typeorm";

@Entity({ name: "ACCESSTOKEN" })
export class AccessToken {
	@PrimaryColumn({ name: "ID" })
	id: string;

	@Column({ name: "USERID" })
	userId: number;

	@CreateDateColumn({ name: "CREATED" })
	created: Date = new Date();

	// TODO After we get rid of the old API, we should make the password column nullable
	// and remove it's usage. It's currently there only because old api dependency to loopback.
	// eslint-disable-next-line @typescript-eslint/no-inferrable-types
	@Exclude()
	@Column({ name: "TTL" })
	ttl: number = 1209600000;
}
