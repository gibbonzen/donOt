import { Injectable } from '@angular/core';
import { SocketService } from '../socket/socket.service';
import { SocketEvent } from 'src/app/models/socket/SocketEvent.model';
import { SocketObject, SocketObjectFactory } from 'src/app/models/socket/SocketObject.model';
import { ScrumElement } from 'src/app/models/scrum/ScrumElement';
import { EventEmitter } from 'events';

@Injectable({
  providedIn: 'root'
})
export class ScrumElementService {
  private emitter = new EventEmitter()

  constructor(private socket: SocketService) {
    this.socket.onEvent(SocketEvent.SCRUM_ELEMENT_ADDED, (socketObj: SocketObject<ScrumElement[]>) =>
      this.onEvent(SocketEvent.SCRUM_ELEMENT_ADDED, socketObj)
    )
  }

  /**
   * Add a listener to a specific socket event
   * @param event
   * @param next callback method called when event is raised
   */
  public on(event: SocketEvent, next: (els: ScrumElement[]) => void) {
    this.emitter.addListener(event, next)
  }

  /**
   * Fire the socket event to notify all observers
   * @param event
   * @param socketObj
   */
  private onEvent(event: SocketEvent, socketObj: SocketObject<ScrumElement[]>) {
    this.emitter.emit(event, socketObj.object)
  }

  public emit(event: SocketEvent, element: ScrumElement) {
    console.log("Send now socket event:", event)
    this.socket.send(event, SocketObjectFactory.create(element))
  }

}
