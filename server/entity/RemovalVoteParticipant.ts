import { DbAwareColumn } from '@server/utils/DbColumnHelper';
import { Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import RemovalVoteSession from './RemovalVoteSession';
import { User } from './User';

@Entity()
@Unique('UQ_removal_vote_participant_session_user', ['session', 'user'])
export class RemovalVoteParticipant {
  @PrimaryGeneratedColumn()
  public id: number;

  @ManyToOne(() => RemovalVoteSession, (session) => session.participants, {
    onDelete: 'CASCADE',
  })
  @Index()
  public session: RemovalVoteSession;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @Index()
  public user: User;

  @DbAwareColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  public createdAt: Date;

  constructor(init?: Partial<RemovalVoteParticipant>) {
    Object.assign(this, init);
  }
}

export default RemovalVoteParticipant;
