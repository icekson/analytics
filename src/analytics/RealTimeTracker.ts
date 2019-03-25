import {LogEvent} from './LogEvent';
import {WrongInput} from '../util/errors';
import {IAnalyticsTracker} from './IAnalyticsTracker';
import {injectable} from 'inversify';
import {IRealTimeDataCollector, IDataStructure} from './aggregation';
import * as moment from 'moment';

@injectable()
export class RealTimeTracker implements IAnalyticsTracker, IRealTimeDataCollector {

    private static readonly COUNT_RECORDS = 60;

    private data: any | {[visitorId: string]: {
        sessionId: string,
        visitorId: string,
        configurations: number,
        sessionDuration: number,
        country: string,
        ip: string,
        device: string,
        browser: string,
        variants: any[],
        time?: any
        saved: number,
        handledEvents: string[]
    }};

    private results: Array<{
        date: Date,
        main: {
            date: Date,
            type: string,
            partition?: string,
            visitors: number,
            sessions: number,
            configurations: number,
            avgSessionDuration: number,
            avgConfigurationsPerSession: number,
            avgConfigurationsPerVisitor: number,
            savedConfigurations: number
        },
        common: Array<{
            date: Date,
            partition?: string,
            metricName: string,
            metricValue: string;
            category: string,
            amount: number
        }>
    }>;

    constructor() {
        this.data = {};
        this.results = [];
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

            if(this.data[eventData.visitorId] === undefined){
                this.data[eventData.visitorId] = {...eventData, configurations: 0, sessionDuration: 0, saved: 0, variants: []};
            }else{

                if(!this.data[eventData.visitorId].handledEvents){
                    this.data[eventData.visitorId].handledEvents = [];
                }

                if(this.data[eventData.visitorId].handledEvents.find((hash) => eventData.hash === hash)){
                    return;
                }
                this.data[eventData.visitorId].handledEvents.push(eventData.hash);
                if(eventData.event === 'session_duration'){
                    delete this.data[eventData.visitorId];
                    return;
                }

                if(eventData.event === 'save_configuration'){
                    this.data[eventData.visitorId].saved++;
                }

                if(eventData.type === 'pick_variant'){
                    let eventParts  = eventData.event.split(':');
                    this.data[eventData.visitorId].configurations++;
                    this.data[eventData.visitorId].variants.push({
                        id: eventParts[3],
                        subcategory: eventParts[1] + ':' +eventParts[2]

                    });
                }

                this.data[eventData.visitorId].sessionDuration = Number.parseInt(moment().format('X')) - this.data[eventData.visitorId].time;
            }

        } catch (e) {
            console.error(e);
        }
    }


    collectRealTimeStats(): IDataStructure | any{
        let metrics: any[] = [];
        let allVariants: any = [];
        Object.keys(this.data).map((visitorId) =>{
            return this.data[visitorId].variants;
        }).forEach((d) => {
            d.forEach((v) => {
                allVariants.push(v);
            });
        });
        allVariants.map((v) => {
            return {metricName: 'variant', metricValue: v.id, amount: 1, category: v.subcategory};
        }).forEach((v) => {
            let found = metrics.find((vv) => vv.metricValue === v.metricValue);
            if(found){
                metrics[metrics.indexOf(found)].amount++;
            }else{
                metrics.push(v);
            }
        });

        ['browser', 'country', 'device', 'os'].forEach((metricName) =>{
            Object.keys(this.data).map((key) => {
                let v = this.data[key];
                return {metricName: metricName, metricValue: v[metricName], amount: 1, category: null};
            }).forEach((v) => {
                let found = metrics.find((vv) => vv.metricValue === v.metricValue);
                if(found){
                    metrics[metrics.indexOf(found)].amount++;
                }else{
                    metrics.push(v);
                }
            });
        });


        let res = {
            date: new Date(),
            main: {
                date: new Date(),
                type: 'real_time',
                visitors: Object.keys(this.data).length,
                sessions: Object.keys(this.data).length,
                configurations: Object.keys(this.data).length > 0 ? Object.keys(this.data).map((visitorId: string) => {
                    let visitorData = this.data[visitorId];
                    return visitorData.configurations;
                }).reduce((res, val) => res += val) : 0,
                avgSessionDuration: Object.keys(this.data).length > 0 ? Object.keys(this.data).map((visitorId: string) => {
                    let visitorData = this.data[visitorId];
                    return visitorData.sessionDuration;
                }).reduce((res, val) => res += val)/Object.keys(this.data).length : 0,
                avgConfigurationsPerSession: Object.keys(this.data).length > 0 ? Object.keys(this.data).map((visitorId: string) => {
                    let visitorData = this.data[visitorId];
                    return visitorData.configurations;
                }).reduce((res, val) => res += val)/Object.keys(this.data).length: 0,
                avgConfigurationsPerVisitor:  Object.keys(this.data).length > 0 ? Object.keys(this.data).map((visitorId: string) => {
                    let visitorData = this.data[visitorId];
                    return visitorData.configurations;
                }).reduce((res, val) => res += val)/Object.keys(this.data).length: 0,
                savedConfigurations: Object.keys(this.data).length > 0 ? Object.keys(this.data).map((visitorId: string) => {
                    let visitorData = this.data[visitorId];
                    return visitorData.saved;
                }).reduce((res, val) => res += val) : 0
            },
            common: metrics
        };

        this.results.push(res);
        if(this.results.length > RealTimeTracker.COUNT_RECORDS){
            this.results.shift();
        }
        return {
            main: this.results.map((d) => d.main),
            common: res.common,
            totals: res.main
        };

    }
}