import {Analytics} from "../Analytics";

export interface IAnalyticsHandler {
    handle(analytics: Analytics);
}