import * as log4js from 'log4js';
import {injectable} from 'inversify';
import {Transaction} from 'sequelize';

import config from 'config';

@injectable()
export class BaseDAO {
    private logger: log4js.Logger;
    protected transaction: Transaction | null = null;

    constructor() {
        this.logger = log4js.getLogger('BaseDAO');
        this.logger.level = config.get('logging.level');
    }
}