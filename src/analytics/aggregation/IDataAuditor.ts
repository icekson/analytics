import * as moment from "moment";
import {AggregationType} from "../Analytics";


export interface IDataAuditor {
    audit(from: moment.Moment, to: moment.Moment, type: AggregationType): Promise<void>;
}