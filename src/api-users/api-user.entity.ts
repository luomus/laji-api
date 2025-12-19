import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	Index
} from "typeorm";

@Entity({ name: "api_user" })
export class ApiUserEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ name: "access_token" })
  accessToken: string;

  @Column()
  email: string;

  @Column({ name: "system_id", nullable: true })
  systemID?: string;

  @CreateDateColumn({ type: "datetime" })
  created: Date;
}
