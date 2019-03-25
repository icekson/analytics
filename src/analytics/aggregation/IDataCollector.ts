import * as moment from "moment";
import {IDataStructure} from "./IDataStructure";


export interface IDataCollector {

    collectMinutelyStats(from: moment.Moment, to: moment.Moment): Promise<IDataStructure|null>;

    collectHourlyStats(from: moment.Moment, to: moment.Moment): Promise<IDataStructure|null>;

    collectDailyStats(from: moment.Moment, to: moment.Moment): Promise<IDataStructure|null>;

    collectMonthlyStats(from: moment.Moment, to: moment.Moment): Promise<IDataStructure|null>;


}