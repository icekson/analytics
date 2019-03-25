import {IAnalyticsHandler} from './IAnalyticsHandler';
import {Server, Socket} from 'socket.io';
import * as log4js from 'log4js';
import config from 'config';
import {WsActions} from '../io/WsActions';
import {WsEvents} from '../io/WsEvents';
import {Analytics} from '../Analytics';
import * as geoip from 'geoip-lite';
import * as useragent from 'useragent';
import * as uuid from 'uuid/v4';
import * as moment from 'moment';
import * as crypto from 'crypto';

export class SocketIOHandler implements IAnalyticsHandler {

    private logger: log4js.Logger;
    private usersData: Map<string, {ip: string, country: string, connectedAt: number, userAgent: any, visitorId: string}>;

    constructor(private io: Server) {
        this.logger = log4js.getLogger('SocketIOHandler');
        this.logger.level = config.get('logging.level');
        this.usersData = new Map();
    }

    public handle(analytics: Analytics) {

        this.io.on('connect', async (socket: Socket) => {
            this.logger.debug('headers: ', socket.handshake.headers);
            let ip = socket.handshake.headers['x-real-ip'] || socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
            let geo = geoip.lookup(ip);
            let country = geo ? geo.country : 'NA';
            let visitorId = socket.handshake.query.vid || uuid();
            this.usersData.set(socket.id, {
                ip: ip,
                country: country,
                connectedAt: (moment().toDate()).getTime()/1000,
                userAgent: useragent.lookup(socket.handshake.headers['user-agent']),
                visitorId: visitorId
            });
            let data = this.createEvent({
                event: 'session_started',
                type: 'session_started',
                data: (moment().toDate()).getTime()/1000
            }, socket);
            analytics.trackEvent(data);
            socket.emit(WsEvents.Initialized, {
                visitorId
            });
            this.logger.debug('socket.io connected client %s', socket.id, this.usersData.get(socket.id));
            socket.on('disconnect', () => {
                let sessionDuration = 0;
                if (this.usersData.has(socket.id)) {
                    sessionDuration = ((moment().toDate()).getTime()/1000 - this.usersData.get(socket.id)!.connectedAt);
                }
                let userData = this.usersData.get(socket.id);
                if(userData) {
                    const data = this.createEvent({
                        event: 'session_duration',
                        type: 'session_duration',
                        data: sessionDuration
                    }, socket);
                    analytics.trackEvent(data);
                }
                this.usersData.delete(socket.id);
                this.logger.info('socket.io client disconnected %s, duration %s', socket.id, sessionDuration);

            });

            // track event
            socket.on(WsActions.TrackEvent, (data) => {
                data = this.createEvent(data, socket);
                analytics.trackEvent(data);
                this.logger.info('socket.io track-event ', data);
            });

            // get data
            socket.on(WsActions.GetData, async (req) => {
                this.logger.info('socket.io get-data %s', socket.id, req);
                // let type = AggregationType.Daily;
                // switch (req.type) {
                //     case 'daily':
                //         type = AggregationType.Daily;
                //         break;
                //     case 'hourly':
                //         type = AggregationType.Hourly;
                //         break;
                //     case 'realtime':
                //         type = AggregationType.RealTime;
                //         break;
                //     case 'monthly':
                //         type = AggregationType.Monthly;
                //         break;
                //     case 'weekly':
                //         type = AggregationType.Weekly;
                //         break;
                // }
                // socket.emit(WsEvents.Data, await Analytics.aggregateData(req.filters, type));
            });

        });
    }

    /**
     * Create all the fields for eventData
     * @param data
     * @returns {any}
     */
    private createEvent(data, socket: Socket) {
        const userData = this.usersData.get(socket.id);
        const sha256 = crypto.createHash('sha256');
        sha256.update(JSON.stringify(data));
        const hash = sha256.digest('hex').toString();
        if(userData) {
            data.ip = userData.ip;
            data.country = userData.country;
            data.time = Number.parseInt(moment().format('X'));
            data.browser = userData.userAgent.family;
            data.device = userData.userAgent.device.toString();
            data.os = userData.userAgent.os.toString();
            data.sessionId = socket.id;
            data.visitorId = userData.visitorId;
            data.data = JSON.stringify(data.data);
            data.hash = hash;
        }
        return data;
    }

}