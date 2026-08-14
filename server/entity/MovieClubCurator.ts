import { Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import MovieClubSession from './MovieClubSession';
import { User } from './User';

@Entity()
@Unique('UQ_movie_club_curator_session_user', ['session', 'user'])
export class MovieClubCurator {
  @PrimaryGeneratedColumn()
  public id: number;

  @ManyToOne(() => MovieClubSession, (session) => session.curators, {
    onDelete: 'CASCADE',
  })
  public session: MovieClubSession;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  public user: User;

  constructor(init?: Partial<MovieClubCurator>) {
    Object.assign(this, init);
  }
}

export default MovieClubCurator;
