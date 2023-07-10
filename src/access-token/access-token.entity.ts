import { Entity, Column, CreateDateColumn, PrimaryColumn } from "typeorm";

@Entity({ name: "ACCESSTOKEN" })
export class AccessToken {
	@PrimaryColumn({ name: "ID" })
	id: string;

	@Column({ name: "USERID" })
	userId: number;

	@CreateDateColumn({ name: "CREATED" })
	created: Date = new Date();
}
