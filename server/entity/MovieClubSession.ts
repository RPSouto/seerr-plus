import { DbAwareColumn } from '@server/utils/DbColumnHelper';
import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import Media from './Media';
import MovieClubCandidate from './MovieClubCandidate';
import MovieClubVote from './MovieClubVote';
import MovieClubCurator from './MovieClubCurator';
import { User } from './User';

export enum MovieClubSessionStatus {
  VOTING = 0,
  SELECTED = 1,
  CLOSED = 2,
  DRAFT = 3,
  SCHEDULED = 4,
}

@Entity()
export class MovieClubSession {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ type: 'int', default: MovieClubSessionStatus.VOTING })
  public status: MovieClubSessionStatus;

  @DbAwareColumn({ type: 'datetime' })
  public closesAt: Date;

  @DbAwareColumn({ type: 'datetime', nullable: true })
  public startsAt?: Date | null;

  @DbAwareColumn({ type: 'datetime', nullable: true })
  public startNotificationSentAt?: Date | null;

  @Column({ type: 'varchar', nullable: true })
  public whatsappUrl?: string | null;

  @Column({ type: 'varchar', nullable: true })
  public title?: string | null;

  @ManyToOne(() => Media, { nullable: true, eager: true, onDelete: 'SET NULL' })
  public selectedMedia?: Media | null;

  @DbAwareColumn({ type: 'datetime', nullable: true })
  public selectedAt?: Date | null;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  public createdBy: User;

  @OneToMany(() => MovieClubCandidate, (candidate) => candidate.session, { cascade: true })
  public candidates: MovieClubCandidate[];

  @OneToMany(() => MovieClubVote, (vote) => vote.session, { cascade: true })
  public votes: MovieClubVote[];

  @OneToMany(() => MovieClubCurator, (curator) => curator.session, {
    cascade: true,
  })
  public curators: MovieClubCurator[];

  @DbAwareColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  public createdAt: Date;

  constructor(init?: Partial<MovieClubSession>) {
    Object.assign(this, init);
  }
}

export default MovieClubSession;
