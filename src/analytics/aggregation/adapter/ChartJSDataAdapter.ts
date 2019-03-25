import {IDataAdapter} from "./IDataAdapter";
import {AnalyticsData} from "../../../util/AnalyticsStructures";
import {IDataStructure} from "../";
import * as moment from "moment";

export class ChartJSDataAdapter implements IDataAdapter {


    private mapping = {
        visitors: 'visitors',
        sessions: 'sessions',
        configurations: 'configurations',
        avgSessionDuration: 'sessionDuration',
        avgConfigurationsPerSession: 'configurationsPerSession',
        avgConfigurationsPerVisitor: 'configurationsPerSession',
        avgSessionsPerVisitor: 'sessionsPerVisitor',
        savedConfigurations: 'savedConfigurations'
    };

    async convert(data: IDataStructure | null): Promise<any | AnalyticsData> {
        let res: AnalyticsData = {
            main: {
                visitors: {
                    label: 'webpanel.analytics.visitors',
                    data: [],
                    total: 0
                },
                configurations: {
                    label: 'webpanel.analytics.configurations',
                    data: [],
                    total: 0
                },
                sessionDuration: {
                    label: 'webpanel.analytics.session_duration',
                    data: [],
                    total: 0
                },
                configurationsPerSession: {
                    label: 'webpanel.analytics.configurations_per_session',
                    data: [],
                    total: 0
                },
                configurationsPerVisitor: {
                    label: 'webpanel.analytics.configurations_per_visitor',
                    data: [],
                    total: 0
                },
                sessionsPerVisitor: {
                    label: 'webpanel.analytics.sessions_per_visitor',
                    data: [],
                    total: 0
                },
                savedConfigurations: {
                    label: 'webpanel.analytics.saved_configurations',
                    data: [],
                    total: 0
                }
            },
            common: {
                variants: [],
                countries: [],
                browsers: [],
                devices: [],
                os: []
            }
        };
        if (data !== null) {

            data.main.forEach((rec) => {
                let date = moment(rec.date);
                if (rec.partition) {
                    if (rec.type === 'hourly') {
                        date.add(rec.partition, 'hours');
                    } else if (rec.type === 'minutely') {
                        date.add(rec.partition, 'minutes');
                    }
                }
                let formattedDate = date.format('YYYY-MM-DD HH:mm:ss');
                if(rec.type === 'monthly'){
                    formattedDate = date.format('YYYY/MM');
                }
                Object.keys(this.mapping).forEach((key) => {
                    let value = rec[key];
                    if(res.main[this.mapping[key]] !== undefined) {
                        res.main[this.mapping[key]].data.push({
                            date: formattedDate,
                            amount: value
                        });
                    }

                })
            });

            Object.keys(data.totals).forEach((key) => {
                if (res.main[this.mapping[key]] !== undefined) {
                    res.main[this.mapping[key]].total = Number.parseFloat(data.totals[key]);
                }
            });


            let browsers: any[] = [],
                devices: any[] = [],
                countries: any[] = [],
                variants: any[] = [],
                os: any[] = [];

            let totalBrowsers = 0,
                totalDevices = 0,
                totalCountries = 0,
                totalVariants = 0,
                totalOs = 0;

            data.common.forEach((rec) => {
                let d = {name: rec.metricValue, amount: rec.amount, category: rec.category};
                switch (rec.metricName) {
                    case 'variant':
                        totalVariants += rec.amount;
                        variants.push(d);
                        break;
                    case 'browser':
                        totalBrowsers += rec.amount;
                        browsers.push(d);
                        break;
                    case 'device':
                        totalDevices += rec.amount;
                        devices.push(d);
                        break;
                    case 'country':
                        totalCountries += rec.amount;
                        countries.push(d);
                        break;
                    case 'os':
                        totalOs += rec.amount;
                        os.push(d);
                        break;
                }
            });
            res.common.variants = variants
                .sort((a, b) => b.amount - a.amount)
                .map((v) => ({
                    name: v.name as string,
                    category: v.category as string,
                    amount: ((v.amount * 100) / totalVariants).toFixed(2)
                }));

            res.common.browsers = browsers
                .sort((a, b) => b.amount - a.amount)
                .map((v) => ({
                    name: v.name as string,
                    category: v.category as string,
                    amount: ((v.amount * 100) / totalBrowsers).toFixed(2)
                }));
            res.common.devices = devices
                .sort((a, b) => b.amount - a.amount)
                .map((v) => ({
                    name: v.name as string,
                    category: v.category as string,
                    amount: ((v.amount * 100) / totalDevices).toFixed(2)
                }));

            res.common.countries = countries
                .sort((a, b) => b.amount - a.amount)
                .map((v) => ({
                    name: v.name as string,
                    category: v.category as string,
                    amount: ((v.amount * 100) / totalCountries).toFixed(2)
                }));

            res.common.os = os
                .sort((a, b) => b.amount - a.amount)
                .map((v) => ({
                    name: v.name as string,
                    category: v.category as string,
                    amount: ((v.amount * 100) / totalOs).toFixed(2)
                }));

        }
        return res;
    }
}