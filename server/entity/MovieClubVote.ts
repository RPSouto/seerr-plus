import { DbAwareColumn } from '@server/utils/DbColumnHelper';
import { Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import MovieClubCandidate from './MovieClubCandidate';
import MovieClubSession from './MovieClubSession';
import { User } from './User';

@Entity()
@Unique('UQ_movie_club_vote_session_user', ['session', 'user'])
export class MovieClubVote {
  @PrimaryGeneratedColumn()
  public id: number;

  @ManyToOne(() => MovieClubSession, (session) => session.votes, { onDelete: 'CASCADE' })
  @Index()
  public session: MovieClubSession;

  @ManyToOne(() => MovieClubCandidate, (candidate) => candidate.votes, { eager: true, onDelete: 'CASCADE' })
  @Index()
  public candidate: MovieClubCandidate;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @Index()
  public user: User;

  @DbAwareColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  public createdAt: Date;

  constructor(init?: Partial<MovieClubVote>) {
    Object.assign(this, init);
  }
}

export default MovieClubVote;
