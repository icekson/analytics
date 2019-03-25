import {LogEvent} from './LogEvent';
import {WrongInput} from '../util/errors';
import {IAnalyticsTracker} from './IAnalyticsTracker';
import {AnalyticsEventsDAO} from '../dao/AnalyticsEventsDAO';

export class DBTracker implements IAnalyticsTracker {

    constructor(private analyticsEventsDAO: AnalyticsEventsDAO) {
    }

    /**
     * Track event
     * @param eventData
     * @throws WrongInput
     */
    trackEvent(eventData: LogEvent) {
        let requiredFields = ['event', 'time', 'ip', 'country', 'visitorId', 'sessionId', 'device', 'browser'];
        try {
            requiredFields.forEach((key) => {
                if (Object.keys(eventData).indexOf(key) === -1) {
                    throw new WrongInput(`Invalid event data is given: '${key}' field is required`);
                }
            });

            if(eventData.hash){
                delete eventData.hash;
            }

            this.analyticsEventsDAO.logEvent(eventData);
        } catch (e) {
            console.error(e);
        }
    }

}