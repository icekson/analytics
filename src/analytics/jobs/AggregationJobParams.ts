import {AggregationType} from "../Analytics";

export interface AggregationJobParams {
    type: AggregationType,
    date: string;
    partition: number;
}