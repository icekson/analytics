import {IPerformable} from "./IPerformable";

export class Worker {

    process(job: IPerformable, data: any, done: Function)
    {
        job.perform(data.data).then((err) => done(err));
    }
}