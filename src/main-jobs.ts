import 'reflect-metadata';
import {JobsService} from './jobs';

const app = new JobsService().getApp();
export { app };
