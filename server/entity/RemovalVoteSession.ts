import {
  Column,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DbAwareColumn } from '@server/utils/DbColumnHelper';
import Issue from './Issue';
import Media from './Media';
import RemovalVoteParticipant from './RemovalVoteParticipant';
import RemovalVote from './RemovalVote';
import { User } from './User';

export enum RemovalVoteSessionStatus {
  OPEN = 0,
  CLOSED = 1,
}

@Entity()
export class RemovalVoteSession {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ type: 'int', default: RemovalVoteSessionStatus.OPEN })
  public status: RemovalVoteSessionStatus;

  @ManyToOne(() => Media, { eager: true, onDelete: 'CASCADE' })
  @Index()
  public media: Media;

  @ManyToOne(() => Issue, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @Index()
  public issue?: Issue | null;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @Index()
  public createdBy: User;

  @Column({ type: 'boolean', default: false })
  public is4k: boolean;

  @Column({ type: 'varchar', nullable: true })
  public reason?: string | null;

  @Column({ type: 'text', nullable: true })
  public message?: string | null;

  @Column({ type: 'varchar', nullable: true })
  public displayTitle?: string | null;

  @OneToMany(() => RemovalVote, (vote) => vote.session, { cascade: true })
  public votes: RemovalVote[];

  @OneToMany(() => RemovalVoteParticipant, (participant) => participant.session, {
    cascade: true,
  })
  public participants: RemovalVoteParticipant[];

  @DbAwareColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  public createdAt: Date;

  constructor(init?: Partial<RemovalVoteSession>) {
    Object.assign(this, init);
  }
}

export default RemovalVoteSession;
