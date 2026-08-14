import { DbAwareColumn } from '@server/utils/DbColumnHelper';
import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import Media from './Media';
import { User } from './User';

@Entity()
@Unique('UQ_movie_club_suggestion_week_media_user', [
  'weekKey',
  'media',
  'user',
])
export class MovieClubSuggestion {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ type: 'varchar', length: 10 })
  @Index('IDX_movie_club_suggestion_week')
  public weekKey: string;

  @ManyToOne(() => Media, { onDelete: 'CASCADE' })
  @Index('IDX_movie_club_suggestion_media')
  public media: Media;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @Index('IDX_movie_club_suggestion_user')
  public user: User;

  @DbAwareColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  public createdAt: Date;

  constructor(init?: Partial<MovieClubSuggestion>) {
    Object.assign(this, init);
  }
}

export default MovieClubSuggestion;
