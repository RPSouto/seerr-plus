import type { MediaRequest } from '@server/entity/MediaRequest';
import type { User } from '@server/entity/User';
import { EventEmitter } from 'events';

export type RequestInterestAddedEvent = {
  request: MediaRequest;
  user: User;
};

class SeerrPlusEvents extends EventEmitter {
  public emitInterestAdded(event: RequestInterestAddedEvent): void {
    this.emit('request.interest.added', event);
  }

  public onInterestAdded(
    listener: (event: RequestInterestAddedEvent) => void | Promise<void>
  ): void {
    this.on('request.interest.added', listener);
  }
}

export const seerrPlusEvents = new SeerrPlusEvents();
