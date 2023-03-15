import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "ACCESSTOKEN" })
export class AccessToken {
	@PrimaryGeneratedColumn({ name: "ID" })
	id: string;

	@Column({ name: "USERID" })
	userId: number;
}
