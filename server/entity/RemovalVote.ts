import { Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique, Column } from 'typeorm';
import { DbAwareColumn } from '@server/utils/DbColumnHelper';
import RemovalVoteSession from './RemovalVoteSession';
import { User } from './User';

export enum RemovalVoteValue {
  AGREE = 1,
  KEEP = 2,
}

@Entity()
@Unique('UQ_removal_vote_session_user', ['session', 'user'])
export class RemovalVote {
  @PrimaryGeneratedColumn()
  public id: number;

  @ManyToOne(() => RemovalVoteSession, (session) => session.votes, {
    onDelete: 'CASCADE',
  })
  @Index()
  public session: RemovalVoteSession;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @Index()
  public user: User;

  @Column({ type: 'int' })
  public vote: RemovalVoteValue;

  @DbAwareColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  public createdAt: Date;

  constructor(init?: Partial<RemovalVote>) {
    Object.assign(this, init);
  }
}

export default RemovalVote;
