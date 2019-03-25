import {IDataStructure} from "./IDataStructure";



export interface IRealTimeDataCollector {

    collectRealTimeStats(): IDataStructure|null;

}