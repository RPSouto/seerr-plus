import { DbAwareColumn } from '@server/utils/DbColumnHelper';
import { Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';
import Media from './Media';
import MovieClubSession from './MovieClubSession';
import MovieClubVote from './MovieClubVote';

@Entity()
@Unique('UQ_movie_club_candidate_session_media', ['session', 'media'])
export class MovieClubCandidate {
  @PrimaryGeneratedColumn()
  public id: number;

  @ManyToOne(() => MovieClubSession, (session) => session.candidates, { onDelete: 'CASCADE' })
  @Index()
  public session: MovieClubSession;

  @ManyToOne(() => Media, { eager: true, onDelete: 'CASCADE' })
  @Index()
  public media: Media;

  @OneToMany(() => MovieClubVote, (vote) => vote.candidate)
  public votes: MovieClubVote[];

  @DbAwareColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  public createdAt: Date;

  constructor(init?: Partial<MovieClubCandidate>) {
    Object.assign(this, init);
  }
}

export default MovieClubCandidate;
