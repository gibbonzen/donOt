import { ScrumElement } from "../model/ScrumElement";
import { FileConsumer, FileConsumerEvent, DataFile, FileMetaData } from "../../watcher/FileConsumer";
import { FileWatcher } from "../../watcher/FileWatcher";
import { EventEmitter } from "events";
import { ScrumElementEvent } from "./ScrumElementEvent.enum";
import { FileUtils } from "../../utils/FileUtils";
import { LOG, Color } from "../../utils/LOG";
import { AppConfig } from "../../utils/Config";

export class BacklogManager {
  private emitter = new EventEmitter()
  private scrumElements: ScrumElement[] = []
  private dataFiles: Map<string, string> = new Map() // id => filepath

  constructor() { 
    let backlogConsumer = new FileConsumer()
    this.subscribe(backlogConsumer)

    let watcher = new FileWatcher(AppConfig.getRepo('backlog'), 0)
    watcher.subscribe(backlogConsumer)
    watcher.start()
  }

  public get(el: number) {
    return this.scrumElements[el]
  }

  public getAll() {
    return this.scrumElements
  }

  private subscribe(provider: FileConsumer) {
    /////////////////////////////
    // Event from file watcher //
    /////////////////////////////

    // On new file :
    // 0. Check if ScrumElement's ID exists
    // 1. Store the ScrumElement's ID and origin file path
    // 2. Store the ScrumElement
    // 3. Notify observers
    provider.on(FileConsumerEvent.ADD, (dataFile: DataFile<ScrumElement>) => {
      this.dataFiles.set(dataFile.data.id, dataFile.file.path)

      if(!this.exists(dataFile.data.id)) {
        this.addElement(dataFile.data)
      }

    })

    // On update file :
    // 1. Check if file data are not the same as stored data 
    // 2. If not : update stored data and notify observers
    provider.on(FileConsumerEvent.UPDATE, (dataFile: DataFile<ScrumElement>) => this.updateElement(dataFile.data))

    // On delete :
    // 1. Delete stored data
    // 2. Notify observers
    provider.on(FileConsumerEvent.REMOVE, (dataFile: DataFile<ScrumElement>) => this.fileRemoved(dataFile.file.path))
  }

  public on(event: ScrumElementEvent, next: (...els: ScrumElement[]) => void) {
    this.emitter.addListener(event, next)
  }

  public addElement(el: ScrumElement) {
    LOG.log(Color.FG_GREEN, `Scrum element added: ${el.name}`)
    this.scrumElements.push(el)
    this.emit(ScrumElementEvent.ADD, el)
  }
  
  public updateElement(el: ScrumElement) {
    LOG.log(Color.FG_GREEN, `Scrum element updated: ${el.name}`)
    if(!this.equals(el)) {
      let current = this.getByID(el.id)
      for(let k in el) {
        current[k] = el[k]
      }

      this.updateFile(el)
      this.emit(ScrumElementEvent.UPDATE, el)
    }
  }
  
  public removeElement(el: ScrumElement) {
    LOG.log(Color.FG_GREEN, `Scrum element removed: ${el.name}`)
    this.scrumElements.splice(this.indexOf(el))
    
    this.emit(ScrumElementEvent.REMOVE, el)
  }

  public indexOf(el: ScrumElement) {
    return this.scrumElements.indexOf(el)
  }

  public getByID(id: string) {
    return this.scrumElements.find(e => e.id === id)
  }

  private emit(event: ScrumElementEvent, el: ScrumElement) {
    this.emitter.emit(event, el)
  }

  private updateFile(el: ScrumElement) {
    if(this.dataFiles.has(el.id)) {
      let pathfile = this.dataFiles.get(el.id)
      FileUtils.write<ScrumElement>(pathfile, el)
    }
  }
  
  private removeFile(scrumElementID: string) {
    if(this.dataFiles.has(scrumElementID)) {
      FileUtils.remove(this.dataFiles.get(scrumElementID))
      this.dataFiles.delete(scrumElementID)
    }
  }

  private fileRemoved(filepath: string) {
    let scrumElementID
    for(let [id, path] of this.dataFiles.entries()) {
      if(path === filepath) scrumElementID = id
    }

    if(scrumElementID) {
      this.dataFiles.delete(scrumElementID)
      this.removeElement(this.getByID(scrumElementID))
    }
  }

  private exists(id: string) {

    return false
  }

  private equals(newElement: ScrumElement): boolean {
    let oldElement = this.getByID(newElement.id)
    if(oldElement === undefined) return false
    if(Object.keys(oldElement).length != Object.keys(newElement).length) return false;
    for(let key in newElement) {
      console.log(key, JSON.stringify(oldElement[key]) == JSON.stringify(newElement[key]))
        if(JSON.stringify(oldElement[key]) != JSON.stringify(newElement[key]))
          return false
    }

    return true
  }

}