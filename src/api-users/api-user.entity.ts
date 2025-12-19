import { Exclude } from "class-transformer";
import { IsString } from "class-validator";
import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	Index
} from "typeorm";

@Entity({ name: "api_user" })
export class ApiUserEntity {

	@Exclude()
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ name: "access_token" })
  accessToken: string;

	@IsString()
  @Column()
  email: string;

  @Column({ name: "system_id", nullable: true })
  systemID?: string;

  @CreateDateColumn({ type: "datetime" })
  created: Date;
}
