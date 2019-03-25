import {Container} from 'inversify';
import {AnalyticsEventsDAO} from './dao/AnalyticsEventsDAO';
import {AnalyticsService} from './services/AnalyticsService';
import {RealTimeTracker} from './analytics/RealTimeTracker';
import {AnalyticsAggregateCommand} from './console/commands/AnalyticsAggregateCommand';
import {Console} from './console/Console';
const container = new Container();

// Services
container.bind<AnalyticsService>(AnalyticsService).to(AnalyticsService);

container.bind<AnalyticsEventsDAO>(AnalyticsEventsDAO).to(AnalyticsEventsDAO);

// utils
container.bind<RealTimeTracker>(RealTimeTracker).to(RealTimeTracker).inSingletonScope();

// Console commands
container.bind<Console>(Console).to(Console).inSingletonScope();
export {container};