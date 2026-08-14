import { DbAwareColumn } from '@server/utils/DbColumnHelper';
import {
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { MediaRequest } from './MediaRequest';
import { User } from './User';

@Entity()
@Unique('UQ_seerrplus_request_user', ['request', 'user'])
export class MediaRequestParticipant {
  @PrimaryGeneratedColumn()
  public id: number;

  @ManyToOne(() => MediaRequest, (request) => request.participants, {
    onDelete: 'CASCADE',
  })
  @Index('IDX_seerrplus_participant_request')
  public request: MediaRequest;

  @ManyToOne(() => User, (user) => user.requestParticipations, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @Index('IDX_seerrplus_participant_user')
  public user: User;

  @DbAwareColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  public createdAt: Date;

  constructor(init?: Partial<MediaRequestParticipant>) {
    Object.assign(this, init);
  }
}

export default MediaRequestParticipant;
