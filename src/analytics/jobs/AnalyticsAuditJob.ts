import * as log4js from 'log4js';
import config from 'config';
import {AggregationType, IPerformable} from '../Analytics';
import {AnalyticsAuditor} from '../AnalyticsAuditor';
import * as moment from 'moment';

export class AnalyticsAuditJob implements IPerformable {
    private logger: log4js.Logger;

    public static readonly NAME = 'AnalyticsAuditJob';

    constructor(private auditor: AnalyticsAuditor) {
        this.logger = log4js.getLogger('AnalyticsAuditJob');
        this.logger.level = config.get('logging.level');
    }

    perform(params: any): Promise<any> {
        return new Promise((resolve) => {
            try {
                let from = moment(params.from);
                let to = moment(params.to);
                let type = <AggregationType>params.type;
                this.auditor.audit(from, to, type).then(() => resolve());
            } catch (e) {
                this.logger.error('perform error: ', e);
                resolve(e);
            }
        });
    }

}