import {LogEvent} from "./LogEvent";

export interface IAnalyticsTracker {
    trackEvent(eventData: LogEvent);
}